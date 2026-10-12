// F — Tunnel warp: flight through a curving, twisting tunnel of neon polygon rings with speed
// streaks. Distance per loop = exact multiple of every spatial period → seamless; warp surge at 10 s.
import * as THREE from 'three';
import { TAU, pulse, lines, setLinePositions, perspective, softPoints } from '../lib.js';

export function create(ctx) {
  const bg = new THREE.Color(0x010104);
  const scene = new THREE.Scene();
  scene.background = bg;
  scene.fog = new THREE.Fog(bg, 12, 66);
  const camera = perspective(ctx, 68, 0.1, 300);

  const S = 360;           // distance travelled per loop
  const D = 1.25;          // ring spacing (S / D = 288 rings per loop)
  const NR = 56, SIDES = 12, RAD = 3.2;
  const curve = (w) => [2.2 * Math.sin(TAU * w / 180) + 0.9 * Math.sin(TAU * w / 72 + 1.0),
    1.4 * Math.sin(TAU * w / 120 + 0.5) + 0.6 * Math.sin(TAU * w / 40)];
  const twist = (w) => TAU * w / 120;                      // 3 turns per loop
  const hue = (w) => 0.5 + 0.5 * Math.sin(TAU * w / 60);     // cyan ↔ magenta bands along the tunnel

  const ringSegs = NR * SIDES, LEAD = 10, streakSegs = (NR - 1) * (SIDES / 2) + LEAD * (SIDES / 2);
  const total = ringSegs + streakSegs;
  const pos = new Float32Array(total * 6), col = new Float32Array(total * 6);
  const L = lines(ctx, pos, { colors: col, width: 2.0, additive: true });
  scene.add(L);

  // floating sparks on the tunnel walls (world-fixed, indexed by ring)
  const NP = 56 * 4, sparks = softPoints(ctx, NP, { size: 5, color: 0xffffff, atten: 10 });
  scene.add(sparks);
  const sh = (i, n) => { const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453; return x - Math.floor(x); };

  const c = new THREE.Color();
  function ringPoint(w, j, out) {
    const [cx, cy] = curve(w), a = (j / SIDES) * TAU + twist(w);
    out[0] = cx + Math.cos(a) * RAD; out[1] = cy + Math.sin(a) * RAD; out[2] = -w;
    return out;
  }
  const A = [0, 0, 0], B = [0, 0, 0];

  function update(t, p, bloom) {
    const glow = pulse(p, 0.5, 6);
    // travel: S per loop; speed 0.55x at the seam, surging to 1.45x at the climax
    const s = S * p - 0.45 * S / TAU * Math.sin(TAU * p);
    // skip rings closer than ~2.5 units (off-screen anyway; very near segments rasterise badly)
    const k0 = Math.floor(s / D) + 3;
    let k = 0;
    const put = (a, b, ca, cb) => { pos.set(a, k * 6); pos.set(b, k * 6 + 3); col.set(ca, k * 6); col.set(cb, k * 6 + 3); k++; };
    const colorAt = (w, boost) => { c.setHSL(0.5 + 0.38 * hue(w), 1, 0.55); c.multiplyScalar(boost); return [c.r, c.g, c.b]; };
    for (let i = 0; i < NR; i++) {
      const w = (k0 + i) * D;
      const bright = (0.7 + 0.5 * glow) * (((k0 + i) % 4 === 0) ? 1.6 : 0.8);
      const cc = colorAt(w, bright);
      for (let j = 0; j < SIDES; j++) put(ringPoint(w, j, A).slice(), ringPoint(w, j + 1, B).slice(), cc, cc);
    }
    for (let i = 0; i < NR - 1; i++) {
      const w0 = (k0 + i) * D, w1 = w0 + D;
      const c0 = colorAt(w0, 0.45 + 0.6 * glow), c1 = colorAt(w1, 0.45 + 0.6 * glow);
      for (let j = 0; j < SIDES; j += 2) put(ringPoint(w0, j, A).slice(), ringPoint(w1, j, B).slice(), c0, c1);
    }
    // lead-in streaks from just ahead of the camera to the first ring
    // (subdivided: long near-camera segments rasterise with gaps otherwise)
    for (let j = 0; j < SIDES; j += 2) for (let q = 0; q < LEAD; q++) {
      const wa = s + 1.6 + (k0 * D - s - 1.6) * q / LEAD, wb = s + 1.6 + (k0 * D - s - 1.6) * (q + 1) / LEAD;
      put(ringPoint(wa, j, A).slice(), ringPoint(wb, j, B).slice(), colorAt(wa, 0.45 + 0.6 * glow), colorAt(wb, 0.45 + 0.6 * glow));
    }
    setLinePositions(L, pos, col);

    // camera follows the centre line, looking a little ahead
    const [cx, cy] = curve(s), [lx, ly] = curve(s + 9);
    camera.position.set(cx, cy, -s);
    camera.up.set(Math.sin(0.15 * Math.sin(TAU * p)), Math.cos(0.15 * Math.sin(TAU * p)), 0);
    camera.lookAt(lx, ly, -s - 9);
    camera.fov = 68 + 10 * glow;
    camera.updateProjectionMatrix();

    const sp = sparks.geometry.attributes.position.array, sa = sparks.geometry.attributes.aAlpha.array;
    for (let i = 0; i < NP; i++) {
      // spark slot i lives on ring index m = k0 + (i mod NR) … wrapped so each world spark is unique & periodic
      const ring = k0 + (i % NR), id = ((ring % 288) + 288) % 288 * 4 + Math.floor(i / NR) % 4;
      const w = ring * D + sh(id, 1) * D, a = sh(id, 2) * TAU + twist(w), r = RAD * (0.92 - 0.1 * sh(id, 3));
      const [px, py] = curve(w);
      sp[i * 3] = px + Math.cos(a) * r; sp[i * 3 + 1] = py + Math.sin(a) * r; sp[i * 3 + 2] = -w;
      sa[i] = (sh(id, 4) < 0.5 ? 1 : 0) * (0.6 + 0.6 * glow);
    }
    sparks.geometry.attributes.position.needsUpdate = true; sparks.geometry.attributes.aAlpha.needsUpdate = true;
    bloom.strength = 0.55 + 0.12 * glow;
  }
  return { scene, camera, update, bloom: { strength: 0.55, radius: 0.4, threshold: 0.2 } };
}
