// On-device H.264 export (Android Chrome) via WebCodecs + mp4-muxer.
// Frames are rendered one by one at exact timestamps (not screen-recorded),
// so dropped frames are impossible. Support is PROBED first — many devices
// have a hardware H.264 encoder, but the browser may still refuse a config.
import { Muxer, ArrayBufferTarget } from '../../vendor/mp4-muxer/mp4-muxer.mjs';

const CANDIDATES = [
  { codec: 'avc1.640028', label: 'H.264 High @ L4.0' },
  { codec: 'avc1.4d0028', label: 'H.264 Main @ L4.0' },
  { codec: 'avc1.42e028', label: 'H.264 Constrained Baseline @ L4.0' },
];

export async function probeH264(width, height, fps, bitrate) {
  if (!window.isSecureContext) {
    return { ok: false, reason: 'WebCodecs butuh secure context: buka lewat https:// atau http://localhost (bukan IP LAN).' };
  }
  if (typeof window.VideoEncoder === 'undefined' || typeof window.VideoFrame === 'undefined') {
    return { ok: false, reason: 'Browser ini tidak menyediakan WebCodecs VideoEncoder (butuh Chrome 94+).' };
  }
  for (const c of CANDIDATES) {
    const config = { codec: c.codec, width, height, bitrate, framerate: fps, avc: { format: 'avc' } };
    try {
      const res = await VideoEncoder.isConfigSupported(config);
      if (res.supported) return { ok: true, config, label: c.label };
    } catch (e) {
      /* try next */
    }
  }
  return { ok: false, reason: `Encoder H.264 ${width}×${height} tidak didukung di perangkat/browser ini.` };
}

const tick = () => new Promise((r) => setTimeout(r, 0));

// drawFrame(n) must render frame n into sourceCanvas synchronously.
export async function exportMp4({ width, height, fps, frames, bitrate, sourceCanvas, drawFrame, onProgress, shouldCancel }) {
  const probe = await probeH264(width, height, fps, bitrate);
  if (!probe.ok) throw new Error(probe.reason);

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: 'avc', width, height, frameRate: fps },
    fastStart: 'in-memory', // moov atom at the start (= "faststart")
    firstTimestampBehavior: 'offset',
  });
  let failure = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => {
      failure = e;
    },
  });
  encoder.configure(probe.config);

  // SSAA: the WebGL canvas is larger than the video → high-quality 2D downscale.
  let scratch = null;
  let ctx = null;
  if (sourceCanvas.width !== width || sourceCanvas.height !== height) {
    scratch = document.createElement('canvas');
    scratch.width = width;
    scratch.height = height;
    ctx = scratch.getContext('2d', { alpha: false });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
  }

  const frameUs = 1e6 / fps;
  for (let n = 0; n < frames; n++) {
    if (failure) throw failure;
    if (shouldCancel && shouldCancel()) {
      encoder.close();
      throw new Error('Ekspor dibatalkan.');
    }
    drawFrame(n);
    let src = sourceCanvas;
    if (scratch) {
      ctx.drawImage(sourceCanvas, 0, 0, width, height);
      src = scratch;
    }
    const vf = new VideoFrame(src, { timestamp: Math.round(n * frameUs), duration: Math.round(frameUs) });
    encoder.encode(vf, { keyFrame: n % fps === 0 }); // keyframe every second
    vf.close();
    while (encoder.encodeQueueSize > 3) await new Promise((r) => setTimeout(r, 2));
    if (onProgress) onProgress(n + 1, frames, probe.label);
    if (n % 3 === 0) await tick();
  }
  await encoder.flush();
  encoder.close();
  if (failure) throw failure;
  muxer.finalize();
  return { blob: new Blob([muxer.target.buffer], { type: 'video/mp4' }), codec: probe.label };
}
