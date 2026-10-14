import * as THREE from 'three';

/*
 * Time-of-day keyframes. `timeOfDay` runs 0 → 1:
 *   0.00 day · 0.28 golden hour · 0.50 dusk · 0.74 blue hour · 1.00 night
 * Colors are authored as sRGB hex and lerped in linear space.
 */
const KEYS = [
  {
    t: 0,
    zenith: '#3f86d8', mid: '#86bfe9', horizon: '#cfe7f4', glow: '#fff3d9',
    fog: '#c8e1ef', sun: '#fff2dc', sunIntensity: 2.4, ambient: '#a9cbe6', ground: '#4f6d34',
    grassBase: '#163d10', grassTip: '#8fc24c', grassDry: '#bcc45c', terrain: '#24481a',
    trailGlow: '#e9ffd0', trailGlowAmt: 0.16,
    cloudLit: '#fbfcff', cloudShade: '#b4c4da', cloudOpacity: 0.95,
    leaf: '#4f8f30', leafShade: '#163a14', bark: '#4a3a2c', rim: '#e8f4ff', rimAmt: 0.2,
    sunVis: 1, moonVis: 0, stars: 0, flowers: 0, fireflies: 0,
    exposure: 1.0, bloom: 0.22, fogDensity: 0.0085, wind: 0.55,
    ui: { title: '#11210d', sub: '#24361f', nav: '#11210d', muted: '#4c5d47', btnBg: '#1f4d1a', btnText: '#ffffff', glass: '#ffffff', glassText: '#11210d', leaf: '#3f8f2a', hint: '#ffffff', shadow: 0 }
  },
  {
    t: 0.28,
    zenith: '#4d84c9', mid: '#a7b9d4', horizon: '#ffd9ae', glow: '#ffc788',
    fog: '#efd4b6', sun: '#ffd49c', sunIntensity: 2.2, ambient: '#b7b6c4', ground: '#5a5a30',
    grassBase: '#1d3a10', grassTip: '#b7c955', grassDry: '#e0b85c', terrain: '#40621f',
    trailGlow: '#fff2c8', trailGlowAmt: 0.12,
    cloudLit: '#fff1dd', cloudShade: '#c2a7b2', cloudOpacity: 0.95,
    leaf: '#4a6e26', leafShade: '#1f2f14', bark: '#4a342a', rim: '#ffd59a', rimAmt: 0.6,
    sunVis: 1, moonVis: 0, stars: 0, flowers: 0.15, fireflies: 0,
    exposure: 1.0, bloom: 0.3, fogDensity: 0.0085, wind: 0.5,
    ui: { title: '#1b170d', sub: '#3a2c1d', nav: '#1b170d', muted: '#5e4d3c', btnBg: '#2a4a17', btnText: '#ffffff', glass: '#fff6ea', glassText: '#1b170d', leaf: '#4f8f2a', hint: '#ffffff', shadow: 0 }
  },
  {
    t: 0.5,
    zenith: '#6a3a8e', mid: '#e46a9a', horizon: '#ffa36a', glow: '#ffb46e',
    fog: '#e48a86', sun: '#ffb27a', sunIntensity: 1.3, ambient: '#86587a', ground: '#3a2420',
    grassBase: '#1a0f12', grassTip: '#6a4a36', grassDry: '#8a5a3a', terrain: '#2a1a1c',
    trailGlow: '#ffd6b8', trailGlowAmt: 0.18,
    cloudLit: '#ffb48c', cloudShade: '#a8537a', cloudOpacity: 0.92,
    leaf: '#22101a', leafShade: '#0e050a', bark: '#140a10', rim: '#ff9a72', rimAmt: 0.6,
    sunVis: 1, moonVis: 0.0, stars: 0.0, flowers: 0.9, fireflies: 0.05,
    exposure: 1.02, bloom: 0.4, fogDensity: 0.0095, wind: 0.42,
    ui: { title: '#ffffff', sub: '#fff1ec', nav: '#ffffff', muted: '#ffe1da', btnBg: '#fff6ef', btnText: '#3b1a2a', glass: '#fff0ea', glassText: '#3b1a2a', leaf: '#ffd27a', hint: '#ffffff', shadow: 0.18 }
  },
  {
    t: 0.74,
    zenith: '#141a4a', mid: '#3a3b78', horizon: '#9a5a86', glow: '#c0708a',
    fog: '#4a3f72', sun: '#d88a9a', sunIntensity: 0.7, ambient: '#4a4f86', ground: '#1a1a2a',
    grassBase: '#06110f', grassTip: '#2f5a50', grassDry: '#3e5658', terrain: '#0e1c1d',
    trailGlow: '#a8ffd8', trailGlowAmt: 0.45,
    cloudLit: '#5a5c94', cloudShade: '#22244a', cloudOpacity: 0.7,
    leaf: '#141d2c', leafShade: '#070b14', bark: '#0d0f18', rim: '#9a8acc', rimAmt: 0.55,
    sunVis: 0.2, moonVis: 0.6, stars: 0.5, flowers: 0.5, fireflies: 0.6,
    exposure: 1.06, bloom: 0.5, fogDensity: 0.011, wind: 0.35,
    ui: { title: '#ffffff', sub: '#e8e8ff', nav: '#ffffff', muted: '#c9c9ee', btnBg: '#f2f2ff', btnText: '#151a40', glass: '#e6e8ff', glassText: '#151a40', leaf: '#b6f07a', hint: '#ffffff', shadow: 0.2 }
  },
  {
    t: 1,
    zenith: '#050a22', mid: '#0c1940', horizon: '#1f3466', glow: '#4a6aa8',
    fog: '#14244a', sun: '#b4c8ff', sunIntensity: 0.75, ambient: '#3a5288', ground: '#0a1424',
    grassBase: '#04100f', grassTip: '#2c6660', grassDry: '#36606a', terrain: '#0a1d1e',
    trailGlow: '#9cffc4', trailGlowAmt: 0.6,
    cloudLit: '#30467a', cloudShade: '#101a36', cloudOpacity: 0.55,
    leaf: '#0f2230', leafShade: '#050c14', bark: '#0a0f18', rim: '#7d9ee0', rimAmt: 0.6,
    sunVis: 0, moonVis: 1, stars: 1, flowers: 0.3, fireflies: 1,
    exposure: 1.1, bloom: 0.6, fogDensity: 0.01, wind: 0.3,
    ui: { title: '#ffffff', sub: '#dfe7ff', nav: '#ffffff', muted: '#aab8dd', btnBg: '#eef2ff', btnText: '#0b1433', glass: '#dbe4ff', glassText: '#0b1433', leaf: '#c4f27a', hint: '#ffffff', shadow: 0.25 }
  }
];

