import { TAU, lerp, smootherstep, window, v3 } from './math.js';

// The piece is authored on a 15-second "story" clock. Real time is mapped onto
// it (story = t * 15 / duration) so changing the duration rescales the whole
// choreography while keeping every periodic component an integer number of
// cycles per loop — which is what makes frame N identical to frame 0.
export const STORY = 15;

export const FOCAL_POINT = [5.0, 0.4, -1.0];

// Global envelopes evaluated once per frame on the CPU and sent as uniforms.
export function envelopes(s) {
  return {
    // 0–3 s: seeds brighten from near-darkness; 13–15 s: return to it.
    seed: lerp(0.32, 1.0, window(s, 0.0, 2.6, 12.9, 15.0)),
    // Overall energy of the network (feeds node/edge brightness and haze).
    energy: window(s, 0.5, 6.5, 12.9, 15.0),
    // 7–11 s: violet/magenta energy in the focal area.
    focal: window(s, 6.4, 7.8, 10.6, 12.2),
    // 11–14 s: longer light trails behind travelling particles.
    trail: window(s, 9.8, 11.4, 13.0, 14.3),
  };
}

// Camera path. Two parts:
//   - a push-in envelope (zero velocity at both ends of the loop, C2-smooth),
//   - a low-amplitude orbit made of integer harmonics of the loop period.
// Both are exactly periodic, so position and velocity match at the loop seam.
export function cameraState(s, motion = 1) {
  const th = (TAU * s) / STORY;
  const push = smootherstep(2.6, 10.4, s) * (1 - smootherstep(11.2, 15.0, s)) * motion;

  const farPos = [-0.6, 0.9, 29.0];
  const nearPos = [2.4, 0.3, 17.0];
  const farTarget = [2.2, 0.1, 0.0];
  const nearTarget = [3.4, 0.4, -2.0];

  const orbit = [1.7 * Math.sin(th), 0.75 * Math.sin(th + 0.9), 0.9 * Math.sin(2 * th)];
  const sway = [0.55 * Math.sin(th + 1.3), 0.3 * Math.cos(th), 0];

  const position = v3.add(v3.lerp(farPos, nearPos, push), v3.scale(orbit, motion));
  const target = v3.add(v3.lerp(farTarget, nearTarget, push), v3.scale(sway, motion));
  const roll = 0.012 * Math.sin(th + 0.4) * motion;
  const focus = v3.dist(position, FOCAL_POINT);
  return { position, target, roll, focus, push };
}
