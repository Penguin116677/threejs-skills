// Entry point: wires config → renderer → scene → timeline → UI / capture API.
import { readParams, VIDEO, ASPECT } from './config/render-config.js';
import { checkWebGL2, createRenderer, maxCanvasEdge } from './render/renderer.js';
import { LiquidScene } from './render/liquid-scene.js';
import { sampleTimeline, frameToTime, timeToFrame, wrapTime } from './animation/timeline.js';
import { runLoopTest } from './render/loop-test.js';
import { exportMp4, probeEncoder } from './render/webcodecs-export.js';
import { createPreviewUI, createCapturePanel, showFatal, positionGuide } from './ui/preview-ui.js';

const params = readParams();
const caps = checkWebGL2();
if (!caps.ok) showFatal(caps.reason);
else boot();

function toBase64(buf) {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.textContent = name;
  return a;
}

function boot() {
  const capture = params.mode === 'capture';
  const canvas = document.getElementById('gl');
  let renderer;
  try {
    renderer = createRenderer(canvas, { antialias: params.preset.antialias, preserveDrawingBuffer: capture });
  } catch (e) {
    showFatal(`Gagal membuat konteks WebGL2: ${e.message}`);
    return;
  }
  renderer.debug.onShaderError = () => showFatal('Shader gagal dikompilasi di GPU ini. Buka chrome://inspect dari PC untuk melihat log, atau coba ?q=low.');
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    showFatal('Konteks WebGL hilang (GPU di-reset atau memori habis). Muat ulang halaman dan pilih kualitas Low.');
  });

  const liquid = new LiquidScene(renderer, params.preset);
  let bufW = 0;
  let bufH = 0;
  let ssaaUsed = 1;
  let currentT = 0;

  function layout() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let cssW = vw;
    let cssH = vw / ASPECT;
    if (cssH > vh) {
      cssH = vh;
      cssW = vh * ASPECT;
    }
    canvas.style.width = `${Math.floor(cssW)}px`;
    canvas.style.height = `${Math.floor(cssH)}px`;
    if (capture) {
      ssaaUsed = params.width * params.ssaa <= maxCanvasEdge(caps) ? params.ssaa : 1;
      renderer.setPixelRatio(1);
      renderer.setSize(params.width * ssaaUsed, params.height * ssaaUsed, false);
    } else {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, params.preset.maxDpr));
      renderer.setSize(Math.floor(cssW), Math.floor(cssH), false);
    }
    bufW = renderer.domElement.width;
    bufH = renderer.domElement.height;
    liquid.setTargetSize(bufW, bufH, capture ? ssaaUsed : 1);
    positionGuide(canvas);
  }

  function renderAt(t) {
    const s = sampleTimeline(t);
    currentT = s.t;
    liquid.update(s);
    liquid.render();
    return s;
  }
  const restore = () => {
    liquid.setTargetSize(bufW, bufH, capture ? ssaaUsed : 1);
    renderAt(currentT);
  };

  try {
    layout();
    liquid.compile();
  } catch (e) {
    showFatal(`Inisialisasi gagal: ${e.message}`);
    return;
  }

  // ---- Public API (used by tools/render-frames.mjs and handy in DevTools) ----
  window.ILM = {
    VIDEO,
    params,
    caps,
    get bufferSize() { return [bufW, bufH]; },
    get ssaa() { return ssaaUsed; },
    vertexCount: liquid.vertexCount,
    liquid, // debug access: ILM.liquid.ribbons[0].visible = false, etc.
    renderAt,
    renderFrame: (n) => renderAt(frameToTime(n)),
    async framePNG(n) {
      renderAt(frameToTime(n));
      const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
      return toBase64(await blob.arrayBuffer());
    },
    async timePNG(t) {
      renderAt(t);
      const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
      return toBase64(await blob.arrayBuffer());
    },
    loopTest: () => runLoopTest(liquid, restore),
    ready: false,
  };

  const startT = params.frame != null ? frameToTime(params.frame) : params.time ?? 0;
  const loopReport = (r) =>
    `Identitas t=0 vs t=${VIDEO.duration}: <b>${r.identity.toFixed(3)}</b> ${r.identityPass ? '✅' : '❌'}<br>` +
    `Sambungan f${VIDEO.frames - 1}→f0: <b>${r.seam.toFixed(2)}</b> vs perubahan normal median ${r.median.toFixed(2)} / maks ${r.max.toFixed(2)} ${r.seamPass ? '✅ mulus' : '❌ terlihat lompat'}` +
    '<br><span class="dim">(selisih rata-rata 0–255 per kanal, render 480×270)</span>';

  if (capture) {
    renderAt(startT);
    window.ILM.ready = true;
    if (!params.ui) return;
    let cancel = false;
    const panel = createCapturePanel({
      status: `Render ${params.width}×${params.height}${ssaaUsed > 1 ? ` (SSAA ${ssaaUsed}×, buffer ${bufW}×${bufH})` : ''} · ${VIDEO.fps} fps · ${VIDEO.frames} frame · GPU: ${caps.gpu}`,
      onExport: async (bitrate) => {
        cancel = false;
        panel.busy(true);
        try {
          const res = await exportMp4({
            width: params.width,
            height: params.height,
            fps: VIDEO.fps,
            frames: VIDEO.frames,
            bitrate,
            family: params.exportCodec,
            sourceCanvas: canvas,
            drawFrame: (n) => renderAt(frameToTime(n)),
            onProgress: (i, n, label) => {
              panel.progress(i / n);
              panel.status(`Encoding ${label}: frame ${i}/${n}`);
            },
            shouldCancel: () => cancel,
          });
          const name = `iridescent-liquid-morph_${params.width}x${params.height}_${VIDEO.fps}fps${params.exportCodec === 'vp9' ? '_vp9' : ''}.mp4`;
          const a = download(res.blob, name);
          panel.status(`Selesai (${res.codec}, ${(res.blob.size / 1e6).toFixed(1)} MB). Ketuk untuk menyimpan: `);
          document.querySelector('#ui .panel .msg').append(a);
        } catch (e) {
          panel.status(`❌ ${e.message}`);
        } finally {
          panel.busy(false);
        }
      },
      onCancel: () => { cancel = true; },
      onLoopTest: async () => {
        panel.status('Menguji loop…');
        panel.status(loopReport(await window.ILM.loopTest()));
      },
      onBack: () => {
        const q = new URLSearchParams(location.search);
        q.delete('mode');
        location.search = q.toString();
      },
    });
    probeEncoder(params.width, params.height, VIDEO.fps, 24e6, params.exportCodec).then((p) => {
      if (!p.ok) panel.status(`⚠️ ${p.reason} Gunakan alur PNG + ffmpeg (lihat README).`);
      else panel.status(`Siap: ${p.label} · ${params.width}×${params.height}${ssaaUsed > 1 ? ` (SSAA ${ssaaUsed}×)` : ''} · ${VIDEO.fps} fps · ${VIDEO.frames} frame · GPU: ${caps.gpu}`);
    });
    window.addEventListener('resize', () => { layout(); renderAt(currentT); });
    return;
  }

  // ---------------------------- Preview mode ----------------------------
  let t = startT;
  let playing = params.time == null && params.frame == null;
  let seam = false;
  let seamT = 0;
  let dirty = true;
  let last = performance.now();
  let fpsFrames = 0;
  let fpsTime = 0;

  const ui = params.ui ? createPreviewUI({
    quality: params.quality,
    onTogglePlay: () => { playing = !playing; ui.setPlaying(playing); },
    onSeek: (v) => { t = v; seam = false; ui.setSeam(false); dirty = true; },
    onStep: (d) => {
      playing = false;
      ui.setPlaying(false);
      t = frameToTime((timeToFrame(t) + d + VIDEO.frames) % VIDEO.frames);
      dirty = true;
    },
    onQuality: (q) => {
      const s = new URLSearchParams(location.search);
      s.set('q', q);
      location.search = s.toString();
    },
    onToggleSeam: () => {
      seam = !seam;
      seamT = 0;
      playing = true;
      ui.setSeam(seam);
      ui.setPlaying(true);
      ui.message(seam ? `Memutar ${VIDEO.duration - 2}s → ${VIDEO.duration}s → 0s → 2s berulang. Perhatikan apakah ada lompatan saat penghitung kembali ke 0.` : '');
    },
    onLoopTest: async () => {
      const was = playing;
      playing = false;
      ui.message('Menguji loop…');
      ui.message(loopReport(await window.ILM.loopTest()));
      playing = was;
    },
    onPNG: () => {
      renderAt(t);
      canvas.toBlob((b) => {
        const a = download(b, `ilm_t${t.toFixed(2)}.png`);
        a.click();
      }, 'image/png');
    },
    onCaptureMode: () => {
      const s = new URLSearchParams(location.search);
      s.set('mode', 'capture');
      s.set('q', 'high');
      location.search = s.toString();
    },
  }) : null;
  if (ui) ui.setPlaying(playing);

  window.addEventListener('resize', () => { layout(); dirty = true; });
  document.addEventListener('visibilitychange', () => { last = performance.now(); });

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    if (playing) {
      if (seam) {
        seamT = (seamT + dt) % 4;
        t = wrapTime(VIDEO.duration - 2 + seamT);
      } else {
        t = wrapTime(t + dt);
      }
      dirty = true;
    }
    if (dirty) {
      const s = renderAt(t);
      dirty = false;
      if (ui) ui.setTime(s.t, s.frameIndex);
      fpsFrames++;
    }
    fpsTime += dt;
    if (fpsTime > 0.5) {
      if (ui) ui.setFps(playing ? fpsFrames / fpsTime : null, `${bufW}×${bufH} · ${(liquid.vertexCount / 1000).toFixed(0)}k vtx`);
      fpsFrames = 0;
      fpsTime = 0;
    }
    requestAnimationFrame(frame);
  }
  window.ILM.ready = true;
  requestAnimationFrame(frame);
}
