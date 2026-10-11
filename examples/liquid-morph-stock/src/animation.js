// Deterministic timeline: every value is a pure function of the loop time t.
//
// The liquid is described by LOBE_COUNT capsule "lobes" (segment a→b with a
// radius) that the shader smooth-unions into one surface. Art-directed
// keyframe states are interpolated with a periodic, time-aware cubic Hermite
// spline, so motion is C1-continuous everywhere — including across the loop
// point, where t = duration wraps to t = 0 and lands on the identical state.
//
// No Math.random(): all variation comes from a seeded hash, so any frame can
// be rendered independently and reproduce bit-for-bit the same parameters.

import { TIMELINE, CAMERA } from './config.js';

export const LOBE_COUNT = 8;
const TAU = Math.PI * 2;

// ---------------------------------------------------------------- helpers

function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Evenly spread unit directions (Fibonacci sphere), deterministic.
function fibonacciDirs(n) {
  const out = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - ((i + 0.5) / n) * 2;
    const rr = Math.sqrt(1 - y * y);
    const th = golden * i + 0.4;
    out.push([Math.cos(th) * rr, y, Math.sin(th) * rr]);
  }
  return out;
}

const sphere = (c, r) => [c[0], c[1], c[2], c[0], c[1], c[2], r];
const capsule = (a, b, r) => [a[0], a[1], a[2], b[0], b[1], b[2], r];
const scale3 = (v, s) => [v[0] * s, v[1] * s, v[2] * s];
const add3 = (u, v) => [u[0] + v[0], u[1] + v[1], u[2] + v[2]];

// ---------------------------------------------------------------- keyframes
// Each state: 8 lobes + scalar look parameters.
//   k      smooth-union radius (surface tension / how readily lobes fuse)
//   wave   amplitude of the large flowing surface waves
//   ripple amplitude of the fine surface ripples
//   iri    oil-slick iridescence strength
//   light  key/fill studio light level (rim lights stay on → emergence)

const DIRS = fibonacciDirs(7);

function seedState() {
  // Compact, softly lumpy drop — the opening and closing silhouette.
  const lobes = [capsule([0, 0.06, 0], [0, -0.06, 0], 0.72)];
  DIRS.forEach((d) => lobes.push(sphere(scale3(d, 0.28), 0.42)));
  return { lobes, k: 0.45, wave: 0.02, ripple: 0.004, iri: 0.18, light: 0.3 };
}

function awakenState() {
  // The mass expands and pushes out gentle bulges; ripples begin.
  const lobes = [capsule([0, 0.08, 0], [0, -0.08, 0], 0.78)];
  DIRS.forEach((d) => lobes.push(sphere(scale3(d, 0.55), 0.4)));
  return { lobes, k: 0.55, wave: 0.045, ripple: 0.012, iri: 0.25, light: 1.0 };
}

function ribbonState() {
  // Two long, tapering tendrils sweeping out of a shared core.
  const A = [[0.0, 0.0, 0.0], [-0.55, 0.36, 0.35], [-1.25, 0.62, 0.1], [-1.92, 0.44, -0.3], [-2.3, 0.0, -0.36]];
  const B = [[0.0, 0.0, 0.0], [0.6, -0.3, -0.36], [1.3, -0.6, -0.05], [1.92, -0.4, 0.36], [2.28, 0.06, 0.3]];
  const radii = [0.38, 0.28, 0.19, 0.12];
  const lobes = [];
  for (let i = 0; i < 4; i++) lobes.push(capsule(A[i], A[i + 1], radii[i]));
  for (let i = 0; i < 4; i++) lobes.push(capsule(B[i], B[i + 1], radii[i]));
  return { lobes, k: 0.42, wave: 0.03, ripple: 0.008, iri: 0.32, light: 1.0 };
}

// Four separate lobe centres that then fuse. Lobe pairs: (0,1)→C3, (2,3)→C1,
// (4,5)→C4, (6,7)→C2 so that every lobe travels a short, sensible path.
function pairState(centres, half, r) {
  const [C1, C2, C3, C4] = centres;
  const axis = [
    [0.7, 0.5, 0.2],
    [-0.6, 0.6, 0.3],
    [0.3, -0.4, 0.8],
    [0.8, 0.2, -0.5],
  ].map((v) => {
    const l = Math.hypot(...v);
    return scale3(v, half / l);
  });
  const pair = (c, e) => [capsule(add3(c, e), add3(c, scale3(e, -1)), r), sphere(add3(c, scale3(e, 0.4)), r * 0.82)];
  return [...pair(C3, axis[0]), ...pair(C1, axis[1]), ...pair(C4, axis[2]), ...pair(C2, axis[3])];
}

