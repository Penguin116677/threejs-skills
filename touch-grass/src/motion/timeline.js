import * as THREE from 'three';
import { ease, lerp, progress, clamp01 } from './easing.js';

/**
 * "touch grass" — a 20 second loop, told in four acts.
 *
 *   0.0 – 4.5   Setup       Fade up from black; the camera rises out of the
 *                           grass. Title arrives, letter by letter.
 *   3.6 – 7.0   Action      An unseen hand brushes the grass; a gust answers.
 *                           The title steps back out of the way.
 *   7.0 – 16.2  Transition  Day melts into dusk (flowers open), dusk into
 *                           night (moon, fireflies). A second, glowing brush.
 *  16.2 – 20.0  Resolution  End card, a breath of stillness, fade to black.
 */
export const DURATION = 20;

export const BEATS = {
  fadeIn: [0, 1.6],
  rise: [0, 4.6],
  title: { in: 1.1, out: 6.1 },
  sub: { in: 1.75, out: 5.95 },
  brushDay: [3.6, 2.6],
  gust: [4.4, 3.2],
  toDusk: [7.0, 4.8],
  toNight: [12.2, 4.2],
  clock: { in: 7.2, out: 16.0 },
  brushNight: [13.4, 2.6],
  endTitle: { in: 16.3 },
  endSub: { in: 16.95 },
  fadeOut: [19.0, 1.0]
};

// Brush strokes are authored in screen space (NDC) and projected onto the hill.
const strokeDay = new THREE.CatmullRomCurve3(
  [
    [-1.1, -0.86],
    [-0.55, -0.62],
    [0.0, -0.74],
    [0.5, -0.56],
    [1.1, -0.7]
  ].map(([x, y]) => new THREE.Vector3(x, y, 0))
);
const strokeNight = new THREE.CatmullRomCurve3(
  [
    [1.1, -0.6],
    [0.55, -0.78],
    [0.05, -0.58],
    [-0.45, -0.72],
    [-1.1, -0.54]
  ].map(([x, y]) => new THREE.Vector3(x, y, 0))
);
const tmp = new THREE.Vector3();

function stroke(t, [start, dur], curve, out) {
  if (t < start || t > start + dur) return null;
  const p = ease.standard(progress(t, start, dur));
  curve.getPoint(p, tmp);
  return out.set(tmp.x, tmp.y);
}

/** Sample every continuous parameter of the film at time t (seconds). */
export function sampleTimeline(t, out) {
  // Light: hold day, ease into dusk, linger, ease into night.
  const dusk = ease.sine(progress(t, ...BEATS.toDusk));
  const night = ease.sine(progress(t, ...BEATS.toNight));
  out.timeOfDay = lerp(0, 0.5, dusk) + lerp(0, 0.5, night);

  // Camera: rises out of the grass, then a long, slow push toward the tree
  // drifting left → right (the tree parallaxes gently against the sky).
  const rise = ease.enter(progress(t, ...BEATS.rise));
  const push = ease.sine(t / DURATION);
  out.eye.set(lerp(-0.55, 0.55, push), lerp(0.3, 0.62, rise) + Math.sin(t * 0.45) * 0.012, lerp(0, -3.2, push));
  out.look.set(lerp(-0.2, 0.25, push), lerp(7.2, 8.1, rise) + lerp(0, 0.5, night), 0);

  // Wind: a gust rolls across after the first brush (reaction beat).
  const g = progress(t, ...BEATS.gust);
  out.gust = Math.sin(Math.PI * g) ** 2 * 0.7;

  out.brush = stroke(t, BEATS.brushDay, strokeDay, out.brushNdc) || stroke(t, BEATS.brushNight, strokeNight, out.brushNdc);

  // Global fade: up from black, back down at the end (seamless loop).
  out.fade = (1 - ease.standard(progress(t, ...BEATS.fadeIn))) + ease.exit(progress(t, ...BEATS.fadeOut));
  out.fade = clamp01(out.fade);
  return out;
}

export function createTimelineState() {
  return {
    timeOfDay: 0,
    eye: new THREE.Vector3(),
    look: new THREE.Vector3(),
    gust: 0,
    brush: null,
    brushNdc: new THREE.Vector2(),
    fade: 1
  };
}
