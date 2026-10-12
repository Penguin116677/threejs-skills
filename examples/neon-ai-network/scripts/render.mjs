// Offline, deterministic frame renderer.
//
// Launches headless Chromium (Playwright), opens render.html at the exact
// output resolution, renders every frame on the fixed virtual timeline
// (t = frame / fps), writes lossless PNGs, then encodes an H.264 MP4.
// Wall-clock speed never affects the result; slow software rendering just
// takes longer.
//
//   node scripts/render.mjs                       # 3840x2160, 30 fps, 15 s -> renders/…mp4
//   node scripts/render.mjs --width 1920 --height 1080 --out renders/preview.mp4
//   node scripts/render.mjs --start 100 --end 120 --no-encode   # partial range
//   node scripts/render.mjs --params "glow=1.2&seed=7"          # look overrides
//
// Options: --width --height --fps --duration --frames-dir --out --start --end
//          --list 0,90,450 (render only these frames, implies --no-encode)
//          --workers N --skip-existing --no-encode --crf --params --chromium PATH
//          --gl swiftshader|gpu
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { startServer, frameName } from './server.mjs';
import { encode } from './encode.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const has = (k) => args.includes(k);
const get = (k, d) => (has(k) ? args[args.indexOf(k) + 1] : d);

const width = Number(get('--width', 3840));
const height = Number(get('--height', 2160));
const fps = Number(get('--fps', 30));
const duration = Number(get('--duration', 15));
const frames = Math.round(fps * duration);
const start = Number(get('--start', 0));
const end = Math.min(Number(get('--end', has('--list') ? frames : frames - 1)), frames); // --end frames => also render the seam check frame
const label = `${width}x${height}`;
const framesDir = path.resolve(ROOT, get('--frames-dir', `frames/${label}`));
const out = path.resolve(ROOT, get('--out', `renders/neon-ai-network_${label}_${fps}fps.mp4`));
const workers = Math.max(1, Number(get('--workers', 1)));
const skipExisting = has('--skip-existing');
const extraParams = get('--params', '');

function chromiumPath() {
  if (get('--chromium')) return get('--chromium');
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  return undefined; // Playwright's own browser
}

// --gl swiftshader (default): CPU rasteriser, works everywhere, slower.
// --gl gpu: let Chromium use the machine's GPU (ANGLE default backend).
// Output is visually equivalent; pixel-exact determinism is guaranteed only
// within one backend/driver, so render a whole sequence with one setting.
const GL = get('--gl', 'swiftshader');
const RECYCLE_EVERY = 40; // frames per page load
const LAUNCH_ARGS = [
  ...(GL === 'gpu' ? ['--use-angle=default', '--enable-gpu'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']),
  '--ignore-gpu-blocklist',
  '--enable-webgl',
  '--disable-gpu-watchdog',
  '--disable-renderer-backgrounding',
  '--disable-background-timer-throttling',
];

async function main() {
  console.log(`Rendering ${label} @ ${fps} fps, frames ${start}..${end} of ${frames}, ${workers} worker(s)`);
  console.log(`frames -> ${path.relative(ROOT, framesDir)}`);
  const { server, port } = await startServer({ port: 0, framesDir, quiet: true });

  const query = new URLSearchParams(extraParams);
  query.set('width', width);
  query.set('height', height);
  query.set('fps', fps);
  query.set('duration', duration);
  const url = `http://127.0.0.1:${port}/render.html?${query}`;

  const todo = [];
  const list = get('--list') ? get('--list').split(',').map(Number) : null;
  for (let i = start; i <= end; i++) {
    if (list && !list.includes(i)) continue;
    if (skipExisting && fs.existsSync(path.join(framesDir, frameName(i)))) continue;
    todo.push(i);
  }

  const t0 = Date.now();
  let done = 0;
  const runWorker = async (w) => {
    const browser = await chromium.launch({ executablePath: chromiumPath(), args: LAUNCH_ARGS });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on('console', (m) => m.type() === 'error' && console.error(`[page ${w}] ${m.text()}`));
    page.on('pageerror', (e) => console.error(`[page ${w}] ${e.message}`));
    const load = async () => {
      await page.goto(url);
      await page.waitForFunction(() => window.neonReady === true, null, { timeout: 120000 });
    };
    await load();
    if (w === 0) console.log('network:', JSON.stringify(await page.evaluate(() => window.neonRender.stats)));
    let sinceLoad = 0;
    for (let k = w; k < todo.length; k += workers) {
      const i = todo[k];
      // Chromium frees PNG blobs lazily; at 4K the blob store can fill up
      // (ERR_BLOB_OUT_OF_MEMORY). Reload the page periodically and retry on
      // failure — safe because every frame is a pure function of its index.
      if (sinceLoad >= RECYCLE_EVERY) {
        await load();
        sinceLoad = 0;
      }
      for (let attempt = 1; ; attempt++) {
        try {
          await page.evaluate((idx) => window.neonRender.frame(idx), i);
          break;
        } catch (err) {
          if (attempt >= 3) throw err;
          console.warn(`[worker ${w}] frame ${i} failed (${err.message.split('\n')[0]}); reloading and retrying`);
          await load();
          sinceLoad = 0;
        }
      }
      sinceLoad++;
      done++;
      if (done % 10 === 0 || done === todo.length) {
        const el = (Date.now() - t0) / 1000;
        const eta = (el / done) * (todo.length - done);
        console.log(`  ${done}/${todo.length} frames  ${(el / done).toFixed(2)} s/frame  ETA ${Math.round(eta)} s`);
      }
    }
    await browser.close();
  };
  await Promise.all(Array.from({ length: workers }, (_, w) => runWorker(w)));
  server.close();
  console.log(`rendered ${todo.length} frames in ${((Date.now() - t0) / 1000).toFixed(1)} s`);

  if (!has('--no-encode') && !has('--list')) {
    encode({ framesDir, fps, frames, out, crf: Number(get('--crf', height > 1080 ? 14 : 16)), height });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
