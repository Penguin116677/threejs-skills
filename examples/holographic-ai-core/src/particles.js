// All particles in a single Points draw call. Positions are evaluated entirely
// in the vertex shader from static, seeded attributes + the loop phase, so the
// CPU does no per-particle work and every frame is reproducible.
//
// Types: 0 = path-bound motes (ride the orbital paths)
//        1 = free orbiters around the core
//        2 = inner sparks inside the glass
//        3 = ambient dust (wide volume, depth-of-field softened)
import { holoMaterial } from './shaders/common.js';
import { ORBIT_LAYOUT } from './timeline.js';

const VS = /* glsl */ `
  attribute vec3 aA;
  attribute vec3 aB;
  attribute vec4 aP1;   // radius, theta0 (turns), turns per loop, type
  attribute vec4 aP2;   // size (world), bob amplitude, bob phase, story delay
  attribute vec3 aCol;
  attribute vec3 aSpawn;
  uniform float uPxScale;  // pixels per world unit at distance 1
  uniform float uMinPx;
  uniform float uMaxPx;
  uniform float uFocus;
  uniform float uDrift;
  uniform float uDustBuild;
  uniform float uSpeed;
  varying vec3 vCol;
  varying float vAlpha;
  varying float vSoft;
  varying vec3 vWorldPos;
  varying float vType;
  void main() {
    float type = aP1.w;
    vec3 pos;
    float alpha = 1.0;
    float boost = 1.0;
    if (type < 2.5) {
      float th = TAU * (aP1.y + aP1.z * uSpeed * uPhase);
      float r = aP1.x;
      float pr = pulseAt(r);
      r *= 1.0 + 0.075 * pr;
      boost = 1.0 + 3.5 * pr;
      vec3 n = normalize(cross(aA, aB));
      pos = (aA * cos(th) + aB * sin(th)) * r
          + n * aP2.y * uDrift * sin(TAU * uPhase * 2.0 + aP2.z);
      float prog = clamp((uStoryTime - aP2.w) / 2.4, 0.0, 1.0);
      float e = prog * prog * (3.0 - 2.0 * prog);
      pos = mix(aSpawn, pos, e);
      alpha = smoothstep(0.0, 0.45, prog);
    } else {
      vec3 drift = vec3(sin(TAU * uPhase + aP2.z), sin(TAU * uPhase + aP2.z * 1.7 + 1.0), sin(TAU * uPhase + aP2.z * 2.3 + 2.0));
      pos = aA + aB * drift * uDrift;
      alpha = uDustBuild;
    }
    // gentle, periodic brightness breathing (2 cycles per loop, never a flicker)
    alpha *= 0.75 + 0.25 * sin(TAU * uPhase * 2.0 + aP2.z * 3.0);

    vec4 mv = viewMatrix * vec4(pos, 1.0);
    float depth = -mv.z;
    float px = aP2.x * uPxScale / depth;
    // depth-of-field softening for dust away from the focal plane
    float coc = type > 2.5 ? abs(depth - uFocus) * 0.0035 * uPxScale / depth : 0.0;
    float target = clamp(max(px + coc, uMinPx), 0.0, uMaxPx);
    // conserve energy when the sprite is enlarged (anti-flicker for sub-pixel points)
    alpha *= min(1.0, (max(px, 0.05) * max(px, 0.05)) / (target * target) * (type > 2.5 ? 1.5 : 1.0));
    vSoft = type > 2.5 ? clamp(coc / max(target, 1.0), 0.0, 1.0) : 0.0;
    gl_PointSize = target;
    gl_Position = projectionMatrix * mv;
    vCol = aCol * boost;
    vAlpha = alpha;
    vWorldPos = pos;
    vType = type;
  }`;

const FS = /* glsl */ `
  varying vec3 vCol;
  varying float vAlpha;
  varying float vSoft;
  varying vec3 vWorldPos;
  varying float vType;
  void main() {
    vec2 c = gl_PointCoord * 2.0 - 1.0;
    float r2 = dot(c, c);
    if (r2 > 1.0) discard;
    float sharp = exp(-r2 * 5.0) + 0.6 * exp(-r2 * 26.0);
    float disc = (1.0 - smoothstep(0.55, 1.0, sqrt(r2))) * 0.55;
    float shape = mix(sharp, disc, vSoft) * (1.0 - smoothstep(0.85, 1.0, r2));
    vec3 col = vCol * shape * vAlpha * uLight;
    if (vType > 1.5 && vType < 2.5) {
      // inside the glass: no transmission loss
    } else {
      col *= glassTransmit(vWorldPos);
    }
    gl_FragColor = vec4(col, 1.0);
  }`;

