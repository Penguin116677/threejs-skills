// C — Synthwave horizon: endless neon grid road toward a striped retro sun, wireframe mountain
// ranges on both sides, twinkling stars. World scrolls an exact multiple of every period → seamless.
import * as THREE from 'three';
import { TAU, pulse, lines, setLinePositions, gridPlane, perspective, softPoints } from '../lib.js';

export function create(ctx) {
  const scene = new THREE.Scene();
  const horizon = new THREE.Color(0x2a0838);
  scene.background = new THREE.Color(0x07010f);
  scene.fog = new THREE.Fog(horizon, 30, 120);
  const camera = perspective(ctx, 55, 0.1, 600);

  // Sky gradient dome
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uGlow: { value: 0 } },
    vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float uGlow; varying vec3 vP;
      void main(){ float h = normalize(vP).y;
        vec3 top = vec3(0.004,0.0,0.02), mid = vec3(0.09,0.01,0.20), low = vec3(0.55,0.05,0.30);
        vec3 c = mix(low, mid, smoothstep(0.0, 0.12, h)); c = mix(c, top, smoothstep(0.10, 0.55, h));
        c *= (1.0 + 0.2*uGlow*(1.0-smoothstep(0.0,0.3,h)));
        if (h < 0.0) c = vec3(0.03,0.0,0.05);
        gl_FragColor = vec4(c,1.); }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(500, 48, 24), skyMat);
  scene.add(sky);

  // Retro sun
  const sunMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false,
    uniforms: { uPhase: { value: 0 }, uGlow: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float uPhase,uGlow; varying vec2 vUv;
      void main(){ vec2 p = vUv*2.0-1.0; float r = length(p);
        float disc = 1.0 - smoothstep(0.985, 1.0, r);
        float y = vUv.y;
        vec3 c = mix(vec3(1.0,0.12,0.55), vec3(1.0,0.85,0.25), smoothstep(0.3, 0.95, y));
        // stripes in lower half, gaps widen toward the bottom and drift down (seamless phase)
        float band = fract(y*11.0 + uPhase);
        float gap = mix(0.5, 0.0, smoothstep(0.34, 0.8, y));
        float aa = fwidth(y*11.0)*1.2;
        float stripe = smoothstep(gap-aa, gap+aa, band);
        float a = disc * stripe;
        gl_FragColor = vec4(c*a*(0.62+0.15*uGlow), a); }`,
  });
  const sun = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), sunMat);
  sun.position.set(0, 11, -300);
  scene.add(sun);
  const halo = softPoints(ctx, 1, { size: 900, color: 0xff3c8c, atten: 0 });
  halo.position.copy(sun.position).add(new THREE.Vector3(0, 0, 5));
  halo.material.uniforms.uSize.value = 900 * ctx.px;
  scene.add(halo);

  // Floor grid (shader) — cell 2, scroll 120 units per loop = 60 cells
  const S = 120;
  const grid = gridPlane({ color: 0xff2bd6, majorColor: 0x38e8ff, intensity: 0.75, majorIntensity: 0.8,
    cell: 2, major: 6, width: 2.0, majorWidth: 2.6, fadeNear: 30, fadeFar: 150, size: 600, waveColor: 0xff7be0 });
  scene.add(grid);
  // opaque ground so the sun sinks behind the horizon (the grid itself is additive)
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), new THREE.MeshBasicMaterial({ color: 0x0b0216 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; ground.renderOrder = -2;
  scene.add(ground);

  // Mountain ranges: world-fixed height field rendered as rows that wrap; period = S
  const COLS = 26, ROWS = 60, DZ = 2.5; // 150 units deep; S / DZ = 48 rows per loop (integer)
  const sides = [-1, 1];
  const xAt = (c, side) => side * (9 + c * 2.4);
  const hAt = (x, w) => {
    const ax = Math.abs(x) - 9;
    const ramp = Math.min(1, ax / 18) ** 1.4;
    const k = TAU / S;
    let h = 7 + 4.5 * Math.sin(w * k * 2 + x * 0.21) + 3 * Math.sin(w * k * 5 + x * 0.47 + 1.3)
      + 1.6 * Math.sin(w * k * 11 - x * 0.83 + 2.1) + 0.8 * Math.sin(w * k * 23 + x * 1.7);
    return Math.max(0, h * ramp * (0.6 + 0.4 * Math.sin(x * 0.13 + 0.7)));
  };
  const segCount = sides.length * (ROWS * (COLS - 1) + (ROWS - 1) * COLS);
  const mPos = new Float32Array(segCount * 6), mCol = new Float32Array(segCount * 6);
  const mtn = lines(ctx, mPos, { colors: mCol, width: 1.6 });
  scene.add(mtn);
  // occluding dark fill under the wireframe
  const fillGeo = new THREE.BufferGeometry();
  const fillPos = new Float32Array(sides.length * ROWS * COLS * 3);
  fillGeo.setAttribute('position', new THREE.BufferAttribute(fillPos, 3));
  const idx = [];
  for (let s = 0; s < 2; s++) for (let r = 0; r < ROWS - 1; r++) for (let c = 0; c < COLS - 1; c++) {
    const v = (rr, cc) => s * ROWS * COLS + rr * COLS + cc;
    idx.push(v(r, c), v(r + 1, c), v(r, c + 1), v(r + 1, c), v(r + 1, c + 1), v(r, c + 1));
  }
  fillGeo.setIndex(idx);
  const fill = new THREE.Mesh(fillGeo, new THREE.MeshBasicMaterial({ color: 0x0a0214, side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }));
  fill.frustumCulled = false;
  scene.add(fill);
  const cA = new THREE.Color(0xb04dff), cB = new THREE.Color(0x3ae7ff), tmp = new THREE.Color();

  // Stars
  const NS = 420, stars = softPoints(ctx, NS, { size: 3, color: 0xffffff, atten: 0 });
  const sp = stars.geometry.attributes.position.array, sd = [];
  for (let i = 0; i < NS; i++) {
    const h = (n) => { const x = Math.sin(i * 91.7 + n * 47.3) * 43758.5453; return x - Math.floor(x); };
    const az = (h(1) - 0.5) * 2.4, el = 0.06 + h(2) ** 1.3 * 0.9;
    sp[i * 3] = Math.sin(az) * Math.cos(el) * 450; sp[i * 3 + 1] = Math.sin(el) * 450; sp[i * 3 + 2] = -Math.cos(az) * Math.cos(el) * 450;
    sd.push([1 + Math.floor(h(3) * 4), h(4) * TAU, 0.3 + 0.7 * h(5)]);
  }
  stars.geometry.attributes.position.needsUpdate = true;
  scene.add(stars);

  function update(t, p, bloom) {
    const glow = pulse(p, 0.5, 6);
    // travel: S per loop, slowing to 40 % around the climax (t = 10 s)
    const s = S * p + 0.6 * S / TAU * Math.sin(TAU * p);
    grid.material.uniforms.uOffset.value.set(0, -s);
    const w = (p - 0.44) / 0.18, env = w > 0 && w < 1 ? Math.sin(Math.PI * w) ** 2 : 0;
    grid.material.uniforms.uWave.value.set(w * 140, env * 0.5, 6);
    grid.material.uniforms.uCam.value.set(0, 0, 0);
    sunMat.uniforms.uPhase.value = -p * 4;     // 4 stripe cycles per loop
    sunMat.uniforms.uGlow.value = glow;
    skyMat.uniforms.uGlow.value = glow;
    halo.geometry.attributes.aAlpha.array[0] = 0.12 + 0.16 * glow;
    halo.geometry.attributes.aAlpha.needsUpdate = true;
    bloom.strength = 0.6 + 0.1 * glow;

    // mountains
    const off = s % DZ, base = Math.floor(s / DZ);
    let k = 0;
    const put = (x0, y0, z0, x1, y1, z1, f0, f1) => {
      mPos.set([x0, y0, z0, x1, y1, z1], k * 6);
      tmp.copy(cA).lerp(cB, f0).multiplyScalar(1 + glow * 0.4); mCol.set([tmp.r, tmp.g, tmp.b], k * 6);
      tmp.copy(cA).lerp(cB, f1).multiplyScalar(1 + glow * 0.4); mCol.set([tmp.r, tmp.g, tmp.b], k * 6 + 3);
      k++;
    };
    const P = [];
    sides.forEach((side, si) => {
      for (let r = 0; r < ROWS; r++) {
        const z = 8 - r * DZ + off;                 // camera-relative row position
        const wz = (r + base) * DZ;                 // world index of that row (periodic in S)
        for (let c = 0; c < COLS; c++) {
          const x = xAt(c, side), y = hAt(x, wz);
          P.push(x, y, z);
          fillPos.set([x, y - 0.05, z], (si * ROWS * COLS + r * COLS + c) * 3);
        }
      }
    });
    const at = (si, r, c) => (si * ROWS * COLS + r * COLS + c) * 3;
    const hf = (y) => Math.min(1, y / 14);
    for (let si = 0; si < 2; si++) {
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS - 1; c++) {
        const a = at(si, r, c), b = at(si, r, c + 1);
        put(P[a], P[a + 1], P[a + 2], P[b], P[b + 1], P[b + 2], hf(P[a + 1]), hf(P[b + 1]));
      }
      for (let r = 0; r < ROWS - 1; r++) for (let c = 0; c < COLS; c++) {
        const a = at(si, r, c), b = at(si, r + 1, c);
        put(P[a], P[a + 1], P[a + 2], P[b], P[b + 1], P[b + 2], hf(P[a + 1]), hf(P[b + 1]));
      }
    }
    setLinePositions(mtn, mPos, mCol);
    fillGeo.attributes.position.needsUpdate = true;

    const al = stars.geometry.attributes.aAlpha.array;
    sd.forEach(([f, ph, b], i) => (al[i] = b * (0.55 + 0.45 * Math.sin(TAU * f * p + ph))));
    stars.geometry.attributes.aAlpha.needsUpdate = true;

    camera.position.set(0.6 * Math.sin(TAU * p), 2.4 + 0.25 * Math.sin(TAU * 2 * p), 6);
    camera.lookAt(0.4 * Math.sin(TAU * p + 0.6), 4.2, -60);
    camera.rotateZ(0.025 * Math.sin(TAU * p));
  }
  return { scene, camera, update, bloom: { strength: 0.6, radius: 0.45, threshold: 0.2 } };
}
