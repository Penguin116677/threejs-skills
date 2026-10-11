#!/usr/bin/env node
// Deterministic, resumable frame renderer.
//
//   node scripts/render-frames.js --mode final            # 3840x2160, 450 frames
//   node scripts/render-frames.js --mode preview          # 1280x720 quick pass
//   node scripts/render-frames.js --frames 0,225,449      # specific frames only
//   node scripts/render-frames.js --start 100 --end 200   # a range (end exclusive)
//   --force      re-render frames that already exist
//   --gpu        use the hardware GPU instead of SwiftShader (much faster if available)
//   --chromium   path to a Chromium/Chrome executable (or set CHROMIUM_PATH)
//
// Each frame is a pure function of its index and is streamed straight to disk
// (write to .tmp, then rename), so an interrupted render resumes from where it
// stopped and memory use stays flat regardless of frame count.

import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import { PROFILES, TIMELINE } from '../src/config.js';
import { ROOT, parseArgs, framePath, isCompletePng, fmtDuration } from './lib.js';

const args = parseArgs();
const mode = args.mode || 'preview';
const profile = PROFILES[mode];
if (!profile) {
  console.error(`✖ Unknown --mode "${mode}". Use one of: ${Object.keys(PROFILES).join(', ')}`);
  process.exit(1);
}

const settings = {
  width: profile.width,
  height: profile.height,
  aa: args.aa ? +args.aa : profile.aa,
  maxSteps: profile.maxSteps,
  reflSteps: args['refl-steps'] !== undefined ? +args['refl-steps'] : mode === 'final' ? 40 : 24,
  tileRows: args['tile-rows'] ? +args['tile-rows'] : profile.tileRows,
};
if (mode === 'final' && settings.aa < profile.aa) {
  console.warn(`⚠ --aa ${settings.aa} is below the final profile (${profile.aa}); quality will be reduced.`);
}

const outDir = path.resolve(ROOT, args.out || profile.outDir);
fs.mkdirSync(outDir, { recursive: true });

const total = TIMELINE.frameCount;
let frames;
if (args.frames) frames = String(args.frames).split(',').map((s) => parseInt(s, 10));
else {
  const start = args.start ? +args.start : 0;
  const end = args.end ? +args.end : total;
  frames = Array.from({ length: Math.max(0, end - start) }, (_, k) => start + k);
}
const bad = frames.filter((f) => !Number.isInteger(f) || f < 0 || f >= total);
if (bad.length) {
  console.error(`✖ Invalid frame index(es): ${bad.join(', ')} (valid 0..${total - 1})`);
  process.exit(1);
}
const todo = args.force ? frames : frames.filter((f) => !isCompletePng(framePath(outDir, f)));

console.log(
  `Liquid Morph renderer — mode "${mode}" ${settings.width}x${settings.height}, ` +
    `AA ${settings.aa}x${settings.aa}, ${TIMELINE.fps} fps, ${total} frames in loop\n` +
    `Output: ${path.relative(process.cwd(), outDir)}  |  ${frames.length - todo.length} done, ${todo.length} to render`,
);
if (!todo.length) process.exit(0);

function launchArgs() {
  const a = ['--ignore-gpu-blocklist', '--disable-gpu-watchdog', '--disable-features=Vulkan'];
  if (args.gpu) a.push('--use-angle=default', '--enable-gpu');
  else a.push('--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader');
  return a;
}

async function startBrowser(url) {
  const executablePath = args.chromium || process.env.CHROMIUM_PATH || undefined;
  let browser;
  try {
    browser = await chromium.launch({ headless: true, executablePath, args: launchArgs() });
  } catch (err) {
    console.error(
      `\n✖ Could not launch Chromium: ${err.message.split('\n')[0]}\n` +
        '  Fix: run "npx playwright-core install chromium", or pass --chromium /path/to/chrome\n' +
        '       (or set CHROMIUM_PATH).',
    );
    process.exit(3);
  }
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
  page.on('pageerror', (e) => console.error('  [page error]', e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') console.error(`  [browser ${m.type()}]`, m.text());
  });
  await page.goto(url);
  await page.waitForFunction(() => window.liquidExport?.ready, null, { timeout: 30000 });
  const info = await page.evaluate((s) => window.liquidExport.init(s), settings);
  return { browser, page, info };
}

const server = await createServer({ root: ROOT, logLevel: 'error', server: { port: 0, host: '127.0.0.1' } });
await server.listen();
const addr = server.httpServer.address();
const url = `http://127.0.0.1:${addr.port}/render.html`;

let session;
try {
  session = await startBrowser(url);
} catch (err) {
  console.error(`\n✖ Export page failed to initialise:\n  ${err.message}`);
  await server.close();
  process.exit(4);
}
console.log(`WebGL: ${session.info.renderer} | buffer ${session.info.drawingBuffer.join('x')}`);
if (/swiftshader/i.test(session.info.renderer)) {
  console.log('  (software rendering — expect several seconds per 4K frame; use --gpu on a machine with a GPU)');
}

let stopping = false;
process.on('SIGINT', () => {
  if (stopping) process.exit(130);
  stopping = true;
  console.log('\nStopping after the current frame… (completed frames are kept; re-run to resume)');
});

const t0 = Date.now();
let done = 0;
for (const f of todo) {
  if (stopping) break;
  const fs0 = Date.now();
  let b64;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      b64 = await session.page.evaluate((i) => window.liquidExport.renderFrame(i), f);
      break;
    } catch (err) {
      console.error(`  ✖ frame ${f} failed (attempt ${attempt}): ${err.message.split('\n')[0]}`);
      if (attempt === 2) {
        console.error('  Giving up. Completed frames are kept — re-run the same command to resume.');
        await session.browser.close().catch(() => {});
        await server.close();
        process.exit(5);
      }
      await session.browser.close().catch(() => {});
      session = await startBrowser(url); // fresh context after a crash / context loss
    }
  }
  const file = framePath(outDir, f);
  fs.writeFileSync(file + '.tmp', Buffer.from(b64, 'base64'));
  fs.renameSync(file + '.tmp', file);
  done++;
  const elapsed = (Date.now() - t0) / 1000;
  const per = elapsed / done;
  console.log(
    `  frame ${String(f).padStart(3)}  ${((Date.now() - fs0) / 1000).toFixed(1)}s  ` +
      `[${done}/${todo.length}]  ${((done / todo.length) * 100).toFixed(1)}%  ETA ${fmtDuration(per * (todo.length - done))}`,
  );
}

await session.browser.close();
await server.close();
console.log(`Rendered ${done} frame(s) in ${fmtDuration((Date.now() - t0) / 1000)}.`);
process.exit(stopping ? 130 : 0);
