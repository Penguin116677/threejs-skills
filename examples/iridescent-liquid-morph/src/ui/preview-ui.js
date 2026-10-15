// Touch-friendly preview / export UI. Pure DOM — nothing here is drawn into
// the WebGL canvas, so guides and panels can never end up in rendered frames.
import { VIDEO, QUALITY } from '../config/render-config.js';

const el = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v);
  }
  for (const c of kids) n.append(c);
  return n;
};

export function showFatal(msg) {
  const box = document.getElementById('fatal');
  box.hidden = false;
  box.textContent = msg;
}

export function positionGuide(canvas) {
  const g = document.getElementById('guide');
  const r = canvas.getBoundingClientRect();
  Object.assign(g.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
}

function fmt(t) {
  return t.toFixed(2).padStart(5, '0');
}

export function createPreviewUI(o) {
  const root = document.getElementById('ui');
  const play = el('button', { class: 'primary', onclick: o.onTogglePlay }, '❚❚');
  const slider = el('input', { type: 'range', min: '0', max: String(VIDEO.duration), step: String(1 / VIDEO.fps), value: '0', 'aria-label': 'Waktu' });
  slider.addEventListener('input', () => o.onSeek(+slider.value));
  const time = el('span', { class: 'mono' }, '');
  const fpsOut = el('span', { class: 'mono dim' }, '');
  const quality = el('select', { 'aria-label': 'Kualitas' });
  for (const [k, v] of Object.entries(QUALITY)) {
    const opt = el('option', { value: k }, v.label);
    if (k === o.quality) opt.selected = true;
    quality.append(opt);
  }
  quality.addEventListener('change', () => o.onQuality(quality.value));
  const seam = el('button', { onclick: o.onToggleSeam }, 'Sambungan loop');
  const guide = el('button', { onclick: () => toggleGuide() }, 'Panduan teks');
  const msg = el('div', { class: 'msg', hidden: '' });
  const hide = el('button', { class: 'ghost', title: 'Sembunyikan panel (H)', onclick: () => toggleHidden() }, '⌄');

  const panel = el('div', { class: 'panel' },
    el('div', { class: 'row' }, play,
      el('button', { onclick: () => o.onStep(-1), title: 'Frame sebelumnya (←)' }, '‹'),
      el('button', { onclick: () => o.onStep(1), title: 'Frame berikutnya (→)' }, '›'),
      slider, time, hide),
    el('div', { class: 'row wrap' }, quality, seam, guide,
      el('button', { onclick: o.onLoopTest }, 'Uji loop'),
      el('button', { onclick: o.onPNG }, 'PNG frame ini'),
      el('button', { onclick: o.onCaptureMode }, 'Mode render/ekspor →'),
      fpsOut),
    msg);
  root.append(panel);
  const reveal = el('button', { class: 'reveal', hidden: '', onclick: () => toggleHidden() }, 'Panel');
  root.append(reveal);

  function toggleGuide() {
    const g = document.getElementById('guide');
    g.hidden = !g.hidden;
    guide.classList.toggle('on', !g.hidden);
  }
  function toggleHidden() {
    panel.hidden = !panel.hidden;
    reveal.hidden = !panel.hidden;
  }
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' && e.target.type !== 'range') return;
    if (e.code === 'Space') { e.preventDefault(); o.onTogglePlay(); }
    else if (e.code === 'ArrowRight') o.onStep(1);
    else if (e.code === 'ArrowLeft') o.onStep(-1);
    else if (e.code === 'KeyH') toggleHidden();
    else if (e.code === 'KeyG') toggleGuide();
  });

  return {
    setTime(t, frame) {
      if (document.activeElement !== slider) slider.value = String(t);
      time.textContent = `${fmt(t)}s · f ${String(frame).padStart(3, '0')}/${VIDEO.frames}`;
    },
    setPlaying(p) { play.textContent = p ? '❚❚' : '▶'; },
    setSeam(on) { seam.classList.toggle('on', on); },
    setFps(f, extra) { fpsOut.textContent = `${f == null ? 'dijeda' : `${f.toFixed(0)} fps`} · ${extra}`; },
    message(html) { msg.hidden = !html; msg.innerHTML = html || ''; },
  };
}

export function createCapturePanel(o) {
  const root = document.getElementById('ui');
  const bitrate = el('select', { 'aria-label': 'Bitrate' },
    el('option', { value: '24000000' }, '24 Mbps'),
    el('option', { value: '40000000', selected: '' }, '40 Mbps'),
    el('option', { value: '16000000' }, '16 Mbps (memori kecil)'));
  const bar = el('progress', { max: '1', value: '0' });
  const status = el('div', { class: 'msg' }, o.status);
  const start = el('button', { class: 'primary', onclick: () => o.onExport(+bitrate.value) }, 'Ekspor MP4 H.264');
  const cancel = el('button', { onclick: o.onCancel }, 'Batal');
  const panel = el('div', { class: 'panel' },
    el('div', { class: 'row wrap' }, start, bitrate, cancel,
      el('button', { onclick: o.onLoopTest }, 'Uji loop'),
      el('button', { onclick: o.onBack }, '← Preview')),
    el('div', { class: 'row' }, bar),
    status);
  root.append(panel);
  return {
    progress(v) { bar.value = v; },
    status(html) { status.innerHTML = html; },
    busy(b) { start.disabled = b; bitrate.disabled = b; },
  };
}