export function createParticles(THREE, shared, cfg, rng) {
  const k = cfg.particleCount;
  const counts = {
    path: Math.round(900 * k),
    free: Math.round(1100 * k),
    inner: Math.round(320 * k),
    dust: Math.round(900 * k),
  };
  const total = counts.path + counts.free + counts.inner + counts.dust;
  const A = new Float32Array(total * 3);
  const B = new Float32Array(total * 3);
  const P1 = new Float32Array(total * 4);
  const P2 = new Float32Array(total * 4);
  const COL = new Float32Array(total * 3);
  const SPAWN = new Float32Array(total * 3);

  const cyan = shared.uCyan.value;
  const ice = shared.uIce.value;
  const violet = shared.uViolet.value;
  const silver = shared.uSilver.value;
  const tmp = new THREE.Color();
  const pickColor = (bias = 0) => {
    const x = rng.next();
    if (x < 0.06 + bias) tmp.copy(violet);
    else if (x < 0.5) tmp.copy(cyan);
    else if (x < 0.88) tmp.copy(ice);
    else tmp.copy(silver);
    return tmp;
  };

  const deg = Math.PI / 180;
  const orbitBases = ORBIT_LAYOUT.map((o) => {
    const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(o.tilt[0] * deg, o.tilt[1] * deg, o.tilt[2] * deg));
    return { o, a: new THREE.Vector3(1, 0, 0).applyMatrix4(m), b: new THREE.Vector3(0, 1, 0).applyMatrix4(m) };
  });
  // A dominant orbital plane makes the free orbiters read as a coherent field.
  const mainA = new THREE.Vector3(1, 0.08, 0).normalize();
  const mainB = new THREE.Vector3(0, 0.25, 1).normalize();

  let i = 0;
  const v = new THREE.Vector3();
  const w = new THREE.Vector3();
  const setSpawn = (idx, r, a, b, th, out = 2.6, jitter = 1) => {
    // Spawn further out along the particle's own orbit direction, offset a little.
    v.copy(a).multiplyScalar(Math.cos(th * 2 * Math.PI)).addScaledVector(b, Math.sin(th * 2 * Math.PI)).multiplyScalar(r * out);
    v.x += rng.range(-1.2, 1.2) * jitter;
    v.y += rng.range(-1.2, 1.2) * jitter;
    v.z += rng.range(-1.0, 1.0) * jitter;
    SPAWN.set([v.x, v.y, v.z], idx * 3);
  };
  const write = (a, b, p1, p2, col) => {
    A.set([a.x, a.y, a.z], i * 3);
    B.set([b.x, b.y, b.z], i * 3);
    P1.set(p1, i * 4);
    P2.set(p2, i * 4);
    COL.set([col.r, col.g, col.b], i * 3);
  };

  // --- path-bound motes: concentrated behind each orbit's comet head
  for (let n = 0; n < counts.path; n++, i++) {
    const ob = orbitBases[n % orbitBases.length];
    const trail = rng.next() < 0.7 ? Math.min(0.6, -Math.log(1 - rng.next() * 0.98) * 0.09) : rng.next();
    const theta0 = ob.o.phase - trail * Math.sign(ob.o.turns);
    const r = ob.o.r + rng.gaussian() * 0.012;
    const col = pickColor().multiplyScalar(1.6 + 1.4 * Math.exp(-trail * 8));
    // the first handful of motes appear alone in the dark (Scene 1)
    const pioneer = n < 18;
    // pioneers are already emerging on frame 0, so the opening has motion from the first frame
    const delay = pioneer ? -0.5 + n * 0.08 : 0.9 + 3.2 * rng.next() + (n % orbitBases.length) * 0.25;
    if (pioneer) col.copy(cyan).lerp(ice, 0.3).multiplyScalar(5.0);
    const size = pioneer ? 0.032 : rng.range(0.009, 0.019);
    write(ob.a, ob.b, [r, theta0, ob.o.turns, 0], [size, rng.range(0, 0.02), rng.range(0, 6.28), delay], col);
    // pioneers start inside the frame so the opening beat is legible
    if (pioneer) setSpawn(i, r, ob.a, ob.b, theta0, 1.35 + 0.4 * rng.next(), 0.35);
    else setSpawn(i, r, ob.a, ob.b, theta0, 2.0 + rng.next());
  }
  // --- free orbiters
  for (let n = 0; n < counts.free; n++, i++) {
    // perturb the dominant plane
    const tiltAx = rng.unitVector();
    const ang = rng.gaussian() * 0.35;
    const q = new THREE.Quaternion().setFromAxisAngle(v.set(...tiltAx), ang);
    const a = mainA.clone().applyQuaternion(q);
    const b = mainB.clone().applyQuaternion(q);
    const r = 1.12 + Math.pow(rng.next(), 1.6) * 1.08;
    const turns = (rng.next() < 0.85 ? 1 : -1) * (r < 1.6 ? 2 : 1);
    const theta0 = rng.next();
    write(a, b, [r, theta0, turns, 1], [rng.range(0.007, 0.016), rng.range(0.02, 0.09), rng.range(0, 6.28), 1.4 + 4.6 * rng.next()], pickColor(0.05).multiplyScalar(1.3));
    setSpawn(i, r, a, b, theta0, 2.2 + rng.next() * 1.2);
  }
  // --- inner sparks swirling around the nucleus inside the glass
  for (let n = 0; n < counts.inner; n++, i++) {
    const nrm = v.set(...rng.unitVector());
    const a = w.set(...rng.unitVector()).cross(nrm).normalize().clone();
    const b = nrm.clone().cross(a).normalize();
    const r = rng.range(0.5, 0.9);
    const turns = rng.sign() * rng.int(2, 3);
    const theta0 = rng.next();
    write(a, b, [r, theta0, turns, 2], [rng.range(0.006, 0.011), rng.range(0.0, 0.04), rng.range(0, 6.28), 3.8 + 2.4 * rng.next()], pickColor().multiplyScalar(1.4));
    SPAWN.set([0, 0, 0], i * 3); // sparks are born from the centre
  }
  // --- ambient dust
  for (let n = 0; n < counts.dust; n++, i++) {
    const base = new THREE.Vector3(rng.range(-9, 9), rng.range(-5, 5), rng.range(-9, 4.5));
    if (base.length() < 2.6) base.setLength(2.6 + rng.next());
    const amp = new THREE.Vector3(rng.range(0.05, 0.22), rng.range(0.05, 0.18), rng.range(0.05, 0.22));
    write(base, amp, [0, 0, 0, 3], [rng.range(0.006, 0.016), 0, rng.range(0, 6.28), 0], pickColor(0.06).multiplyScalar(0.3));
    SPAWN.set([base.x, base.y, base.z], i * 3);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(total * 3), 3));
  geo.setAttribute('aA', new THREE.BufferAttribute(A, 3));
  geo.setAttribute('aB', new THREE.BufferAttribute(B, 3));
  geo.setAttribute('aP1', new THREE.BufferAttribute(P1, 4));
  geo.setAttribute('aP2', new THREE.BufferAttribute(P2, 4));
  geo.setAttribute('aCol', new THREE.BufferAttribute(COL, 3));
  geo.setAttribute('aSpawn', new THREE.BufferAttribute(SPAWN, 3));

  const uniforms = {
    uPxScale: { value: 1000 },
    uMinPx: { value: 1.5 },
    uMaxPx: { value: 40 },
    uFocus: { value: 10 },
    uDrift: { value: cfg.particleDrift },
    uDustBuild: { value: 1 },
    uSpeed: { value: cfg.particleSpeed },
  };
  const points = new THREE.Points(geo, holoMaterial(THREE, shared, { uniforms, vertexShader: VS, fragmentShader: FS }));
  points.frustumCulled = false;

  return {
    points,
    counts: { ...counts, total },
    uniforms,
    update(state, { height, fov, focus }) {
      uniforms.uPxScale.value = height / (2 * Math.tan((fov * Math.PI) / 360));
      uniforms.uMinPx.value = 1.3 * Math.max(1, height / 1080);
      uniforms.uMaxPx.value = 34 * (height / 1080);
      uniforms.uFocus.value = focus;
      uniforms.uDustBuild.value = state.build.dust;
    },
  };
}
