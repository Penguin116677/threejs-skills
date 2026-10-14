/**
 * Easing toolkit. One signature curve family (Premium / Calm):
 * entrances decelerate, exits accelerate, on-screen moves ease both ends.
 */
export function cubicBezier(x1, y1, x2, y2) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sx = (t) => ((ax * t + bx) * t + cx) * t;
  const sy = (t) => ((ay * t + by) * t + cy) * t;
  const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 6; i++) {
      const err = sx(t) - x;
      const d = dx(t);
      if (Math.abs(err) < 1e-5 || Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    return sy(Math.min(1, Math.max(0, t)));
  };
}

export const ease = {
  /** Signature curve for on-screen moves. */
  standard: cubicBezier(0.4, 0, 0.2, 1),
  /** Entrances: fast start, long gentle landing. */
  enter: cubicBezier(0.05, 0.7, 0.1, 1),
  /** Exits: gentle start, quick departure. */
  exit: cubicBezier(0.3, 0, 1, 1),
  /** Slow environmental change (light, camera): sine in-out. */
  sine: (t) => 0.5 - 0.5 * Math.cos(Math.PI * clamp01(t))
};

export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const lerp = (a, b, t) => a + (b - a) * t;

/** Normalized progress of t through [start, start + duration]. */
export const progress = (t, start, duration) => clamp01((t - start) / duration);
