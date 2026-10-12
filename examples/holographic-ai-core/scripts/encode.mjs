#!/usr/bin/env node
// Encodes a rendered PNG sequence with ffmpeg.
//   node scripts/encode.mjs --mode loop                       # 4K H.264 master
//   node scripts/encode.mjs --mode story --preview            # + 1080p preview (downscaled, labelled as preview)
//   node scripts/encode.mjs --mode loop --prores              # + ProRes 422 HQ mezzanine
// Options: --width --height --fps --preset --crf (default 14) --in DIR --out FILE
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseArgs, outputName } from './args.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = parseArgs();
const mode = args.mode || 'loop';
const width = Number(args.width || 3840);
const height = Number(args.height || 2160);
const fps = Number(args.fps || 30);
const preset = args.preset || 'default';
const crf = String(args.crf || 14);
const name = outputName({ mode, width, height, preset });
const dir = path.resolve(args.in || path.join(ROOT, 'output', name, 'frames'));
const total = Math.round(Number(args.duration || 16) * fps);

// Refuse to encode an incomplete sequence: a missing frame would silently
// become a stutter in the delivered video.
const missing = [];
for (let i = 0; i < total; i++) {
  if (!fs.existsSync(path.join(dir, `frame_${String(i).padStart(5, '0')}.png`))) missing.push(i);
}
if (missing.length) {
  console.error(`[encode] ${missing.length} frame(s) missing in ${dir} (first: ${missing.slice(0, 5).join(', ')}). Render them first.`);
  process.exit(1);
}

const input = ['-y', '-hide_banner', '-loglevel', 'error', '-framerate', String(fps), '-start_number', '0', '-i', path.join(dir, 'frame_%05d.png'), '-frames:v', String(total)];
const colorTags = ['-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv'];
const scaleTo = (w, h) => `scale=${w}:${h}:flags=lanczos+accurate_rnd+full_chroma_int:out_color_matrix=bt709:out_range=tv`;
const level = width * height > 2048 * 1080 ? '5.1' : '4.1';

function run(outFile, vf, codecArgs) {
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  const cmd = [...input, '-vf', vf, ...codecArgs, ...colorTags, '-an', '-movflags', '+faststart', outFile];
  console.log(`[encode] ffmpeg ${cmd.join(' ')}`);
  const t0 = Date.now();
  const r = spawnSync('ffmpeg', cmd, { stdio: 'inherit' });
  if (r.status !== 0) { console.error('[encode] ffmpeg failed'); process.exit(1); }
  console.log(`[encode] wrote ${outFile} (${(fs.statSync(outFile).size / 1e6).toFixed(1)} MB, ${((Date.now() - t0) / 1000).toFixed(1)} s)`);
}

const h264 = (lvl) => [
  '-c:v', 'libx264', '-preset', 'slow', '-crf', crf, '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level:v', lvl,
  '-x264-params', 'aq-mode=3:aq-strength=0.9:deblock=-1,-1:keyint=30:min-keyint=30:scenecut=0', '-r', String(fps),
];

const outDir = path.join(ROOT, 'output', 'video');
run(args.out || path.join(outDir, `${name}_h264.mp4`), scaleTo(width, height), h264(level));

if (args.preview && height > 1080) {
  // downscale only: a preview is never upscaled from a smaller render
  const pName = outputName({ mode, width: 1920, height: 1080, preset }).replace('_1920x1080', '_preview-1080p-from-' + height + 'p');
  run(path.join(outDir, `${pName}_h264.mp4`), scaleTo(1920, 1080), h264('4.1').map((v) => (v === crf ? '18' : v)));
}
if (args.prores) {
  const cmd = ['-c:v', 'prores_ks', '-profile:v', '3', '-pix_fmt', 'yuv422p10le', '-vendor', 'apl0', '-r', String(fps)];
  const f = path.join(outDir, `${name}_prores422hq.mov`);
  fs.mkdirSync(outDir, { recursive: true });
  const all = [...input, '-vf', scaleTo(width, height), ...cmd, ...colorTags, '-an', f];
  console.log(`[encode] ffmpeg ${all.join(' ')}`);
  const r = spawnSync('ffmpeg', all, { stdio: 'inherit' });
  if (r.status !== 0) process.exit(1);
  console.log(`[encode] wrote ${f}`);
}
