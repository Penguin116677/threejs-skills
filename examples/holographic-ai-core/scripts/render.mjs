#!/usr/bin/env node
// Deterministic frame exporter: renders the scene in headless Chromium and
// writes a lossless PNG image sequence. Frame i is rendered at t = i / fps, so
// output never depends on wall-clock speed (no screen recording involved).
//
//   node scripts/render.mjs --mode loop --width 3840 --height 2160 --workers 3
//   node scripts/render.mjs --mode story --frames 0,240,479      # stills only
//   node scripts/render.mjs --mode loop --param hue=30 --param seed=11
//
// Options: --mode loop|story  --width  --height  --fps  --duration
//          --start --end (frame range, end exclusive)  --frames a,b,c
//          --workers N  --out DIR  --preset NAME  --param key=value (repeatable)
//          --msaa N  --force (re-render existing frames)  --extra (also render
//          frame N = first frame of the next cycle, used by the seam check)
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { startServer } from './serve.mjs';
import { parseArgs, outputName } from './args.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = parseArgs();
const mode = args.mode || 'loop';
const width = Number(args.width || 3840);
const height = Number(args.height || 2160);
const fps = Number(args.fps || 30);
const duration = Number(args.duration || 16);
const preset = args.preset || 'default';
const workers = Math.max(1, Number(args.workers || Math.min(3, os.cpus().length)));
const name = outputName({ mode, width, height, preset });
const outDir = path.resolve(args.out || path.join(ROOT, 'output', name, 'frames'));
const total = Math.round(duration * fps);

let frames;
if (args.frames) frames = String(args.frames).split(',').map(Number);
else {
  const start = Number(args.start || 0);
  const end = Number(args.end || total);
  frames = [];
  for (let i = start; i < end; i++) frames.push(i);
  if (args.extra) frames.push(total);
}

fs.mkdirSync(outDir, { recursive: true });
const todo = args.force ? frames : frames.filter((i) => !fs.existsSync(framePath(i)));

function framePath(i) {
  return path.join(outDir, `frame_${String(i).padStart(5, '0')}.png`);
}

const query = new URLSearchParams({
  headless: '1', w: String(width), h: String(height), mode, preset,
  loopDuration: String(duration), fps: String(fps), msaa: String(args.msaa ?? 4),
});
for (const kv of args.param) {
  const [k, v] = String(kv).split('=');
  query.set(k, v);
}

const server = await startServer(0);
const url = `http://127.0.0.1:${server.address().port}/index.html?${query}`;
console.log(`[render] ${name}: ${todo.length}/${frames.length} frames to render with ${workers} worker(s)`);
console.log(`[render] ${url}`);

const LAUNCH_ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'];
const t0 = Date.now();
let done = 0;
let manifestInfo = null;

async function runWorker(w, list) {
  if (!list.length) return;
  const browser = await chromium.launch({ args: LAUNCH_ARGS });
  const page = await browser.newPage({ viewport: { width: 800, height: 450 } });
  const problems = [];
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`console.error: ${m.text()}`);
    if (m.type() === 'warning' && /THREE|WebGL|shader/i.test(m.text())) problems.push(`warning: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  await page.goto(url);
  await page.waitForFunction(() => window.HOLO_READY === true || window.HOLO_FAILED, null, { timeout: 180000 });
  const ok = await page.evaluate(() => window.HOLO.check());
  const errs = await page.evaluate(() => window.HOLO.errors);
  if (!ok || errs.length || problems.length) {
    throw new Error(`worker ${w}: initialisation errors\n${[...errs, ...problems].join('\n')}`);
  }
  if (!manifestInfo) manifestInfo = { info: await page.evaluate(() => window.HOLO.info()), cfg: await page.evaluate(() => window.HOLO.cfg) };

  for (const i of list) {
    const t = i / fps;
    const dataUrl = await page.evaluate((tt) => {
      window.HOLO.render(tt);
      return window.HOLO.capture('image/png');
    }, t);
    if (problems.length) throw new Error(`worker ${w}, frame ${i}:\n${problems.join('\n')}`);
    const buf = Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
    const tmp = framePath(i) + '.tmp';
    fs.writeFileSync(tmp, buf);
    fs.renameSync(tmp, framePath(i)); // atomic: an interrupted run never leaves a half-written frame
    done++;
    if (done % 10 === 0 || done === todo.length) {
      const el = (Date.now() - t0) / 1000;
      const eta = (el / done) * (todo.length - done);
      console.log(`[render] ${done}/${todo.length}  ${(el / done).toFixed(2)} s/frame  eta ${Math.round(eta)} s`);
    }
  }
  const finalCheck = await page.evaluate(() => window.HOLO.check());
  if (!finalCheck) throw new Error(`worker ${w}: GL errors after rendering: ${await page.evaluate(() => window.HOLO.errors.join('\n'))}`);
  await browser.close();
}

try {
  const lists = Array.from({ length: workers }, () => []);
  todo.forEach((f, k) => lists[k % workers].push(f));
  await Promise.all(lists.map((l, w) => runWorker(w, l)));
  const manifest = {
    name, mode, width, height, fps, duration, preset, totalFrames: total, params: args.param,
    renderedFrames: frames.length, seconds: (Date.now() - t0) / 1000, ...manifestInfo, renderedAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(outDir, '..', 'render-manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`[render] done in ${manifest.seconds.toFixed(1)} s -> ${outDir}`);
} catch (e) {
  console.error(`[render] FAILED: ${e.message}`);
  process.exitCode = 1;
} finally {
  server.close();
}
