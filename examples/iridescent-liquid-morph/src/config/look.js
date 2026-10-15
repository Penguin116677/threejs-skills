// Art direction: shapes, placement, palette. Tweak here, not in the shaders.
// Positions are in world units; the camera looks at roughly (0, 0, 0) from z ≈ 10.

export const RIBBONS = [
  {
    name: 'hero',
    seed: 0.0,
    length: 3.4, // half length
    width: 0.95, // half width
    thickness: 0.075,
    twist: 0.6,
    waveAmp: 1.0,
    ripple: 0.35,
    noiseFreq: 1.4,
    loopRadius: 0.55,
    brightness: 1.0,
    detail: 1.0, // fraction of the preset's grid resolution
    position: [0.9, -0.25, 0.0],
    rotation: [0.25, -0.35, 0.18],
  },
  {
    name: 'echo',
    seed: 2.3,
    length: 3.8,
    width: 0.42,
    thickness: 0.05,
    twist: -0.8,
    waveAmp: 0.8,
    ripple: 0.5,
    noiseFreq: 1.8,
    loopRadius: 0.6,
    brightness: 0.55,
    detail: 0.6,
    position: [1.4, 0.4, -2.2],
    rotation: [-0.2, 0.3, -0.25],
  },
];

export const SHADING = {
  exposure: 1.0,
  iridescence: 0.65,
  filmScale: 1.3,
  fogColor: [0.004, 0.006, 0.016], // linear
  fogNear: 8.0,
  fogFar: 15.0,
  fogAmount: 0.6,
};

export const BACKGROUND = {
  top: [0.043, 0.071, 0.16], // sRGB, dark navy
  bottom: [0.006, 0.008, 0.018], // sRGB, near black
  glow: [0.12, 0.07, 0.3], // sRGB, faint violet glow behind the hero
  glowAmount: 0.55,
  glowPos: [0.66, 0.45], // screen 0..1 (x right, y up)
};

export const CAMERA = {
  fov: 30, // long-ish lens: calmer perspective, more "product shot"
  position: [0.0, 0.35, 10.0],
  target: [0.0, 0.1, 0.0],
  near: 0.1,
  far: 60,
};
