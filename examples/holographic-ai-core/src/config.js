// Default parameters, presets and URL-parameter parsing.
//
// Periodicity contract: every speed that is expressed in "turns per loop" is an
// integer. Integer turns guarantee that the state at t = loopDuration is
// identical to t = 0, which is what makes the loop seamless. Non-integer
// values are rounded (and reported) rather than silently breaking the loop.

export const DEFAULTS = {
  seed: 7,
  mode: 'loop', // 'loop' (seamless, periodic) | 'story' (16 s build-up from darkness)
  loopDuration: 16, // seconds; story timings scale proportionally
  fps: 30,

  // Speeds (integer turns per loop)
  ringSpeed: 1, // multiplier applied to each ring's base turns-per-loop
  coreRotation: 1, // nucleus turns per loop
  particleSpeed: 1, // multiplier on orbital particle turns-per-loop

  // Amplitudes / intensities (continuous)
  ringEasing: 1, // amplitude of the periodic speed variation on rings
  particleCount: 1, // multiplier on the default particle budget (~3200)
  particleDrift: 1, // amplitude of particle bob / ambient drift
  glowIntensity: 1, // bloom strength + halo multiplier
  exposure: 1,
  hue: 0, // degrees of hue rotation applied to the whole holographic palette
  cameraMotion: 1, // amplitude of loop drift and of the story dolly
  backgroundDarkness: 0.6, // 0 = lighter navy, 1 = near black
  pulseStrength: 1,

  // Composition
  composition: 'right', // 'right' | 'left' | 'center' (where the core sits)
  framing: 1, // >1 pulls the camera back (more negative space)
  cameraAzimuth: 18, // degrees
  cameraElevation: 9, // degrees
  ringCount: 5, // 1..6
};

export const PRESETS = {
  default: {},
  'hero-left': { composition: 'left', cameraAzimuth: -20 },
  'centered-wide': { composition: 'center', framing: 1.25, cameraElevation: 14 },
  'macro-close': { composition: 'center', framing: 0.72, cameraElevation: 4, cameraAzimuth: 32, particleCount: 0.8 },
  'violet-shift': { hue: 38, cameraAzimuth: -8, composition: 'left' },
  'ice-minimal': { hue: -12, ringCount: 3, particleCount: 0.55, glowIntensity: 0.8, backgroundDarkness: 0.85 },
  'energetic': { ringSpeed: 2, particleSpeed: 2, coreRotation: 2, pulseStrength: 1.35, glowIntensity: 1.15 },
};

const INTEGER_KEYS = ['ringSpeed', 'coreRotation', 'particleSpeed', 'ringCount', 'seed', 'fps'];

export function resolveConfig(overrides = {}) {
  const preset = PRESETS[overrides.preset] || {};
  const cfg = { ...DEFAULTS, ...preset, ...overrides };
  const warnings = [];
  for (const k of INTEGER_KEYS) {
    const v = Number(cfg[k]);
    if (!Number.isInteger(v)) {
      warnings.push(`${k}=${cfg[k]} rounded to ${Math.round(v)} to keep the animation periodic`);
    }
    cfg[k] = Math.round(v);
  }
  cfg.ringCount = Math.min(6, Math.max(1, cfg.ringCount));
  cfg.backgroundDarkness = Math.min(1, Math.max(0, Number(cfg.backgroundDarkness)));
  for (const k of Object.keys(DEFAULTS)) {
    if (typeof DEFAULTS[k] === 'number') cfg[k] = Number(cfg[k]);
  }
  cfg.warnings = warnings;
  return cfg;
}

export function configFromURL(search = location.search) {
  const p = new URLSearchParams(search);
  const o = {};
  for (const [k, v] of p) o[k] = v;
  return o;
}
