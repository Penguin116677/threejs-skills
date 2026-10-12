// Preview page + headless API.
// URL params: any key from config.js DEFAULTS, plus w, h (render size),
// preset, headless=1, t (start time), msaa.
import { resolveConfig, configFromURL, PRESETS } from './config.js';
import { createWorld } from './world.js';

const params = configFromURL();
const headless = params.headless === '1';
const width = Number(params.w || (headless ? 3840 : 1280));
const height = Number(params.h || (headless ? 2160 : 720));
const msaa = Number(params.msaa ?? 4);
for (const k of ['w', 'h', 'headless', 't', 'msaa']) delete params[k];
const cfg = resolveConfig(params);
cfg.warnings.forEach((w) => console.warn('[config]', w));
if (headless) document.body.classList.add('headless');

const errors = [];
const origError = console.error.bind(console);
console.error = (...args) => {
  errors.push(args.map(String).join(' '));
  origError(...args);
};

const canvas = document.getElementById('c');
const world = createWorld({ canvas, width, height, cfg, msaa });

function checkPrograms() {
  const progs = world.renderer.info.programs || [];
  for (const p of progs) {
    if (p.diagnostics && p.diagnostics.runnable === false) {
      errors.push(`Shader program "${p.name}" failed: ${JSON.stringify(p.diagnostics).slice(0, 2000)}`);
    }
  }
  const gl = world.renderer.getContext();
  const e = gl.getError();
  if (e !== gl.NO_ERROR) errors.push(`WebGL error 0x${e.toString(16)}`);
  return errors.length === 0;
}

world.renderFrame(Number(new URLSearchParams(location.search).get('t') || 0));
checkPrograms();

// ------------------------------------------------------------ headless API
window.HOLO = {
  cfg,
  errors,
  info: () => world.info(),
  render(t) {
    const s = world.renderFrame(t);
    return { u: s.u, pulse: s.pulse.amp };
  },
  check: () => checkPrograms(),
  capture(type = 'image/png') {
    return canvas.toDataURL(type);
  },
  state: () => world.state,
};
window.HOLO_READY = true;

// --------------------------------------------------------------- preview UI
if (!headless) {
  const T = cfg.loopDuration;
  const scrub = document.getElementById('scrub');
  const timeEl = document.getElementById('time');
  const playBtn = document.getElementById('play');
  const modeSel = document.getElementById('mode');
  const presetSel = document.getElementById('preset');
  const guides = document.getElementById('guides');
  const copy = guides.querySelector('.copy');
  if (cfg.composition === 'left') { copy.style.left = '55%'; copy.style.right = '6%'; }
  else if (cfg.composition === 'right') { copy.style.left = '6%'; copy.style.right = '55%'; }
  else copy.style.display = 'none';

  modeSel.value = cfg.mode;
  for (const name of Object.keys(PRESETS)) presetSel.add(new Option(name, name));
  presetSel.value = new URLSearchParams(location.search).get('preset') || 'default';
  const reloadWith = (k, v) => {
    const p = new URLSearchParams(location.search);
    p.set(k, v);
    location.search = p.toString();
  };
  modeSel.onchange = () => reloadWith('mode', modeSel.value);
  presetSel.onchange = () => reloadWith('preset', presetSel.value);
  document.getElementById('guidesBtn').onclick = () => guides.classList.toggle('on');

  let playing = true;
  let t = 0;
  let last = performance.now();
  playBtn.onclick = () => {
    playing = !playing;
    playBtn.textContent = playing ? 'Pause' : 'Play';
    last = performance.now();
  };
  scrub.oninput = () => {
    t = Number(scrub.value) * T;
    world.renderFrame(t);
    timeEl.textContent = `${t.toFixed(2)} s`;
  };
  const tick = (now) => {
    if (playing) {
      t += (now - last) / 1000;
      // story plays once then hands over to the loop timing; loop wraps
      if (t >= T) t = cfg.mode === 'loop' ? t % T : 0;
      world.renderFrame(t);
      scrub.value = String(t / T);
      timeEl.textContent = `${t.toFixed(2)} s · f${Math.floor(t * cfg.fps)}`;
    }
    last = now;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