const COLOR_KEYS = Object.keys(KEYS[0]).filter((k) => typeof KEYS[0][k] === 'string');
const NUM_KEYS = Object.keys(KEYS[0]).filter((k) => typeof KEYS[0][k] === 'number' && k !== 't');
const UI_COLOR_KEYS = Object.keys(KEYS[0].ui).filter((k) => typeof KEYS[0].ui[k] === 'string');

// Pre-parse every keyframe into linear THREE.Colors once.
const PARSED = KEYS.map((k) => {
  const out = { t: k.t, ui: {} };
  for (const c of COLOR_KEYS) out[c] = new THREE.Color(k[c]);
  for (const n of NUM_KEYS) out[n] = k[n];
  for (const c of UI_COLOR_KEYS) out.ui[c] = new THREE.Color(k.ui[c]);
  out.ui.shadow = k.ui.shadow;
  return out;
});

/** Live palette object, mutated in place by `samplePalette`. */
export const palette = (() => {
  const p = { ui: {} };
  for (const c of COLOR_KEYS) p[c] = new THREE.Color();
  for (const n of NUM_KEYS) p[n] = 0;
  for (const c of UI_COLOR_KEYS) p.ui[c] = new THREE.Color();
  p.ui.shadow = 0;
  p.sunDir = new THREE.Vector3();
  p.moonDir = new THREE.Vector3();
  p.lightDir = new THREE.Vector3();
  p.lightColor = new THREE.Color();
  return p;
})();

const smooth = (x) => x * x * (3 - 2 * x);

function dirFromAngles(azimuthDeg, elevationDeg, target) {
  const az = THREE.MathUtils.degToRad(azimuthDeg);
  const el = THREE.MathUtils.degToRad(elevationDeg);
  return target.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
}

// The moon hangs to the right of the tree; on narrow screens it tucks in closer.
export function setMoonAzimuth(halfFovDeg) {
  dirFromAngles(Math.min(17, halfFovDeg * 0.62), 17.5, palette.moonDir);
}
setMoonAzimuth(30);

/** Fill `palette` for a given timeOfDay in [0, 1]. */
export function samplePalette(time) {
  const t = THREE.MathUtils.clamp(time, 0, 1);
  let i = 0;
  while (i < PARSED.length - 2 && t > PARSED[i + 1].t) i++;
  const a = PARSED[i];
  const b = PARSED[i + 1];
  const f = smooth(THREE.MathUtils.clamp((t - a.t) / (b.t - a.t), 0, 1));

  for (const c of COLOR_KEYS) palette[c].copy(a[c]).lerp(b[c], f);
  for (const n of NUM_KEYS) palette[n] = a[n] + (b[n] - a[n]) * f;
  for (const c of UI_COLOR_KEYS) palette.ui[c].copy(a.ui[c]).lerp(b.ui[c], f);
  palette.ui.shadow = a.ui.shadow + (b.ui.shadow - a.ui.shadow) * f;

  // Sun: high upper-left at noon, sinking to the horizon left of the tree at dusk.
  const s = smooth(THREE.MathUtils.clamp(t / 0.7, 0, 1));
  const elevation = THREE.MathUtils.lerp(46, -9, s) + (t > 0.7 ? -(t - 0.7) * 20 : 0);
  const azimuth = THREE.MathUtils.lerp(-58, -24, s);
  dirFromAngles(azimuth, elevation, palette.sunDir);

  // Key light follows the sun, then hands over to the moon.
  const night = smooth(THREE.MathUtils.clamp((t - 0.55) / 0.35, 0, 1));
  const sunKey = palette.sunDir.clone();
  sunKey.y = Math.max(sunKey.y, 0.06);
  palette.lightDir.copy(sunKey.normalize()).lerp(palette.moonDir, night).normalize();
  palette.lightColor.copy(palette.sun).multiplyScalar(palette.sunIntensity);
  return palette;
}
