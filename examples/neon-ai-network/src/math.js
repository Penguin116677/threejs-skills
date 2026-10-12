// Deterministic helpers. Nothing in the animation path may use Math.random or
// wall-clock time: every value is a pure function of (seed, story time).

export const TAU = Math.PI * 2;

// mulberry32 — small, fast, seedable PRNG.
export function createRng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng = {
    next,
    range: (lo, hi) => lo + (hi - lo) * next(),
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    gauss: () => {
      const u = Math.max(next(), 1e-9);
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * next());
    },
  };
  return rng;
}

export const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
export const lerp = (a, b, t) => a + (b - a) * t;

// Quintic smoothstep (C2): zero velocity and acceleration at both ends,
// so envelopes built from it meet seamlessly at the loop point.
export function smootherstep(e0, e1, x) {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

// Rises over [a0,a1], falls over [b0,b1].
export const window = (t, a0, a1, b0, b1) => smootherstep(a0, a1, t) * (1 - smootherstep(b0, b1, t));

export const v3 = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  scale: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  lerp: (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)],
  dist: (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]),
};

export function bezier3(p0, p1, p2, p3, t) {
  const u = 1 - t;
  const w0 = u * u * u, w1 = 3 * u * u * t, w2 = 3 * u * t * t, w3 = t * t * t;
  return [0, 1, 2].map((i) => w0 * p0[i] + w1 * p1[i] + w2 * p2[i] + w3 * p3[i]);
}
