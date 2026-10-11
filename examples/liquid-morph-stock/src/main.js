// Interactive real-time preview with adaptive resolution.
//   Space  play / pause        ← / →  step one frame (paused)
//   1–5    jump to scene A–E   Q      toggle quality (adaptive / full)
//   H      toggle the info overlay (never part of exported frames)

import { createLiquidRenderer } from './renderer.js';
import { TIMELINE, LIVE } from './config.js';
import { SCENE_MARKERS } from './animation.js';

const canvas = document.getElementById('view');
const hud = document.getElementById('hud');
const errorBox = document.getElementById('error');

function fail(err) {
  console.error(err);
  errorBox.textContent = String(err.message || err);
  errorBox.hidden = false;
}

let app;
try {
  app = createLiquidRenderer(canvas);
  app.liquid.setQuality({ aa: LIVE.aa, maxSteps: LIVE.maxSteps, reflSteps: 24 });
  app.checkShader();
} catch (err) {
  fail(err);
  throw err;
}

let scale = 0.6; // adaptive render scale
let adaptive = true;
let playing = true;
let loopTime = 0;
let last = performance.now();
let fpsAvg = 30;

canvas.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();
  fail(new Error('WebGL context lost — the GPU reset. Reload the page; lower quality with Q if it repeats.'));
});

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(16, Math.round(canvas.clientWidth * dpr * scale));
  const h = Math.max(16, Math.round(canvas.clientHeight * dpr * scale));
  app.setSize(w, h);
}

function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  fpsAvg += (1 / Math.max(dt, 1e-3) - fpsAvg) * 0.1;
  if (playing) loopTime = (loopTime + dt) % TIMELINE.duration;

  if (adaptive) {
    const prev = scale;
    if (fpsAvg < LIVE.targetFps * 0.8) scale = Math.max(LIVE.minScale, scale * 0.97);
    else if (fpsAvg > LIVE.targetFps * 1.1) scale = Math.min(LIVE.maxScale, scale * 1.01);
    if (Math.abs(prev - scale) > 0.02) resize();
  }

  app.renderTime(loopTime);

  if (!hud.hidden) {
    const scene = [...SCENE_MARKERS].reverse().find((m) => loopTime >= m.t);
    const f = Math.floor(loopTime * TIMELINE.fps);
    hud.textContent =
      `${scene.name}\nt ${loopTime.toFixed(2)}s · frame ${f}/${TIMELINE.frameCount}\n` +
      `${fpsAvg.toFixed(0)} fps · scale ${scale.toFixed(2)}${adaptive ? '' : ' (fixed)'}`;
  }
  requestAnimationFrame(frame);
}

window.addEventListener('resize', resize);
window.addEventListener('keydown', (e) => {
  const step = 1 / TIMELINE.fps;
  if (e.code === 'Space') playing = !playing;
  else if (e.code === 'ArrowRight') loopTime = (loopTime + step) % TIMELINE.duration;
  else if (e.code === 'ArrowLeft') loopTime = (loopTime - step + TIMELINE.duration) % TIMELINE.duration;
  else if (e.key >= '1' && e.key <= '5') loopTime = SCENE_MARKERS[+e.key - 1].t;
  else if (e.key === 'h' || e.key === 'H') hud.hidden = !hud.hidden;
  else if (e.key === 'q' || e.key === 'Q') {
    adaptive = !adaptive;
    scale = adaptive ? 0.6 : 1;
    resize();
  } else return;
  e.preventDefault();
});

resize();
requestAnimationFrame(frame);
