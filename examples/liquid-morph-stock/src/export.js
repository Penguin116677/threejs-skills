// Headless export entry. scripts/render-frames.js drives this page:
//   await window.liquidExport.init({ width, height, aa, maxSteps, reflSteps, tileRows })
//   await window.liquidExport.renderFrame(i)  → base64 PNG of frame i
// Frames are a pure function of the frame index (t = i / fps), never of
// wall-clock time, so any frame can be rendered independently.

import { createLiquidRenderer } from './renderer.js';
import { TIMELINE } from './config.js';

let app;
let opts;

async function init(options) {
  opts = options;
  const canvas = document.getElementById('out');
  canvas.width = opts.width;
  canvas.height = opts.height;
  app = createLiquidRenderer(canvas, { preserveDrawingBuffer: true });
  const gl = app.renderer.getContext();
  const maxDims = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
  if (opts.width > maxDims[0] || opts.height > maxDims[1]) {
    throw new Error(`GPU max viewport ${maxDims[0]}x${maxDims[1]} is smaller than ${opts.width}x${opts.height}.`);
  }
  app.liquid.setQuality(opts);
  app.checkShader();
  app.setSize(opts.width, opts.height);
  return {
    renderer: gl.getParameter(gl.RENDERER),
    version: gl.getParameter(gl.VERSION),
    drawingBuffer: [gl.drawingBufferWidth, gl.drawingBufferHeight],
  };
}

async function renderFrame(i) {
  const gl = app.renderer.getContext();
  if (gl.isContextLost()) throw new Error('WebGL context lost (GPU reset / watchdog). Increase tileRows.');
  app.renderTime(i / TIMELINE.fps, { tileRows: opts.tileRows });
  const [w, h] = [gl.drawingBufferWidth, gl.drawingBufferHeight];
  if (w !== opts.width || h !== opts.height) {
    throw new Error(`Drawing buffer is ${w}x${h}, expected ${opts.width}x${opts.height}.`);
  }
  const blob = await new Promise((res) => app.renderer.domElement.toBlob(res, 'image/png'));
  if (!blob) throw new Error('canvas.toBlob returned null (out of memory?).');
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (let k = 0; k < buf.length; k += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(k, k + 0x8000));
  return btoa(bin);
}

window.liquidExport = { init, renderFrame, ready: true };
