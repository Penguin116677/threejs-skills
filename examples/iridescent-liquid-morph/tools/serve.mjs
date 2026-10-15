#!/usr/bin/env node
// Zero-dependency static server (Node 18+). Works in Termux too: `node tools/serve.mjs`.
// Usage: node tools/serve.mjs [port]   → http://localhost:8080
import http from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, join, normalize, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.mp4': 'video/mp4', '.md': 'text/plain; charset=utf-8',
};

export function startServer(port = 8080, host = '127.0.0.1') {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = normalize(join(ROOT, url));
    if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    try {
      if (statSync(file).isDirectory()) file = join(file, 'index.html');
      statSync(file);
    } catch {
      res.writeHead(404).end('not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    createReadStream(file).pipe(res);
  });
  return new Promise((ok) => server.listen(port, host, () => ok(server)));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = +(process.argv[2] || 8080);
  // 0.0.0.0 so a phone on the same Wi-Fi can open it too (note: WebCodecs export needs localhost/https).
  const host = process.argv[3] || '0.0.0.0';
  await startServer(port, host);
  console.log(`Serving ${ROOT}\n  → http://localhost:${port}/`);
}
