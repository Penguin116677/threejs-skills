// D — Wireframe city build-up (non-loop, 20 s): footprints on a grid → blocks rise outward from
// the centre (city readable by 5 s for the thumbnail) → landmark towers top out → light pulse
// sweeps the skyline at ~14 s → camera eases to a slow final drift.
import * as THREE from 'three';
import { TAU, lines, edgePositions, gridPlane, perspective, rng, easeOutCubic, easeInOut, smooth, circle } from '../lib.js';

export function create(ctx) {
  const bg = new THREE.Color(0x020812);
  const scene = new THREE.Scene();
  scene.background = bg;
  scene.fog = new THREE.Fog(bg, 30, 85);
  const camera = perspective(ctx, ctx.vertical ? 58 : 40, 0.1, 400);
  const R = rng(7);

  const grid = gridPlane({ color: 0x1b6fa0, majorColor: 0x3fb8ff, intensity: 0.25, majorIntensity: 0.45,
    cell: 1, major: 6, width: 1.2, majorWidth: 1.8, fadeNear: 25, fadeFar: 70, waveColor: 0x7fe0ff });
  scene.add(grid);

  const boxEdges = edgePositions(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0));
  const fillMat = new THREE.MeshBasicMaterial({ color: 0x03101e, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  const fillGeo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const B = [];
  const N = 15, PITCH = 3;
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const cx = (i - (N - 1) / 2) * PITCH, cz = (j - (N - 1) / 2) * PITCH;
    const d = Math.hypot(cx, cz);
    if (d > 23 || R() < 0.08) continue;
    // occasionally split a lot into two narrower buildings
    const parts = R() < 0.3 ? [[-0.55, 0.9], [0.55, 0.9]] : [[0, 2.1]];
    for (const [ox, w] of parts) {
      const near = 1 - d / 24;
      let h = 1 + R() * 3 + near * near * (4 + R() * 7);
      const landmark = d < 7 && R() < 0.35 && parts.length === 1;
      if (landmark) h = 13 + R() * 7;
      const depth = parts.length === 1 ? 2.1 : 2.1;
      B.push({ x: cx + ox, z: cz, w: parts.length === 1 ? w * (0.75 + 0.25 * R()) : w, dz: depth * (0.75 + 0.25 * R()), h, d, landmark,
        delay: landmark ? 2.6 + R() * 3.2 : 0.15 + (d / 23) * 2.6 + R() * 0.5,
        dur: landmark ? 5.5 + R() * 1.5 : 1.4 + R() * 0.7 });
    }
  }
  const tallest = B.reduce((a, b) => (b.h > a.h ? b : a));
  const city = new THREE.Group();
  scene.add(city);
  const baseColor = new THREE.Color(0x46c8ff), hot = new THREE.Color(0xd8fbff), tmp = new THREE.Color();
  for (const b of B) {
    const g = new THREE.Group();
    g.position.set(b.x, 0, b.z);
    const body = new THREE.Group();
    body.scale.set(b.w, 0.001, b.dz);
    const seg = boxEdges.slice();
    // floor bands every ~1.1 units (stretch with the building as it grows)
    const floors = Math.floor(b.h / 0.8);
    for (let f = 1; f < floors; f++) { const y = f / floors;
      seg.push(-0.5, y, 0.5, 0.5, y, 0.5, 0.5, y, 0.5, 0.5, y, -0.5, 0.5, y, -0.5, -0.5, y, -0.5, -0.5, y, -0.5, -0.5, y, 0.5); }
    // vertical mullions on landmark towers
    if (b.landmark) for (const s of [-0.17, 0.17]) seg.push(s, 0, 0.5, s, 1, 0.5, s, 0, -0.5, s, 1, -0.5, 0.5, 0, s, 0.5, 1, s, -0.5, 0, s, -0.5, 1, s);
    const l = lines(ctx, seg, { color: 0x46c8ff, width: b.landmark ? 1.9 : 1.5 });
    body.add(new THREE.Mesh(fillGeo, fillMat), l);
    g.add(body);
    // footprint, visible from frame 0 so the opening frame is never empty
    const fp = [-0.5, 0, -0.5, 0.5, 0, -0.5, 0.5, 0, -0.5, 0.5, 0, 0.5, 0.5, 0, 0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, -0.5, 0, -0.5]
      .map((v, k) => (k % 3 === 0 ? v * b.w : k % 3 === 2 ? v * b.dz : 0.02));
    const foot = lines(ctx, fp, { color: 0x2f9ad8, width: 1.3, opacity: 0.7 });
    g.add(foot);
    city.add(g);
    b.body = body; b.line = l; b.foot = foot;
  }
  // antenna / beacon on the tallest tower
  const spire = lines(ctx, [0, 0, 0, 0, 3.2, 0, -0.25, 1.2, 0, 0.25, 1.2, 0, 0, 1.2, -0.25, 0, 1.2, 0.25], { color: 0x9ff0ff, width: 1.8 });
  spire.position.set(tallest.x, tallest.h, tallest.z);
  scene.add(spire);
  const beacon = lines(ctx, circle(1, 96, 0), { color: 0xffffff, width: 2, opacity: 0, additive: true });
  beacon.position.set(tallest.x, tallest.h + 3.2, tallest.z);
  scene.add(beacon);

  function update(t, p, bloom) {
    // pulse wave between 13 s and 16.5 s, radiating from the tallest tower
    const wt = (t - 13) / 3.5, waveR = wt * 34, waveOn = wt > 0 && wt < 1 ? Math.sin(Math.PI * wt) : 0;
    grid.material.uniforms.uWave.value.set(waveR, waveOn * 0.9, 2.2);
    for (const b of B) {
      const k = easeOutCubic((t - b.delay) / b.dur);
      b.body.scale.y = Math.max(0.001, k * b.h);
      b.body.visible = k > 0.001;
      const growing = k > 0 && k < 1 ? 1 - k : 0;
      const dist = Math.hypot(b.x - tallest.x, b.z - tallest.z);
      const hit = waveOn * Math.exp(-(((dist - waveR) / 3) ** 2));
      tmp.copy(baseColor).lerp(hot, Math.min(1, growing * 0.9 + hit)).multiplyScalar(1 + 0.8 * hit + 0.4 * growing);
      b.line.material.color.copy(tmp);
      b.foot.material.opacity = 0.7 * (1 - 0.6 * k);
    }
    const sp = easeOutCubic((t - (tallest.delay + tallest.dur * 0.9)) / 1.2);
    spire.scale.set(1, Math.max(0.001, sp), 1);
    spire.visible = sp > 0.001;
    const bt = Math.max(0, t - 12.6);
    beacon.material.opacity = sp > 0.99 ? (0.5 + 0.5 * Math.cos(TAU * bt / 2.5)) * 0.8 : 0;
    beacon.scale.setScalar(0.3 + 1.2 * ((bt / 2.5) % 1));
    bloom.strength = 0.5 + 0.1 * waveOn;
    // camera: elevated orbit that decelerates and settles (no loop needed)
    const u = t / 20;
    const az = -0.95 + 1.35 * (1 - Math.pow(1 - u, 2.2));
    const el = 0.6 - 0.2 * easeInOut(u);
    const r = 44 + 12 * easeInOut(u);
    camera.position.set(Math.sin(az) * Math.cos(el) * r, Math.sin(el) * r + 1, Math.cos(az) * Math.cos(el) * r);
    camera.lookAt(0, 3 + 5 * smooth(2, 15, t), 0);
    if (ctx.vertical) {
      // 9:16: crane shot — starts low at the city edge and rises with the towers, settling at the end
      const k = easeInOut(t / 20), va = 0.5 - 0.5 * (1 - Math.pow(1 - t / 20, 2));
      const vr = 40 - 4 * k;
      camera.position.set(Math.sin(va) * vr, 12 + 24 * k, Math.cos(va) * vr);
      camera.lookAt(0, 5 + 5 * k, 0);
    }
    grid.material.uniforms.uCam.value.copy(camera.position);
  }
  return { scene, camera, update, bloom: { strength: 0.5, radius: 0.35, threshold: 0.2 } };
}
