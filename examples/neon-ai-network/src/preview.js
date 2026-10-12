// Interactive preview. Playback advances a *virtual* clock; each displayed
// frame is produced by the same deterministic renderAt(t) used by the offline
// renderer, so nothing here can change what the final render looks like.
import { NeonNetwork } from './NeonNetwork.js';
import { DEFAULT_CONFIG, parseConfig, configToQuery, totalFrames } from './config.js';

const $ = (id) => document.getElementById(id);
const config = parseConfig(location.search);
const canvas = $('c');
const net = new NeonNetwork(canvas, config);

let playing = true;
let speed = 1;
let time = 0; // virtual seconds
let lastWall = null;
let quality = 1;
const frames = () => totalFrames(config);

function resize() {
  const w = Math.round(1920 * quality);
  const h = Math.round(1080 * quality);
  net.setSize(w, h);
}

function fmt(t) {
  const f = Math.round(t * config.fps) % config.fps;
  const s = Math.floor(t + 1e-6);
  return `00:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
}

function draw() {
  const frame = Math.round(time * config.fps) % frames();
  net.renderAt(frame / config.fps, frame);
  $('scrub').value = frame;
  $('tc').textContent = fmt(frame / config.fps);
  $('fr').textContent = `frame ${frame} / ${frames()}`;
}

let fpsAcc = 0, fpsN = 0, fpsT = performance.now();
function loop(now) {
  if (playing) {
    if (lastWall !== null) time = (time + ((now - lastWall) / 1000) * speed) % config.duration;
    lastWall = now;
  }
  draw();
  fpsN++;
  if (now - fpsT > 1000) {
    $('fps').textContent = `${((fpsN * 1000) / (now - fpsT)).toFixed(0)} fps`;
    fpsN = 0;
    fpsT = now;
  }
  requestAnimationFrame(loop);
}

function setPlaying(p) {
  playing = p;
  lastWall = null;
  $('play').textContent = p ? 'Pause' : 'Play';
}
function step(d) {
  setPlaying(false);
  const f = (Math.round(time * config.fps) + d + frames()) % frames();
  time = f / config.fps;
}

$('play').onclick = () => setPlaying(!playing);
$('prev').onclick = () => step(-1);
$('next').onclick = () => step(1);
$('speed').onchange = (e) => (speed = Number(e.target.value));
$('scrub').max = frames() - 1;
$('scrub').oninput = (e) => {
  setPlaying(false);
  time = Number(e.target.value) / config.fps;
};
$('quality').onchange = (e) => {
  quality = Number(e.target.value);
  resize();
};
$('showGuides').onchange = (e) => ($('guides').hidden = !e.target.checked);
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' && e.target.type !== 'range') return;
  if (e.code === 'Space') { e.preventDefault(); setPlaying(!playing); }
  if (e.code === 'ArrowLeft') step(-1);
  if (e.code === 'ArrowRight') step(1);
});

function syncInputs() {
  document.querySelectorAll('[data-key]').forEach((el) => (el.value = config[el.dataset.key]));
  document.querySelectorAll('[data-color]').forEach((el) => (el.value = config.colors[el.dataset.color]));
  updateCommand();
}

function updateCommand() {
  const q = configToQuery(config);
  history.replaceState(null, '', q ? `?${q}` : location.pathname);
  $('cmd').textContent = `npm run render${q ? ` -- --params "${q}"` : ''}`;
  const s = net.network.stats;
  $('stats').textContent = `${s.nodes} nodes · ${s.edges} filaments · ${s.pulses} pulses · ${s.dust} micro-particles`;
}

document.querySelectorAll('[data-key]').forEach((el) => {
  el.addEventListener(el.dataset.rebuild !== undefined ? 'change' : 'input', () => {
    config[el.dataset.key] = Number(el.value);
    if (el.dataset.rebuild !== undefined) net.build();
    updateCommand();
  });
});
document.querySelectorAll('[data-color]').forEach((el) => {
  el.addEventListener('input', () => {
    config.colors[el.dataset.color] = el.value;
    updateCommand();
  });
});
$('reset').onclick = () => {
  const fresh = structuredClone(DEFAULT_CONFIG);
  const rebuild = fresh.seed !== config.seed || fresh.density !== config.density;
  Object.assign(config, { ...fresh, width: config.width, height: config.height });
  if (rebuild) net.build();
  syncInputs();
};
$('copyCmd').onclick = async () => {
  try {
    await navigator.clipboard.writeText($('cmd').textContent);
    $('copyCmd').textContent = 'Copied';
  } catch {
    $('copyCmd').textContent = 'Select text below';
  }
  setTimeout(() => ($('copyCmd').textContent = 'Copy 4K render command'), 1500);
};

resize();
syncInputs();
requestAnimationFrame(loop);
