// A — Blueprint grid: cyan wireframe icosahedron + nested dodecahedron floating over an infinite
// blueprint grid, with orbit rings and ground construction marks. Seamless 20 s loop.
import * as THREE from 'three';
import { TAU, pulse, lines, edgePositions, circle, gridPlane, perspective, softPoints } from '../lib.js';

export function create(ctx) {
  const bg = new THREE.Color(0x06204a);
  const scene = new THREE.Scene();
  scene.background = bg;
  scene.fog = new THREE.Fog(bg, 14, 42);
  const camera = perspective(ctx, 38);

  const grid = gridPlane({ color: 0x4aa8ff, majorColor: 0x9fe3ff, intensity: 0.32, majorIntensity: 0.55,
    cell: 1, major: 5, width: 1.4, majorWidth: 2.2, fadeNear: 8, fadeFar: 34, waveColor: 0x7fe8ff });
  scene.add(grid);

  const hero = new THREE.Group();
  hero.position.y = 2.6;
  scene.add(hero);

  const icoGeo = new THREE.IcosahedronGeometry(2, 1);
  const ico = lines(ctx, edgePositions(icoGeo), { color: 0x7ff6ff, width: 2.6 });
  const icoVerts = new THREE.Group();
  const seen = new Set();
  const pos = icoGeo.attributes.position;
  const vtxPos = [];
  for (let i = 0; i < pos.count; i++) {
    const k = `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
    if (seen.has(k)) continue; seen.add(k); vtxPos.push(pos.getX(i), pos.getY(i), pos.getZ(i));
  }
  const nodes = softPoints(ctx, vtxPos.length / 3, { size: 14, color: 0xc8fbff, atten: 9 });
  nodes.geometry.attributes.position.array.set(vtxPos);
  icoVerts.add(nodes);
  const outer = new THREE.Group();
  outer.add(ico, icoVerts);
  hero.add(outer);

  const inner = lines(ctx, edgePositions(new THREE.DodecahedronGeometry(1.05, 0)), { color: 0xffffff, width: 1.8, opacity: 0.85 });
  hero.add(inner);
  const core = lines(ctx, edgePositions(new THREE.OctahedronGeometry(0.42, 0)), { color: 0x9ff7ff, width: 1.6 });
  hero.add(core);

  // Orbit rings with tick marks
  const ringA = new THREE.Group();
  const rA = [];
  circle(3.0, 160, 0, rA);
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * TAU, l = i % 6 === 0 ? 0.28 : 0.12;
    rA.push(Math.cos(a) * 3.0, 0, Math.sin(a) * 3.0, Math.cos(a) * (3.0 + l), 0, Math.sin(a) * (3.0 + l));
  }
  ringA.add(lines(ctx, rA, { color: 0x5fd0ff, width: 1.5, opacity: 0.8 }));
  ringA.rotation.set(1.15, 0, 0.25);
  hero.add(ringA);
  const ringB = new THREE.Group();
  const rB = [];
  for (let i = 0; i < 48; i++) { if (i % 4 === 3) continue; // dashed
    const a0 = (i / 48) * TAU, a1 = ((i + 0.8) / 48) * TAU;
    for (let s = 0; s < 4; s++) { const u0 = a0 + (a1 - a0) * s / 4, u1 = a0 + (a1 - a0) * (s + 1) / 4;
      rB.push(Math.cos(u0) * 3.5, 0, Math.sin(u0) * 3.5, Math.cos(u1) * 3.5, 0, Math.sin(u1) * 3.5); } }
  ringB.add(lines(ctx, rB, { color: 0x9fe3ff, width: 1.4, opacity: 0.6 }));
  ringB.rotation.set(1.75, 0, -0.5);
  hero.add(ringB);

  // Ground construction marks: circles, crosshair, vertical datum line
  const ground = [];
  circle(2.2, 128, 0.01, ground); circle(2.35, 128, 0.01, ground);
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4;
    ground.push(Math.cos(a) * 1.2, 0.01, Math.sin(a) * 1.2, Math.cos(a) * 6, 0.01, Math.sin(a) * 6); }
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4, c = Math.cos(a) * 6, s = Math.sin(a) * 6;
    const nx = -Math.sin(a) * 0.25, nz = Math.cos(a) * 0.25; ground.push(c - nx, 0.01, s - nz, c + nx, 0.01, s + nz); }
  const groundMarks = lines(ctx, ground, { color: 0x7fd8ff, width: 1.5, opacity: 0.7 });
  scene.add(groundMarks);
  const datum = [];
  for (let i = 0; i < 20; i++) if (i % 2 === 0) datum.push(0, i * 0.13, 0, 0, (i + 1) * 0.13, 0);
  scene.add(lines(ctx, datum, { color: 0x9fe3ff, width: 1.4, opacity: 0.6 }));
  const groundRing = new THREE.Group();
  groundRing.add(lines(ctx, circle(1, 160, 0.015), { color: 0x9ff7ff, width: 1.6, opacity: 0.5 }));
  scene.add(groundRing);

  // Drifting dust
  const N = 160, dust = softPoints(ctx, N, { size: 4, color: 0x9fdcff, atten: 8 });
  const seeds = Array.from({ length: N }, (_, i) => [Math.sin(i * 12.9898) * 43758.5453 % 1, Math.sin(i * 78.233) * 12345.678 % 1, Math.sin(i * 39.425) * 9876.54 % 1]);
  scene.add(dust);

  const lineMats = [ico, inner, core].map((l) => [l.material, l.material.color.clone()]);

  function update(t, p, bloom) {
    const glow = pulse(p, 0.5, 10);            // climax at t = 10 s
    // object motion — integer turns per loop
    outer.rotation.set(0.35 + 0.12 * Math.sin(TAU * p), TAU * p, 0.08 * Math.sin(TAU * 2 * p));
    inner.rotation.set(-TAU * p, -TAU * 2 * p, 0);
    core.rotation.set(TAU * 2 * p, TAU * 3 * p, 0);
    hero.position.y = 2.6 + 0.14 * Math.sin(TAU * 2 * p);
    ringA.rotation.y = TAU * p; ringB.rotation.y = -TAU * p;
    const gr = 1.0 + ((p * 4) % 1) * 5.5;     // repeating ground ripple (4 per loop)
    groundRing.scale.setScalar(gr);
    groundRing.children[0].material.opacity = 0.5 * Math.pow(1 - (p * 4) % 1, 2);
    grid.material.uniforms.uOffset.value.set(0, p * 10); // 10 cells per loop (multiple of major=5)
    // light pulse: expanding wave across the grid during 9–12 s
    const w = (p - 0.45) / 0.15;
    const env = w > 0 && w < 1 ? Math.sin(Math.PI * w) ** 2 : 0;
    grid.material.uniforms.uWave.value.set(w * 26, env, 1.6);
    for (const [m, c] of lineMats) m.color.copy(c).multiplyScalar(1 + 0.45 * glow);
    nodes.material.uniforms.uSize.value = (14 + 5 * glow) * ctx.px;
    bloom.strength = 0.55 + 0.12 * glow;
    // dust drifts along a closed path
    const a = dust.geometry.attributes.position.array;
    seeds.forEach(([x, y, z], i) => {
      const ph = TAU * (p + Math.abs(x));
      a[i * 3] = x * 16 + 0.6 * Math.sin(ph);
      a[i * 3 + 1] = 0.5 + Math.abs(y) * 6 + 0.4 * Math.sin(ph * 1 + z * 5);
      a[i * 3 + 2] = z * 16 + 0.6 * Math.cos(ph);
    });
    dust.geometry.attributes.position.needsUpdate = true;
    // camera: gentle sway, slowest at the climax (velocity ∝ sin, 0 at p = 0.5)
    const az = -0.55 + 0.5 * Math.cos(TAU * p);
    const el = 0.32 + 0.06 * Math.cos(TAU * p);
    const r = 11.5 - 1.0 * glow;
    camera.position.set(Math.sin(az) * Math.cos(el) * r, 2.6 + Math.sin(el) * r, Math.cos(az) * Math.cos(el) * r);
    camera.lookAt(0, 2.4, 0);
    grid.material.uniforms.uCam.value.copy(camera.position);
  }
  return { scene, camera, update, bloom: { strength: 0.55, radius: 0.35, threshold: 0.15 } };
}
