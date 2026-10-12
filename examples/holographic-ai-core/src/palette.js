// Palette defined in sRGB hex; THREE.Color converts to linear working space.
// A single hue rotation re-tints the whole holographic palette consistently.
const BASE = {
  cyan: '#2fd8ff',
  ice: '#9fd8ff',
  violet: '#8a6bff',
  silver: '#dfe9ff',
  glassTint: '#5c86a8', // transmission through the glass (multiplier)
  navyDeep: '#02040b',
  navy: '#07112a',
};

export function buildPalette(THREE, hueDeg = 0) {
  const out = {};
  for (const [k, hex] of Object.entries(BASE)) {
    const c = new THREE.Color(hex);
    if (hueDeg && k !== 'glassTint' && !k.startsWith('navy')) c.offsetHSL(hueDeg / 360, 0, 0);
    if (hueDeg && k.startsWith('navy')) c.offsetHSL((hueDeg * 0.5) / 360, 0, 0);
    out[k] = c;
  }
  return out;
}
