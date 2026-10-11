// Central configuration. Shared by the browser preview, the export page and
// the Node render/encode/validate scripts, so it must stay dependency-free.

export const TIMELINE = {
  duration: 15, // seconds — the loop length
  fps: 30,
  get frameCount() {
    return Math.round(this.duration * this.fps); // 450
  },
};

// Render profiles. "final" is the delivery spec and is never silently reduced:
// if the machine is too slow the renderer reports it instead of downscaling.
export const PROFILES = {
  final: {
    width: 3840,
    height: 2160,
    aa: 2, // 1 = single sample, 2 = adaptive edge supersampling (5 spp at edges), 3 = 5 spp everywhere
    maxSteps: 112,
    tileRows: 8, // split each frame into horizontal strips (GPU watchdog safety)
    outDir: 'output/frames-4k',
    video: 'output/liquid-morph-4k.mp4',
    crf: 14,
  },
  preview: {
    width: 1280,
    height: 720,
    aa: 2,
    maxSteps: 96,
    tileRows: 2,
    outDir: 'output/frames-preview',
    video: 'output/liquid-morph-preview.mp4',
    crf: 18,
  },
};

// Interactive viewer: resolution scale adapts between these bounds to hold fps.
export const LIVE = {
  minScale: 0.35,
  maxScale: 1.0,
  targetFps: 50,
  aa: 1,
  maxSteps: 96,
};

// Look development parameters (exposed as shader uniforms).
export const LOOK = {
  exposure: 1.05,
  roughness: 0.035, // softbox edge softness in reflection — "carefully controlled roughness"
  glow: 0.022, // restrained halo around the liquid
  vignette: 0.32,
  dither: 1.0, // +-0.5/255 static dither against banding in the dark gradient
};

export const CAMERA = {
  fov: 30, // vertical, degrees
  distance: 7.1,
};
