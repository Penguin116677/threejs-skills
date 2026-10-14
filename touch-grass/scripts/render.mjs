#!/usr/bin/env node
/**
 * Render the film to MP4, frame by frame.
 *
 *   npm run render                       # 1920x1080, 30fps → renders/touch-grass.mp4
 *   npm run render -- --width 1280 --fps 24 --out renders/preview.mp4
 *   npm run render -- --from 0 --to 5    # just a slice, in seconds
 *
 * Needs ffmpeg on PATH and a Playwright Chromium (`npx playwright install chromium`).
 * Frames are rendered deterministically, so a slow GPU only makes it slower,
 * never choppier.
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), [])
);
const width = Number(args.width ?? 1920);
const height = Number(args.height ?? Math.round((width * 9) / 16));
const fps = Number(args.fps ?? 30);
const out = resolve(root, args.out ?? 'renders/touch-grass.mp4');
const query = new URLSearchParams({ capture: '', w: width, h: height });
if (args.blades) query.set('blades', args.blades);
if (args.samples) query.set('samples', args.samples);

const server = await createServer({ root, logLevel: 'error', server: { port: 0 } });
await server.listen();
const url = `${server.resolvedUrls.local[0]}?${query}`;

const browser = await chromium.launch({
  // Use the real GPU when there is one; fall back to SwiftShader otherwise.
  args: ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', ...(args.gl ? [`--use-angle=${args.gl}`] : [])]
});
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('page error:', e.message));
await page.goto(url, { timeout: 120000 });
await page.waitForFunction(() => document.documentElement.dataset.ready === 'true', null, { timeout: 120000 });
await page.evaluate(() => document.fonts.ready);

const duration = await page.evaluate(() => window.__motion.duration);
const from = Math.round(Number(args.from ?? 0) * fps);
const to = Math.round(Math.min(Number(args.to ?? duration), duration) * fps);

mkdirSync(dirname(out), { recursive: true });
const ffmpeg = spawn(
  'ffmpeg',
  ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
   '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out],
  { stdio: ['pipe', 'inherit', 'inherit'] }
);

const started = Date.now();
for (let i = from; i < to; i++) {
  await page.evaluate(([i, fps]) => window.__motion.frame(i, fps), [i, fps]);
  const png = await page.screenshot({ type: 'png', timeout: 300000 });
  if (!ffmpeg.stdin.write(png)) await new Promise((r) => ffmpeg.stdin.once('drain', r));
  const done = i - from + 1;
  const eta = ((Date.now() - started) / done) * (to - from - done) / 1000;
  process.stdout.write(`\rframe ${done}/${to - from}  ·  eta ${Math.ceil(eta)}s   `);
}
ffmpeg.stdin.end();
await new Promise((r) => ffmpeg.on('close', r));
await browser.close();
await server.close();
console.log(`\nwrote ${out}`);
