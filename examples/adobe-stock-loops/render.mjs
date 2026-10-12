// Headless renderer: serves ./web, drives Chromium (SwiftShader WebGL2) frame by frame,
// and pipes raw RGBA frames straight into ffmpeg (ProRes 422 HQ master + H.264 backup).
//
//   node render.mjs --scene A --res 1080p            full 600-frame render
//   node render.mjs --scene A --res 4k
//   node render.mjs --scene A --still 150            single PNG to out/previews
//   node render.mjs --scene A --res 1080p --frames 60 --start 0   partial test render
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { WebSocketServer } from 'ws';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(
  process.argv.slice(2).join(' ').split('--').filter(Boolean).map((s) => {
    const [k, ...v] = s.trim().split(/\s+/);
    return [k, v.join(' ') || true];
  })
);

const SCENES = {
  A: 'A-blueprint-grid-loop',
  B: 'B-hologram-knot-loop',
  C: 'C-synthwave-horizon-loop',
  D: 'D-wireframe-city-buildup',
  E: 'E-morph-sphere-loop',
  F: 'F-tunnel-warp-loop',
};
const RES = { '1080p': [1920, 1080], '4k': [4096, 2160], vertical: [1080, 1920] };

const scene = String(args.scene || 'A').toUpperCase();
const res = String(args.res || '1080p');
const [W, H] = RES[res];
const FPS = 30;
const still = args.still !== undefined ? Number(args.still) : null;
const start = still ?? Number(args.start || 0);
const count = still !== null ? 1 : Number(args.frames || 600);
const outDir = path.join(ROOT, 'out');
fs.mkdirSync(path.join(outDir, 'previews'), { recursive: true });

const base = `${SCENES[scene]}-${res}`;
let ffArgs;
if (still !== null) {
  const png = path.join(outDir, 'previews', `${SCENES[scene]}-${res}-f${String(still).padStart(3, '0')}.png`);
  ffArgs = ['-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-i', 'pipe:0',
    '-vf', 'vflip', '-frames:v', '1', png];
} else {
  const suffix = args.frames ? `-test${start}` : '';
  const color = ['-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv'];
  ffArgs = ['-y', '-v', 'error', '-stats',
    '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-framerate', String(FPS), '-i', 'pipe:0',
    '-filter_complex',
    '[0:v]vflip,split=2[a][b];' +
    '[a]scale=out_color_matrix=bt709:out_range=tv,format=yuv422p10le[pr];' +
    '[b]scale=out_color_matrix=bt709:out_range=tv,format=yuv420p[h4]',
    '-map', '[pr]', '-an', '-c:v', 'prores_ks', '-profile:v', '3', '-vendor', 'apl0',
    ...color, '-r', String(FPS), path.join(outDir, `${base}${suffix}.mov`),
    '-map', '[h4]', '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '12', '-profile:v', 'high',
    '-tune', 'animation', '-rc-lookahead', '20', ...color, '-movflags', '+faststart', '-r', String(FPS),
    path.join(outDir, `${base}${suffix}.mp4`)];
}
if (args.noenc) ffArgs = ['-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-i', 'pipe:0', '-f', 'null', '-']; // profiling
const ff = spawn('ffmpeg', ffArgs, { stdio: ['pipe', 'inherit', 'inherit'] });
const ffDone = new Promise((r) => ff.on('close', r));
// never leave an orphan encoder holding gigabytes after a failed job
process.on('exit', (code) => { if (code) ff.kill('SIGKILL'); });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
let received = 0;
let lastFrame = Date.now();
let finish;
const allDone = new Promise((r) => (finish = r));
const t0 = Date.now();

const server = http.createServer((req, res2) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'POST' && url.pathname === '/error') {
    let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => { console.error('\nPAGE ERROR:', b); process.exit(1); });
    return;
  }
  let p = url.pathname === '/' ? '/web/index.html' : url.pathname;
  const file = path.join(ROOT, decodeURIComponent(p));
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res2.statusCode = 404; return res2.end(); }
  res2.setHeader('Content-Type', MIME[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res2);
});
// Frames arrive as binary WebSocket messages, each acknowledged so the page renders one ahead at most.
// (fetch() POST bodies of this size are not released by Chromium and leak ~1 frame per frame.)
const wss = new WebSocketServer({ server, maxPayload: W * H * 4 + 1024 });
wss.on('connection', (sock) => sock.on('message', (buf) => {
  if (buf.length !== W * H * 4) { console.error(`\nbad frame size ${buf.length}`); process.exit(1); }
  const ack = () => sock.send('ok');
  ff.stdin.write(buf) ? ack() : ff.stdin.once('drain', ack);
  received++;
  lastFrame = Date.now();
  if (received % 30 === 0 || received === count) {
    const el = (Date.now() - t0) / 1000;
    process.stderr.write(`\r[${scene} ${res}] ${received}/${count}  ${(el / received).toFixed(2)}s/f  `);
  }
  if (received === count) finish();
}));
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

// Chromium is launched directly, without Playwright/CDP: with DevTools attached, the renderer keeps
// every POSTed frame body for the Network inspector and grows by gigabytes until it is OOM-killed.
const CHROME = process.env.CHROME || chromium.executablePath()
  .replace(/chromium-(\d+)\/chrome-linux\/chrome$/, 'chromium_headless_shell-$1/chrome-linux/headless_shell');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'stock-render-'));
const url = `http://127.0.0.1:${port}/web/index.html?scene=${scene}&w=${W}&h=${H}&start=${start}&count=${count}${args.nobloom ? '&nobloom=1' : ''}`;
const chrome = spawn(CHROME, ['--headless', '--no-sandbox', '--no-first-run', `--user-data-dir=${profile}`,
  '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
  '--disable-gpu-sandbox', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
  '--js-flags=--max-old-space-size=4096', '--window-size=800,600', url], { stdio: ['ignore', 'ignore', 'pipe'] });
chrome.stderr.on('data', (d) => { if (/crash|out of memory|FATAL/i.test(d)) console.error('[chrome]', String(d).trim()); });
chrome.on('exit', (code, sig) => { if (received < count) { console.error(`\nPAGE CRASHED (chrome exited ${code ?? sig})`); process.exit(1); } });
process.on('exit', () => { chrome.kill('SIGKILL'); fs.rmSync(profile, { recursive: true, force: true }); });
// Watchdog: a hung renderer stops sending frames without any error, so fail loudly instead of waiting forever.
setInterval(() => {
  if (Date.now() - lastFrame > 180000) { console.error(`\nSTALLED after ${received} frames`); process.exit(1); }
}, 10000).unref();
await allDone;
ff.stdin.end();
await ffDone;
chrome.kill();
server.close();
console.error(`\ndone ${base} in ${((Date.now() - t0) / 60000).toFixed(1)} min`);
