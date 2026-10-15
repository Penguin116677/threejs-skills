#!/usr/bin/env node
// Deterministic PNG-sequence renderer (desktop / server / CI).
// Opens the project in headless Chromium via Playwright and renders every frame at an
// exact timestamp (frame n → t = n / 30). Output: frames/frame_00000.png … frame_00449.png
//
//   npm install            (once — installs playwright)
//   npx playwright install chromium
//   node tools/render-frames.mjs --ssaa 2 --out frames
//
// Options:
//   --out DIR        output folder (default: frames)
//   --start N        first frame (default 0)          --end N   last frame, inclusive (default 449)
//   --ssaa 1|2       supersampling: 2 renders 3840×2160 per frame; encode-h264.sh downsamples (default 2)
//   --quality q      low | medium | high (default high)
//   --loopcheck      also render t = 15.000 s as loopcheck_T.png (must match frame_00000.png)
//   --gpu            use the machine's GPU instead of SwiftShader (faster; results can differ by ±1 LSB)
//   --port N         local server port (default 8123)
//   --w N --h N      output size (default 1920×1080; smaller = quick motion previews)
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { startServer } from './serve.mjs';

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : def;
};
const flag = (name) => args.includes(`--${name}`);

const out = resolve(opt('out', 'frames'));
const start = +opt('start', 0);
const ssaa = +opt('ssaa', 2);
const quality = opt('quality', 'high');
const port = +opt('port', 8123);
const W = +opt('w', 1920);
const H = +opt('h', 1080);

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    // fall back to a globally installed playwright
    const root = execSync('npm root -g').toString().trim();
    return createRequire(join(root, 'noop.js'))('playwright');
  }
}

const { chromium } = await loadPlaywright();
const server = await startServer(port);
const launchArgs = flag('gpu')
  ? ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=default']
  : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const executablePath = process.env.CHROMIUM_PATH || undefined;
const browser = await chromium.launch({ args: launchArgs, executablePath });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log(`[page ${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => console.log(`[page error] ${e.message}`));

const url = `http://localhost:${port}/index.html?mode=capture&ui=0&q=${quality}&w=${W}&h=${H}&ssaa=${ssaa}`;
await page.goto(url);
await page.waitForFunction(() => window.ILM && window.ILM.ready, null, { timeout: 60000 });
const info = await page.evaluate(() => ({ size: window.ILM.bufferSize, ssaa: window.ILM.ssaa, gpu: window.ILM.caps.gpu, frames: window.ILM.VIDEO.frames, vtx: window.ILM.vertexCount }));
const end = +opt('end', info.frames - 1);
console.log(`GPU: ${info.gpu}\nBuffer ${info.size.join('×')} (SSAA ${info.ssaa}×), ${info.vtx} vertices, frames ${start}..${end}`);
if (info.ssaa !== ssaa) console.log(`! SSAA ${ssaa} not possible on this GPU (max buffer too small) — using ${info.ssaa}`);

mkdirSync(out, { recursive: true });
const t0 = Date.now();
for (let n = start; n <= end; n++) {
  const file = join(out, `frame_${String(n).padStart(5, '0')}.png`);
  if (flag('resume') && existsSync(file)) continue;
  const b64 = await page.evaluate((i) => window.ILM.framePNG(i), n);
  writeFileSync(file, Buffer.from(b64, 'base64'));
  const done = n - start + 1;
  const per = (Date.now() - t0) / 1000 / done;
  const line = `  frame ${n} (${done}/${end - start + 1})  ${per.toFixed(2)} s/frame  ETA ${Math.round(per * (end - n))} s`;
  if (process.stdout.isTTY) process.stdout.write(`\r${line}   `);
  else if (done % 30 === 0 || n === end) console.log(line);
}
process.stdout.write('\n');
if (flag('loopcheck')) {
  // t just below T on the unwrapped maths would be frame 450 == frame 0.
  const b64 = await page.evaluate((T) => window.ILM.timePNG(T), info.frames / 30);
  writeFileSync(join(out, 'loopcheck_T.png'), Buffer.from(b64, 'base64'));
  console.log('  wrote loopcheck_T.png (compare with frame_00000.png)');
}
await browser.close();
server.close();
console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(0)} s → ${out}`);