function lobesState() {
  const lobes = pairState(
    [[-1.0, 0.35, 0.25], [0.95, -0.35, -0.2], [-0.15, -0.78, 0.5], [0.25, 0.82, -0.45]],
    0.14,
    0.4,
  );
  return { lobes, k: 0.33, wave: 0.04, ripple: 0.01, iri: 0.4, light: 1.0 };
}

function fusedState() {
  const lobes = pairState(
    [[-0.42, 0.15, 0.1], [0.42, -0.12, -0.05], [-0.05, -0.38, 0.25], [0.08, 0.42, -0.2]],
    0.26,
    0.48,
  );
  return { lobes, k: 0.62, wave: 0.06, ripple: 0.014, iri: 0.55, light: 1.0 };
}

function iridescentState() {
  // Central mass wrapped by a tilted, flowing ring of lobes.
  const lobes = [sphere([0, 0, 0], 0.66)];
  const tilt = 0.45;
  const ring = (th) => {
    const x = Math.cos(th) * 0.66;
    const z = Math.sin(th) * 0.66;
    return [x, z * Math.sin(tilt), z * Math.cos(tilt)];
  };
  for (let i = 0; i < 7; i++) {
    const th = (TAU * i) / 7;
    lobes.push(capsule(ring(th), ring(th + 0.55), 0.29));
  }
  return { lobes, k: 0.5, wave: 0.075, ripple: 0.016, iri: 1.0, light: 1.0 };
}

function dropletState() {
  // Liquid sheds small, cleanly separated droplets around a smaller core.
  const rand = mulberry32(1337);
  const lobes = [sphere([0, 0, 0], 0.56)];
  DIRS.forEach((d) => {
    const dist = 1.25 + rand() * 0.45;
    const p = [d[0] * dist, d[1] * dist * 0.62, d[2] * dist];
    lobes.push(sphere(p, 0.12 + rand() * 0.09));
  });
  return { lobes, k: 0.22, wave: 0.012, ripple: 0.004, iri: 0.35, light: 0.75 };
}

// Scene markers follow the storyboard (A 0–3, B 3–6, C 6–9, D 9–12, E 12–15).
const KEYS = [
  { t: 0.0, state: seedState() }, //      A  emergence (dim, rim-lit)
  { t: 2.8, state: awakenState() }, //    A  expands, starts to ripple
  { t: 5.4, state: ribbonState() }, //    B  long curved tendrils
  { t: 7.1, state: lobesState() }, //     C  separate lobes gathering
  { t: 8.7, state: fusedState() }, //     C  fused sculptural mass
  { t: 11.0, state: iridescentState() }, // D iridescent flow
  { t: 13.3, state: dropletState() }, //  E  separation into droplets
  // t = 15 wraps to the seed state → seamless loop.
];

const SCALARS = ['k', 'wave', 'ripple', 'iri', 'light'];

function flatten(state) {
  const v = [];
  state.lobes.forEach((l) => v.push(...l));
  SCALARS.forEach((s) => v.push(state[s]));
  return v;
}

const KEY_TIMES = KEYS.map((k) => k.t);
const KEY_VALUES = KEYS.map((k) => flatten(k.state));
const TENSION = 0.75; // < 1 tames overshoot of the cardinal spline

function sampleSpline(t) {
  const P = TIMELINE.duration;
  const n = KEYS.length;
  t = ((t % P) + P) % P;
  let i = n - 1;
  for (let j = 0; j < n - 1; j++) {
    if (t >= KEY_TIMES[j] && t < KEY_TIMES[j + 1]) {
      i = j;
      break;
    }
  }
  const time = (k) => KEY_TIMES[((k % n) + n) % n] + Math.floor(k / n) * P;
  const val = (k) => KEY_VALUES[((k % n) + n) % n];
  const t0 = time(i);
  const t1 = time(i + 1);
  const dt = t1 - t0;
  const s = (t - t0) / dt;
  const s2 = s * s;
  const s3 = s2 * s;
  const h00 = 2 * s3 - 3 * s2 + 1;
  const h10 = s3 - 2 * s2 + s;
  const h01 = -2 * s3 + 3 * s2;
  const h11 = s3 - s2;
  const vPrev = val(i - 1), v0 = val(i), v1 = val(i + 1), vNext = val(i + 2);
  const dPrev = time(i + 1) - time(i - 1);
  const dNext = time(i + 2) - time(i);
  const out = new Array(v0.length);
  for (let c = 0; c < v0.length; c++) {
    const m0 = (TENSION * (v1[c] - vPrev[c])) / dPrev;
    const m1 = (TENSION * (vNext[c] - v0[c])) / dNext;
    out[c] = h00 * v0[c] + h10 * dt * m0 + h01 * v1[c] + h11 * dt * m1;
  }
  return out;
}

