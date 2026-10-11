#!/usr/bin/env node
// Verify the encoded MP4 against the delivery spec and run automated visual QC.
//
//   node scripts/validate-video.js --mode final
//   node scripts/validate-video.js --file some.mp4 --width 3840 --height 2160
//
// Spec checks (ffprobe): container, codec, pixel format, resolution, frame
// rate, exact frame count, duration, progressive scan, no audio/subtitle/data.
// Visual QC (decoded luma at low resolution): black frames, brightness
// flicker, abrupt jumps, and the loop seam (last → first frame) compared with
// ordinary frame-to-frame motion. Writes a JSON report next to the video.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync, spawn } from 'node:child_process';
import { PROFILES, TIMELINE } from '../src/config.js';
import { ROOT, parseArgs, requireTool } from './lib.js';

const args = parseArgs();
const mode = args.mode || 'preview';
const profile = PROFILES[mode] || PROFILES.preview;
const file = path.resolve(ROOT, args.file || profile.video);
const W = +(args.width || profile.width);
const H = +(args.height || profile.height);
const FPS = TIMELINE.fps;
const N = TIMELINE.frameCount;

requireTool('ffprobe');
requireTool('ffmpeg');
if (!fs.existsSync(file)) {
  console.error(`✖ ${file} not found. Run "npm run encode:${mode}" first.`);
  process.exit(1);
}

const probe = spawnSync(
  'ffprobe',
  ['-v', 'error', '-count_frames', '-print_format', 'json', '-show_streams', '-show_format', file],
  { encoding: 'utf8', maxBuffer: 1 << 26 },
);
if (probe.status !== 0) {
  console.error(`✖ ffprobe failed: ${probe.stderr}`);
  process.exit(1);
}
const info = JSON.parse(probe.stdout);
const video = info.streams.filter((s) => s.codec_type === 'video');
const others = info.streams.filter((s) => s.codec_type !== 'video');
const v = video[0] || {};
const duration = parseFloat(v.duration || info.format.duration);

const results = [];
const check = (name, ok, actual, expected) => results.push({ name, ok: !!ok, actual, expected });
check('container', /mp4/.test(info.format.format_name), info.format.format_name, 'mp4');
check('single video stream', video.length === 1, video.length, 1);
check('no audio / other streams', others.length === 0, others.map((s) => s.codec_type).join(',') || 'none', 'none');
check('codec', v.codec_name === 'h264', v.codec_name, 'h264');
check('pixel format', v.pix_fmt === 'yuv420p', v.pix_fmt, 'yuv420p');
check('resolution', v.width === W && v.height === H, `${v.width}x${v.height}`, `${W}x${H}`);
check('frame rate', v.r_frame_rate === `${FPS}/1` && v.avg_frame_rate === `${FPS}/1`, `${v.r_frame_rate} (avg ${v.avg_frame_rate})`, `${FPS}/1`);
check('frame count', +v.nb_read_frames === N, +v.nb_read_frames, N);
check('duration', Math.abs(duration - N / FPS) < 0.5 / FPS, duration.toFixed(3) + ' s', (N / FPS).toFixed(3) + ' s');
check('progressive scan', !v.field_order || v.field_order === 'progressive', v.field_order || 'unspecified', 'progressive');
check('display aspect 16:9', Math.abs(v.width / v.height - 16 / 9) < 1e-3, (v.width / v.height).toFixed(4), '1.7778');

// ---- visual QC on decoded luma (downscaled; streamed, one frame at a time)
const qw = 192, qh = 108;
const means = [];
const diffs = []; // diffs[i] = mean |Y_i - Y_{i-1}|
let first = null, prev = null;
let loopDiff = 0;
await new Promise((resolve, reject) => {
  const p = spawn('ffmpeg', ['-v', 'error', '-i', file, '-vf', `scale=${qw}:${qh}:flags=area,format=gray`, '-f', 'rawvideo', '-']);
  let buf = Buffer.alloc(0);
  const size = qw * qh;
  p.stdout.on('data', (d) => {
    buf = Buffer.concat([buf, d]);
    while (buf.length >= size) {
      const fr = buf.subarray(0, size);
      buf = buf.subarray(size);
      let s = 0;
      for (let k = 0; k < size; k++) s += fr[k];
      means.push(s / size);
      if (prev) {
        let dd = 0;
        for (let k = 0; k < size; k++) dd += Math.abs(fr[k] - prev[k]);
        diffs.push(dd / size);
      }
      if (!first) first = Buffer.from(fr);
      prev = Buffer.from(fr);
    }
  });
  p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg decode failed (${code})`))));
});
if (first && prev) {
  let dd = 0;
  for (let k = 0; k < first.length; k++) dd += Math.abs(first[k] - prev[k]);
  loopDiff = dd / first.length;
}
const sorted = [...diffs].sort((a, b) => a - b);
const median = sorted[Math.floor(sorted.length / 2)] || 0;
const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
const maxDiff = sorted[sorted.length - 1] || 0;
const blackFrames = means.map((m, i) => [i, m]).filter(([, m]) => m < 4).map(([i]) => i);
// Flicker: brightness spike relative to both neighbours.
const flicker = [];
for (let i = 0; i < means.length; i++) {
  const a = means[(i - 1 + means.length) % means.length];
  const b = means[(i + 1) % means.length];
  if (Math.abs(means[i] - (a + b) / 2) > 1.0) flicker.push(i);
}
const jumps = diffs.map((d, i) => [i + 1, d]).filter(([, d]) => d > Math.max(6 * median, 1.5)).map(([i]) => i);

check('no black frames', blackFrames.length === 0, blackFrames.length ? blackFrames.join(',') : 'none', 'none');
check('no brightness flicker', flicker.length === 0, flicker.length ? flicker.join(',') : 'none', 'none');
check('no abrupt jumps', jumps.length === 0, jumps.length ? jumps.join(',') : 'none', 'none');
check(
  'seamless loop (last→first ≈ normal motion)',
  loopDiff <= Math.max(p95 * 1.25, 0.05),
  `seam ${loopDiff.toFixed(3)} vs median ${median.toFixed(3)}, p95 ${p95.toFixed(3)}`,
  '≤ 1.25 × p95 frame-to-frame change',
);

console.log(`\nValidation — ${path.relative(process.cwd(), file)} (${(fs.statSync(file).size / 1e6).toFixed(1)} MB, ${(info.format.bit_rate / 1e6).toFixed(1)} Mb/s)\n`);
for (const r of results) console.log(`  ${r.ok ? '✔' : '✖'} ${r.name.padEnd(44)} ${r.actual}${r.ok ? '' : `   (expected ${r.expected})`}`);
console.log(
  `\n  Luma mean range ${Math.min(...means).toFixed(1)}–${Math.max(...means).toFixed(1)} (0–255); ` +
    `frame-to-frame change median ${median.toFixed(3)}, max ${maxDiff.toFixed(3)}`,
);
console.log('  Note: text/logo/watermark absence is guaranteed by construction (nothing but the shader is drawn);');
console.log('        final Adobe Stock acceptance remains subject to their review.\n');

const report = { file, checkedAt: new Date().toISOString(), results, qc: { means, diffs, loopDiff, median, p95, maxDiff } };
fs.writeFileSync(file.replace(/\.mp4$/, '.qc.json'), JSON.stringify(report, null, 1));
const failed = results.filter((r) => !r.ok);
if (failed.length) {
  console.error(`✖ ${failed.length} check(s) failed.`);
  process.exit(1);
}
console.log('✔ All checks passed.');
