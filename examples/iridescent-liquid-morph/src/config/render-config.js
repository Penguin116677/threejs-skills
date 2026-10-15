// Render configuration: video spec + quality presets.
// Everything that decides "how big / how detailed" lives here, nothing else does.

export const VIDEO = Object.freeze({
  width: 1920,
  height: 1080,
  fps: 30,
  duration: 15, // seconds — one full, seamless loop
  get frames() { return this.fps * this.duration; }, // 450 frames: 0..449 (frame 450 == frame 0)
});

export const ASPECT = VIDEO.width / VIDEO.height; // 16:9, enforced in preview via letterboxing

// segU/segV  : grid resolution of each ribbon (along length / around cross-section)
// ribbons    : how many ribbons are drawn (1 = hero only)
// maxDpr     : cap for devicePixelRatio in preview
// antialias  : MSAA on the default framebuffer (decided at context creation)
// octaves    : noise octaves in the vertex shader (1 or 2)
// dualLobe   : 1 = sharp + soft environment lookups (nicer liquid sheen, 2x env cost)
export const QUALITY = Object.freeze({
  low: { label: 'Low (Android hemat)', segU: 320, segV: 36, ribbons: 1, maxDpr: 1.0, antialias: false, octaves: 1, dualLobe: 0 },
  medium: { label: 'Medium', segU: 560, segV: 56, ribbons: 2, maxDpr: 1.5, antialias: true, octaves: 1, dualLobe: 1 },
  high: { label: 'High', segU: 900, segV: 84, ribbons: 2, maxDpr: 2.0, antialias: true, octaves: 2, dualLobe: 1 },
});

export const DEFAULT_QUALITY = 'medium';

export function readParams(search = window.location.search) {
  const q = new URLSearchParams(search);
  const num = (k, d) => (q.has(k) && Number.isFinite(+q.get(k)) ? +q.get(k) : d);
  const quality = QUALITY[q.get('q')] ? q.get('q') : DEFAULT_QUALITY;
  return {
    quality,
    preset: QUALITY[quality],
    mode: q.get('mode') === 'capture' ? 'capture' : 'preview',
    time: num('t', null), // ?t=7.5  -> open paused on that timestamp
    frame: num('frame', null), // ?frame=120
    width: Math.round(num('w', VIDEO.width)),
    height: Math.round(num('h', VIDEO.height)),
    ssaa: Math.min(Math.max(Math.round(num('ssaa', 1)), 1), 2), // 1 or 2 (supersampling for export)
    ui: q.get('ui') !== '0',
  };
}
