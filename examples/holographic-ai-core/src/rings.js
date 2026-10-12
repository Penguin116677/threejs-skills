// Independently animated glass rings. Each ring is a lathe of a superellipse
// cross-section (a softly rounded rectangle), giving crisp metallic rims and a
// glassy band. Normals are analytic, so the rims shade cleanly at any size.
import { holoMaterial } from './shaders/common.js';
import { RING_LAYOUT } from './timeline.js';

const RING_VS = /* glsl */ `
  attribute float aAngle;
  attribute vec2 aProf;
  uniform float uScale;
  varying vec3 vWorldPos;
  varying vec3 vNormalW;
  varying float vAngle;
  varying vec2 vProf;
  void main() {
    vAngle = aAngle;
    vProf = aProf;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;

const RING_FS = /* glsl */ `
  uniform float uRadius;
  uniform float uScale;
  uniform float uTicks;
  uniform float uSweep;
  uniform float uOpacity;
  uniform float uSeed;
  uniform float uComet;
  uniform float uDir;
  varying vec3 vWorldPos;
  varying vec3 vNormalW;
  varying float vAngle;
  varying vec2 vProf;
  void main() {
    vec3 N = normalize(vNormalW);
    vec3 V = normalize(cameraPosition - vWorldPos);
    float ndv = abs(dot(N, V));
    float fres = pow(1.0 - ndv, 2.5);
    vec3 R = reflect(-V, N);
    if (dot(N, V) < 0.0) R = reflect(-V, -N);

    // Glass band with drifting iridescence.
    float thick = 0.6 + 0.3 * sin(TAU * (vAngle * 3.0 + uPhase) + uSeed * 6.283);
    vec3 col = thinFilm(ndv, thick) * fres * 0.6;
    col += envReflect(R) * (0.04 + 0.96 * fres) * 0.45;
    col += uIce * 0.006;

    // Fine metallic rims along both band edges.
    float rim = smoothstep(0.72, 0.97, abs(vProf.y));
    col += (envReflect(R) * 0.7 + uSilver * 0.035 + mix(uCyan, uViolet, 0.5 + 0.5 * sin(TAU * (vAngle + uPhase) + uSeed * 9.0)) * 0.07) * rim;

    // Etched tick marks on the outer face (major every 6th).
    if (uTicks > 0.0) {
      float a = vAngle * uTicks;
      float fw = fwidth(a);
      float d = abs(fract(a + 0.5) - 0.5);
      float tick = 1.0 - smoothstep(0.06, 0.06 + fw * 1.5, d);
      float major = 1.0 - step(0.5, mod(floor(a + 0.5), 6.0));
      float len = mix(0.35, 0.62, major);
      tick *= 1.0 - smoothstep(len - 0.08, len, abs(vProf.y));
      tick *= smoothstep(0.2, 0.6, vProf.x);
      tick *= 1.0 - smoothstep(0.25, 0.5, fw); // fade when too dense to resolve
      col += uCyan * tick * 0.45;
    }

    // Energy comet travelling around the ring (integer turns per loop).
    float behind = fract((uComet - vAngle) * uDir);
    float comet = exp(-behind * 14.0) * smoothstep(0.0, 0.004, behind);
    col += mix(uIce, uSilver, 0.4) * comet * 0.45 * (0.4 + 0.6 * abs(vProf.y));

    // Pulse brightens the ring as the wavefront passes its radius.
    float pr = pulseAt(uRadius * uScale);
    col = col * (1.0 + 1.2 * pr) + uCyan * pr * 0.12;

    // Angular draw-on with a glowing leading edge.
    float vis = 1.0 - smoothstep(uSweep - 0.012, uSweep, vAngle);
    float tip = exp(-pow((vAngle - uSweep) / 0.006, 2.0)) * (1.0 - step(0.999, uSweep)) * step(0.001, uSweep);
    col = col * vis + uSilver * tip * 1.6;

    col *= uOpacity * uLight * glassTransmit(vWorldPos);
    gl_FragColor = vec4(col, 1.0);
  }`;

function ringGeometry(THREE, R, w, th, segments = 512, profileSegments = 40, n = 6) {
  const pos = [];
  const nrm = [];
  const ang = [];
  const prof = [];
  const idx = [];
  const a = th / 2;
  const b = w / 2;
  const P = [];
  for (let k = 0; k <= profileSegments; k++) {
    const q = (k / profileSegments) * Math.PI * 2;
    const c = Math.cos(q);
    const s = Math.sin(q);
    const px = Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
    const py = Math.sign(s) * Math.pow(Math.abs(s), 2 / n);
    // gradient of |x/a|^n + |y/b|^n
    let gx = (Math.sign(px) * Math.pow(Math.abs(px), n - 1)) / a;
    let gy = (Math.sign(py) * Math.pow(Math.abs(py), n - 1)) / b;
    const gl = Math.hypot(gx, gy) || 1;
    P.push({ x: px * a, y: py * b, nx: gx / gl, ny: gy / gl, ux: px, uy: py });
  }
  for (let j = 0; j <= segments; j++) {
    const t = j / segments;
    const phi = t * Math.PI * 2;
    const cp = Math.cos(phi);
    const sp = Math.sin(phi);
    for (const p of P) {
      const r = R + p.x;
      pos.push(r * cp, p.y, r * sp);
      nrm.push(p.nx * cp, p.ny, p.nx * sp);
      ang.push(t);
      prof.push(p.ux, p.uy);
    }
  }
  const stride = P.length;
  for (let j = 0; j < segments; j++) {
    for (let k = 0; k < profileSegments; k++) {
      const i0 = j * stride + k;
      const i1 = i0 + stride;
      idx.push(i0, i1, i0 + 1, i1, i1 + 1, i0 + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('aAngle', new THREE.Float32BufferAttribute(ang, 1));
  g.setAttribute('aProf', new THREE.Float32BufferAttribute(prof, 2));
  g.setIndex(idx);
  return g;
}

export function createRings(THREE, shared, cfg) {
  const group = new THREE.Group();
  const deg = Math.PI / 180;
  const Y = new THREE.Vector3(0, 1, 0);
  const rings = RING_LAYOUT.slice(0, cfg.ringCount).map((def, i) => {
    const uniforms = {
      uRadius: { value: def.R },
      uScale: { value: 1 },
      uTicks: { value: def.ticks },
      uSweep: { value: 1 },
      uOpacity: { value: 1 },
      uSeed: { value: i * 0.37 },
      uComet: { value: 0 },
      uDir: { value: 1 },
    };
    const mesh = new THREE.Mesh(
      ringGeometry(THREE, def.R, def.w, def.th),
      holoMaterial(THREE, shared, { uniforms, vertexShader: RING_VS, fragmentShader: RING_FS, side: THREE.DoubleSide }),
    );
    mesh.frustumCulled = false;
    group.add(mesh);
    const tilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(def.tilt[0] * deg, def.tilt[1] * deg, def.tilt[2] * deg));
    // axis used to "swing" rings into place during assembly
    const swingAxis = new THREE.Vector3(Math.cos(i * 2.1), 0.3, Math.sin(i * 2.1)).normalize();
    return { def, mesh, uniforms, tilt, swingAxis, cometTurns: (i % 2 ? -1 : 1) * (1 + (i % 3 === 0 ? 1 : 0)), cometPhase: i * 0.23 };
  });

  const qPrec = new THREE.Quaternion();
  const qSpin = new THREE.Quaternion();
  const qSwing = new THREE.Quaternion();

  return {
    group,
    update(state) {
      rings.forEach((r, i) => {
        const x = state.rings[i];
        qPrec.setFromAxisAngle(Y, x.precession);
        qSpin.setFromAxisAngle(Y, x.spin);
        qSwing.setFromAxisAngle(r.swingAxis, x.tiltOffset);
        r.mesh.quaternion.copy(qPrec).multiply(qSwing).multiply(r.tilt).multiply(qSpin);
        r.mesh.scale.setScalar(x.scale);
        r.uniforms.uScale.value = x.scale;
        r.uniforms.uOpacity.value = x.opacity;
        r.uniforms.uSweep.value = x.sweep;
        const c = r.cometTurns * cfg.ringSpeed * state.u + r.cometPhase;
        r.uniforms.uComet.value = c - Math.floor(c);
        r.uniforms.uDir.value = Math.sign(r.cometTurns * cfg.ringSpeed) || 1;
      });
    },
  };
}
