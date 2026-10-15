// Deterministic, loop-safe time.
//
// RULE for every animated value in this project:
//   value = f(phase) where phase = 2π · t / DURATION, built ONLY from
//   sin/cos of INTEGER multiples of phase (or the (cos φ, sin φ) circle used
//   to drive noise). Then t = 0 and t = DURATION are mathematically identical,
//   so the last frame flows into the first one with no seam.
// Never use performance.now(), Math.random() or frame deltas inside the look.

import { VIDEO } from '../config/render-config.js';

export const TAU = Math.PI * 2;

export function wrapTime(t) {
  const d = VIDEO.duration;
  return ((t % d) + d) % d;
}

export function frameToTime(n) {
  return n / VIDEO.fps;
}

export function timeToFrame(t) {
  return Math.round(wrapTime(t) * VIDEO.fps) % VIDEO.frames;
}

// Everything the scene needs for one instant.
export function sampleTimeline(t) {
  const tw = wrapTime(t);
  const phase = (TAU * tw) / VIDEO.duration;
  return {
    t: tw,
    phase,
    loopCos: Math.cos(phase),
    loopSin: Math.sin(phase),
    frameIndex: Math.floor(tw * VIDEO.fps + 1e-6) % VIDEO.frames, // seeds grain/dither deterministically
  };
}

// Periodic helper: sum of harmonics a_k·sin(k·φ + p_k), k must be an integer.
export function harmonic(phase, terms) {
  let v = 0;
  for (const [k, amp, ph] of terms) v += amp * Math.sin(k * phase + ph);
  return v;
}
