// WebGL2 renderer creation + capability checks (done BEFORE relying on anything).
import { WebGLRenderer, LinearSRGBColorSpace, NoToneMapping } from 'three';

// Probe what this device really supports. Only core WebGL2 is required.
// WEBGL_debug_renderer_info is queried only if present, for display.
export function checkWebGL2() {
  let gl = null;
  try {
    gl = document.createElement('canvas').getContext('webgl2');
  } catch (e) {
    /* ignore */
  }
  if (!gl) {
    return { ok: false, reason: 'Browser/perangkat ini tidak menyediakan WebGL2. Proyek ini membutuhkan WebGL2 (Chrome Android modern, GPU Adreno/Mali/PowerVR tahun 2017+).' };
  }
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  const info = {
    ok: true,
    gpu: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
    maxRenderbuffer: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
    maxViewport: Array.from(gl.getParameter(gl.MAX_VIEWPORT_DIMS)),
    maxSamples: gl.getParameter(gl.MAX_SAMPLES),
    highpFragment: gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT).precision > 0,
  };
  const lose = gl.getExtension('WEBGL_lose_context');
  if (lose) lose.loseContext();
  return info;
}

// Largest drawing-buffer edge we can safely use (for SSAA export).
export function maxCanvasEdge(info) {
  return Math.min(info.maxRenderbuffer, info.maxViewport[0], info.maxViewport[1]);
}

export function createRenderer(canvas, { antialias, preserveDrawingBuffer }) {
  const renderer = new WebGLRenderer({
    canvas,
    antialias,
    alpha: false,
    stencil: false,
    depth: true,
    powerPreference: 'high-performance',
    preserveDrawingBuffer,
  });
  // Our shaders output final display-referred sRGB themselves (tone map + OETF + dither),
  // so three.js must not convert or tone-map anything.
  renderer.outputColorSpace = LinearSRGBColorSpace;
  renderer.toneMapping = NoToneMapping;
  renderer.setClearColor(0x000000, 1);
  return renderer;
}