// Small per-lobe secondary motion with integer harmonics (loop-safe).
const WOBBLE = (() => {
  const rand = mulberry32(2024);
  return Array.from({ length: LOBE_COUNT }, () => ({
    k: [1 + Math.floor(rand() * 3), 1 + Math.floor(rand() * 3), 1 + Math.floor(rand() * 3)],
    ph: [rand() * TAU, rand() * TAU, rand() * TAU],
  }));
})();

function rotationMatrix(yaw, pitch, roll) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const cr = Math.cos(roll), sr = Math.sin(roll);
  // Row-major 3x3 matrices; R = Ry * Rx * Rz.
  const Ry = [cy, 0, sy, 0, 1, 0, -sy, 0, cy];
  const Rx = [1, 0, 0, 0, cp, -sp, 0, sp, cp];
  const Rz = [cr, -sr, 0, sr, cr, 0, 0, 0, 1];
  const mul = (A, B) => {
    const C = new Array(9).fill(0);
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3; c++)
        for (let k = 0; k < 3; k++) C[r * 3 + c] += A[r * 3 + k] * B[k * 3 + c];
    return C;
  };
  const R = mul(mul(Ry, Rx), Rz);
  // Column-major for GLSL mat3 (object → world rotation).
  return [R[0], R[3], R[6], R[1], R[4], R[7], R[2], R[5], R[8]];
}

// ---------------------------------------------------------------- public API

/**
 * Full scene state at loop time t (seconds). Pure and deterministic.
 */
export function sceneAt(t) {
  const P = TIMELINE.duration;
  const tt = ((t % P) + P) % P;
  const phase = tt / P; // 0..1
  const v = sampleSpline(tt);

  const lobesA = new Float32Array(LOBE_COUNT * 4); // xyz + radius
  const lobesB = new Float32Array(LOBE_COUNT * 4); // xyz + unused
  let bound = 0;
  for (let i = 0; i < LOBE_COUNT; i++) {
    const o = i * 7;
    const w = WOBBLE[i];
    const off = [0, 1, 2].map((a) => 0.035 * Math.sin(TAU * w.k[a] * phase + w.ph[a]));
    const r = Math.max(0, v[o + 6]);
    for (let a = 0; a < 3; a++) {
      lobesA[i * 4 + a] = v[o + a] + off[a];
      lobesB[i * 4 + a] = v[o + 3 + a] + off[a];
    }
    lobesA[i * 4 + 3] = r;
    lobesB[i * 4 + 3] = 0;
    bound = Math.max(
      bound,
      Math.hypot(lobesA[i * 4], lobesA[i * 4 + 1], lobesA[i * 4 + 2]) + r,
      Math.hypot(lobesB[i * 4], lobesB[i * 4 + 1], lobesB[i * 4 + 2]) + r,
    );
  }
  const base = LOBE_COUNT * 7;
  const [k, wave, ripple, iri, light] = SCALARS.map((_, j) => v[base + j]);
  const blend = Math.max(0.05, k);
  bound += blend * 0.25 + wave * 2 + ripple * 2 + 0.12;

  // Object rotation: slow, periodic sway (integer harmonics of the loop).
  const yaw = 0.55 * Math.sin(TAU * phase) + 0.22 * Math.sin(2 * TAU * phase + 0.7);
  const pitch = 0.14 * Math.sin(TAU * phase + 1.3);
  const roll = 0.08 * Math.sin(2 * TAU * phase + 2.1);

  // Camera: gentle orbit and dolly, again strictly periodic.
  const az = 0.16 * Math.sin(TAU * phase + 0.4);
  const el = 0.09 + 0.04 * Math.sin(2 * TAU * phase + 0.9);
  const dist = CAMERA.distance + 0.22 * Math.cos(TAU * phase);
  const camPos = [dist * Math.sin(az) * Math.cos(el), dist * Math.sin(el), dist * Math.cos(az) * Math.cos(el)];

  return {
    time: tt,
    phase,
    lobesA,
    lobesB,
    blend,
    wave: Math.max(0, wave),
    ripple: Math.max(0, ripple),
    iri: Math.min(1, Math.max(0, iri)),
    light: Math.min(1.2, Math.max(0, light)),
    rot: rotationMatrix(yaw, pitch, roll),
    camPos,
    camTarget: [0, 0, 0],
    fov: CAMERA.fov,
    bound,
  };
}

export function frameTime(frame) {
  return frame / TIMELINE.fps;
}

export const SCENE_MARKERS = [
  { t: 0, name: 'A · Liquid Emergence' },
  { t: 3, name: 'B · Organic Transformation' },
  { t: 6, name: 'C · Metallic Fusion' },
  { t: 9, name: 'D · Iridescent Flow' },
  { t: 12, name: 'E · Separation & Resolution' },
];
