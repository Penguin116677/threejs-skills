// Central, serialisable configuration. Every value can be overridden through
// URL query parameters (preview + renderer share the same parser), so a look
// tuned in the preview can be handed verbatim to the native-resolution render.

export const DEFAULT_CONFIG = {
  seed: 1729,

  // Output
  width: 3840,
  height: 2160,
  fps: 30,
  duration: 15, // seconds — the whole story is authored on a 15 s timeline and scaled to this

  // Palette (sRGB hex; converted to linear for shading)
  colors: {
    cyan: '#22e4ff',
    violet: '#7b46ff',
    magenta: '#ff3fd2',
    navy: '#0a1a3c',
    black: '#010207',
  },

  density: 1.0, // scales node, dust and pulse counts (rebuilds the network)
  glow: 1.0, // emissive intensity multiplier
  bloom: 0.5, // bloom strength
  bloomRadius: 0.4,
  exposure: 1.0,
  camera: 1.0, // camera-motion amplitude (0 = locked off)
  dof: 1.0, // depth-of-field / bokeh strength
  copySpace: 0.55, // darkening of the left title-safe region (0 = off)
};

const NUMERIC = ['seed', 'width', 'height', 'fps', 'duration', 'density', 'glow', 'bloom', 'bloomRadius', 'exposure', 'camera', 'dof', 'copySpace'];
const ALIASES = { w: 'width', h: 'height', copy: 'copySpace' };

export function parseConfig(search = '') {
  const cfg = structuredClone(DEFAULT_CONFIG);
  const params = new URLSearchParams(search);
  for (const [rawKey, value] of params) {
    const key = ALIASES[rawKey] || rawKey;
    if (NUMERIC.includes(key)) {
      const n = Number(value);
      if (Number.isFinite(n)) cfg[key] = n;
    } else if (key in cfg.colors) {
      cfg.colors[key] = value.startsWith('#') ? value : `#${value}`;
    }
  }
  cfg.width = Math.max(16, Math.round(cfg.width));
  cfg.height = Math.max(16, Math.round(cfg.height));
  cfg.density = Math.min(3, Math.max(0.2, cfg.density));
  return cfg;
}

// Serialises only the values that differ from the defaults.
export function configToQuery(cfg) {
  const params = new URLSearchParams();
  for (const key of NUMERIC) if (cfg[key] !== DEFAULT_CONFIG[key]) params.set(key, String(cfg[key]));
  for (const key of Object.keys(DEFAULT_CONFIG.colors)) {
    if (cfg.colors[key].toLowerCase() !== DEFAULT_CONFIG.colors[key]) params.set(key, cfg.colors[key].replace('#', ''));
  }
  return params.toString();
}

export function totalFrames(cfg) {
  return Math.round(cfg.duration * cfg.fps);
}
