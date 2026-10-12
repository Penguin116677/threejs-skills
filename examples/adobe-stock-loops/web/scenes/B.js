// B — Hologram knot: translucent fresnel torus knot with moving scan bands and helical wire
// strands, standing on a holographic projector with rising particles. Seamless 20 s loop.
import * as THREE from 'three';
import { TAU, pulse, lines, circle, perspective, softPoints, gridPlane } from '../lib.js';

class KnotCurve extends THREE.Curve {
  getPoint(u, target = new THREE.Vector3()) {
    const t = u * TAU, p = 2, q = 3, r = 1.6 + 0.6 * Math.cos(q * t);
    return target.set(r * Math.cos(p * t), 0.6 * Math.sin(q * t) * 1.4, r * Math.sin(p * t));
  }
}

export function create(ctx) {
  const bg = new THREE.Color(0x01060a);
  const scene = new THREE.Scene();
  scene.background = bg;
  scene.fog = new THREE.Fog(bg, 12, 34);
  const camera = perspective(ctx, 36);
  const cyan = new THREE.Color(0x35f2ff);

  const holo = new THREE.Group();
  holo.position.y = 3.2;
  scene.add(holo);

  const curve = new KnotCurve();
  const TUB = 480, RAD = 10;
  const tube = new THREE.TubeGeometry(curve, TUB, 0.42, RAD, true);
  const holoMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: cyan.clone() }, uScan: { value: 0 }, uBand: { value: -10 }, uGlow: { value: 0 } },
    vertexShader: `varying vec3 vN; varying vec3 vV; varying float vY;
      void main(){ vec4 w = modelMatrix*vec4(position,1.); vY = w.y - 3.2; vN = normalize(mat3(modelMatrix)*normal);
        vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uScan,uBand,uGlow; varying vec3 vN; varying vec3 vV; varying float vY;
      void main(){ float f = 1.0 - abs(dot(normalize(vN), vV)); f = pow(f, 2.2);
        float scan = 0.5 + 0.5*sin((vY*5.0 - uScan)*6.2831853); scan = 0.55 + 0.45*scan*scan;
        float band = exp(-pow((vY - uBand)/0.18, 2.0));
        float a = (0.025 + 0.32*f)*scan + band*(0.22+0.12*uGlow);
        gl_FragColor = vec4(uColor*a*(1.0+0.25*uGlow), 1.0); }`,
  });
  // knot stands upright inside `knot`; `holo` spins it around the vertical axis
  const knot = new THREE.Group();
  knot.rotation.x = Math.PI / 2 - 0.25;
  holo.add(knot);
  knot.add(new THREE.Mesh(tube, holoMat));

  // Helical strands along the tube surface + sparse rings
  const P = tube.attributes.position, strands = [], rings = [];
  const vi = (i, j) => (i % (TUB + 1)) * (RAD + 1) + j;
  for (let j = 0; j < RAD; j += 2) for (let i = 0; i < TUB; i++) {
    const a = vi(i, j), b = vi(i + 1, j);
    strands.push(P.getX(a), P.getY(a), P.getZ(a), P.getX(b), P.getY(b), P.getZ(b));
  }
  for (let i = 0; i < TUB; i += 12) for (let j = 0; j < RAD; j++) {
    const a = vi(i, j), b = vi(i, j + 1);
    rings.push(P.getX(a), P.getY(a), P.getZ(a), P.getX(b), P.getY(b), P.getZ(b));
  }
  const strandL = lines(ctx, strands, { color: 0x6ff8ff, width: 1.4, opacity: 0.4, additive: true });
  const ringL = lines(ctx, rings, { color: 0xbffcff, width: 1.3, opacity: 0.3, additive: true });
  knot.add(strandL, ringL);
  // centre spine (the knot curve itself)
  const spine = [];
  for (let i = 0; i < 600; i++) { const a = curve.getPoint(i / 600), b = curve.getPoint((i + 1) / 600); spine.push(a.x, a.y, a.z, b.x, b.y, b.z); }
  const spineL = lines(ctx, spine, { color: 0xffffff, width: 1.8, opacity: 0.7, additive: true });
  knot.add(spineL);

  // Projector base
  const baseY = 0;
  const base = new THREE.Group();
  scene.add(base);
  const baseRings = [];
  for (const [r, w, o] of [[1.2, 2.2, 1], [2.0, 1.6, 0.8], [2.9, 1.4, 0.6], [3.9, 1.2, 0.4]])
    baseRings.push(lines(ctx, circle(r, 200, baseY), { color: 0x5ff2ff, width: w, opacity: o, additive: true }));
  baseRings.forEach((l) => base.add(l));
  const dashes = [];
  for (const [r, n, len] of [[1.6, 24, 0.5], [2.45, 36, 0.35], [3.4, 60, 0.6]]) {
    const g = new THREE.Group(), seg = [];
    for (let i = 0; i < n; i++) { const a0 = (i / n) * TAU, a1 = a0 + (TAU / n) * len;
      for (let s = 0; s < 3; s++) { const u0 = a0 + (a1 - a0) * s / 3, u1 = a0 + (a1 - a0) * (s + 1) / 3;
        seg.push(Math.cos(u0) * r, baseY, Math.sin(u0) * r, Math.cos(u1) * r, baseY, Math.sin(u1) * r); } }
    g.add(lines(ctx, seg, { color: 0xbffcff, width: 2.4, opacity: 0.8, additive: true }));
    base.add(g); dashes.push(g);
  }
  // light cone from projector
  const coneMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: cyan.clone() }, uGlow: { value: 0 } },
    vertexShader: `varying float vH; varying vec3 vN; varying vec3 vV; void main(){ vH = uv.y; vec4 w=modelMatrix*vec4(position,1.);
      vN=normalize(mat3(modelMatrix)*normal); vV=normalize(cameraPosition-w.xyz); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uGlow; varying float vH; varying vec3 vN; varying vec3 vV;
      void main(){ float edge = abs(dot(normalize(vN),vV)); float a = (1.0-vH)*(1.0-vH)*0.10*edge*(1.0+uGlow);
        gl_FragColor=vec4(uColor*a,1.0);} `,
  });
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 1.2, 5.2, 96, 1, true), coneMat);
  cone.position.y = 2.6;
  scene.add(cone);

  const floor = gridPlane({ color: 0x1a8fa8, majorColor: 0x2fd0e0, intensity: 0.18, majorIntensity: 0.3,
    cell: 1, major: 4, width: 1.2, majorWidth: 1.8, fadeNear: 5, fadeFar: 22, y: -0.01 });
  scene.add(floor);

  // Rising particles inside the beam
  const N = 260, parts = softPoints(ctx, N, { size: 5, color: 0x9ffbff, atten: 9 });
  const seed = Array.from({ length: N }, (_, i) => {
    const h = (n) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };
    return { a: h(1) * TAU, r: 0.3 + h(2) * 2.6, off: h(3), k: 1 + Math.floor(h(4) * 3), sw: h(5) };
  });
  scene.add(parts);

  function update(t, p, bloom) {
    const glow = pulse(p, 0.5, 10);
    holo.rotation.y = TAU * p;
    holo.rotation.x = 0.12 * Math.sin(TAU * p);
    holo.position.y = 3.2 + 0.1 * Math.sin(TAU * 2 * p);
    holoMat.uniforms.uScan.value = p * 8;        // 8 scan cycles per loop
    // climax: a bright scan band sweeps up the knot between 8.5–11.5 s
    const w = (p - 0.425) / 0.15;
    holoMat.uniforms.uBand.value = w > 0 && w < 1 ? -2.8 + w * 5.6 : -10;
    holoMat.uniforms.uGlow.value = glow;
    coneMat.uniforms.uGlow.value = glow * 0.6;
    for (const l of [strandL, ringL, spineL]) l.material.opacity = (l === spineL ? 0.7 : l === strandL ? 0.4 : 0.3) * (1 + 0.4 * glow);
    dashes.forEach((g, i) => (g.rotation.y = (i % 2 ? -1 : 1) * TAU * p * (i + 1)));
    baseRings.forEach((l, i) => l.material.opacity = (1 - i * 0.2) * (0.75 + 0.25 * Math.cos(TAU * (4 * p - i * 0.15))) * (1 + 0.4 * glow));
    const a = parts.geometry.attributes.position.array, al = parts.geometry.attributes.aAlpha.array;
    seed.forEach((s, i) => {
      const f = (p * s.k + s.off) % 1;          // integer laps per loop
      const y = f * 5.4, r = s.r * (1 + y * 0.12), ang = s.a + TAU * p * (s.sw > 0.5 ? 1 : -1);
      a[i * 3] = Math.cos(ang) * r; a[i * 3 + 1] = y; a[i * 3 + 2] = Math.sin(ang) * r;
      al[i] = Math.sin(Math.PI * f) * (0.6 + 0.8 * glow);
    });
    parts.geometry.attributes.position.needsUpdate = true; parts.geometry.attributes.aAlpha.needsUpdate = true;
    bloom.strength = 0.5 + 0.1 * glow;
    // camera: slow counter-orbit (one turn ∓ easing), slows down around the climax
    const az = 0.6 + 0.35 * Math.cos(TAU * p);
    const r = 12.5 - 1.2 * glow;
    camera.position.set(Math.sin(az) * r, 3.6 + 0.6 * Math.cos(TAU * p), Math.cos(az) * r);
    camera.lookAt(0, 2.8, 0);
    floor.material.uniforms.uCam.value.copy(camera.position);
  }
  return { scene, camera, update, bloom: { strength: 0.7, radius: 0.4, threshold: 0.12 } };
}
