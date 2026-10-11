#!/usr/bin/env node
// Assemble rendered PNG frames into an H.264 / yuv420p / 30 fps MP4 (no audio).
//
//   node scripts/encode-video.js --mode final     # output/liquid-morph-4k.mp4
//   node scripts/encode-video.js --mode preview
//   --crf N  override quality (lower = better/larger)
//
// Refuses to encode an incomplete sequence: a missing frame would silently
// shorten the clip and break the loop.

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { PROFILES, TIMELINE } from '../src/config.js';
import { ROOT, parseArgs, framePath, isCompletePng, requireTool } from './lib.js';

const args = parseArgs();
const mode = args.mode || 'preview';
const profile = PROFILES[mode];
if (!profile) {
  console.error(`✖ Unknown --mode "${mode}".`);
  process.exit(1);
}
requireTool('ffmpeg');

const dir = path.resolve(ROOT, args.frames || profile.outDir);
const out = path.resolve(ROOT, args.out || profile.video);
const total = TIMELINE.frameCount;

const missing = [];
for (let i = 0; i < total; i++) if (!isCompletePng(framePath(dir, i))) missing.push(i);
if (missing.length) {
  const shown = missing.slice(0, 12).join(', ') + (missing.length > 12 ? ', …' : '');
  console.error(
    `✖ ${missing.length} of ${total} frames are missing or incomplete in ${path.relative(process.cwd(), dir)}: ${shown}\n` +
      `  Fix: run "npm run render:${mode}" (it resumes and only renders what is missing).`,
  );
  process.exit(1);
}

fs.mkdirSync(path.dirname(out), { recursive: true });
const tmp = out.replace(/\.mp4$/, '.partial.mp4');
const crf = String(args.crf || profile.crf);

const ff = [
  '-y', '-hide_banner', '-loglevel', 'error', '-nostats', '-progress', 'pipe:1',
  '-framerate', String(TIMELINE.fps), '-start_number', '0',
  '-i', path.join(dir, 'frame_%05d.png'),
  '-frames:v', String(total),
  // Explicit, correct RGB → BT.709 limited-range YUV conversion.
  '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
  '-c:v', 'libx264', '-preset', args.preset || 'slow', '-crf', crf,
  '-profile:v', 'high', ...(profile.width >= 3840 ? ['-level:v', '5.1'] : []),
  '-pix_fmt', 'yuv420p',
  '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv',
  '-x264-params', `keyint=${TIMELINE.fps}:min-keyint=${TIMELINE.fps}:scenecut=0:aq-mode=3`,
  '-r', String(TIMELINE.fps), '-fps_mode', 'cfr',
  '-an', '-sn', '-dn', '-map_metadata', '-1',
  '-movflags', '+faststart',
  tmp,
];

console.log(`Encoding ${total} frames → ${path.relative(process.cwd(), out)}  (H.264 High, CRF ${crf}, yuv420p, ${TIMELINE.fps} fps, no audio)`);
const t0 = Date.now();
const proc = spawn('ffmpeg', ff, { stdio: ['ignore', 'pipe', 'pipe'] });
let errText = '';
proc.stderr.on('data', (d) => (errText += d));
let lastPct = -1;
proc.stdout.on('data', (d) => {
  const m = /frame=(\d+)/.exec(String(d));
  if (m) {
    const pct = Math.floor((+m[1] / total) * 100);
    if (pct !== lastPct && pct % 10 === 0) console.log(`  ${pct}%`);
    lastPct = pct;
  }
});
proc.on('close', (code) => {
  if (code !== 0) {
    console.error(`✖ ffmpeg failed (exit ${code}):\n${errText}`);
    fs.rmSync(tmp, { force: true });
    process.exit(1);
  }
  fs.renameSync(tmp, out);
  const mb = fs.statSync(out).size / 1e6;
  console.log(`✔ Wrote ${path.relative(process.cwd(), out)} (${mb.toFixed(1)} MB) in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  console.log(`  Next: npm run validate:${mode}`);
});
