// PNG sequence -> H.264 MP4 (Adobe Stock friendly: yuv420p, BT.709, High profile,
// +faststart, no audio track).
//
//   node scripts/encode.mjs --frames-dir frames/4k --fps 30 --frames 450 --out renders/x.mp4 [--crf 14]
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function ffmpegArgs({ framesDir, fps, frames, out, crf = 14, preset = 'slow', height = 2160 }) {
  const level = height > 1080 ? '5.1' : '4.2';
  return [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-framerate', String(fps), '-start_number', '0',
    '-i', path.join(framesDir, 'frame_%04d.png'),
    '-frames:v', String(frames),
    '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
    '-c:v', 'libx264', '-preset', preset, '-crf', String(crf),
    '-profile:v', 'high', '-level:v', level,
    '-x264-params', 'aq-mode=3:aq-strength=0.9:deblock=-1,-1',
    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv',
    '-r', String(fps), '-movflags', '+faststart', '-an',
    out,
  ];
}

export function encode(opts) {
  const missing = [];
  for (let i = 0; i < opts.frames; i++) {
    if (!fs.existsSync(path.join(opts.framesDir, `frame_${String(i).padStart(4, '0')}.png`))) missing.push(i);
  }
  if (missing.length) throw new Error(`cannot encode: ${missing.length} frames missing (first: ${missing[0]})`);
  fs.mkdirSync(path.dirname(opts.out), { recursive: true });
  const args = ffmpegArgs(opts);
  console.log(`ffmpeg ${args.join(' ')}`);
  const r = spawnSync('ffmpeg', args, { stdio: 'inherit' });
  if (r.error) throw new Error(`ffmpeg not available: ${r.error.message}`);
  if (r.status !== 0) throw new Error(`ffmpeg exited with ${r.status}`);
  console.log(`wrote ${opts.out} (${(fs.statSync(opts.out).size / 1e6).toFixed(1)} MB)`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const get = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
  const fps = Number(get('--fps', 30));
  encode({
    framesDir: path.resolve(ROOT, get('--frames-dir', 'frames/4k')),
    fps,
    frames: Number(get('--frames', Math.round(Number(get('--duration', 15)) * fps))),
    out: path.resolve(ROOT, get('--out', 'renders/neon-ai-network_3840x2160_30fps.mp4')),
    crf: Number(get('--crf', 14)),
    preset: get('--preset', 'slow'),
    height: Number(get('--height', 2160)),
  });
}
