// Tiny dependency-free static server.
//  - serves the project (preview at /, offline renderer at /render.html)
//  - accepts POST /__frame/<n> and writes <framesDir>/frame_<nnnn>.png
//
//   node scripts/server.mjs [--port 5173] [--frames-dir frames/4k]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp4': 'video/mp4', '.svg': 'image/svg+xml' };

export function frameName(index) {
  return `frame_${String(index).padStart(4, '0')}.png`;
}

export function startServer({ port = 5173, framesDir = path.join(ROOT, 'frames', 'default'), quiet = false } = {}) {
  fs.mkdirSync(framesDir, { recursive: true });
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'POST' && url.pathname.startsWith('/__frame/')) {
      const index = Number(url.pathname.split('/').pop());
      if (!Number.isInteger(index) || index < 0) return res.writeHead(400).end();
      const chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        const file = path.join(framesDir, frameName(index));
        fs.writeFile(file, Buffer.concat(chunks), (err) => res.writeHead(err ? 500 : 204).end());
      });
      return;
    }
    let rel = decodeURIComponent(url.pathname);
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.join(ROOT, path.normalize(rel));
    if (!file.startsWith(ROOT)) return res.writeHead(403).end();
    fs.readFile(file, (err, data) => {
      if (err) return res.writeHead(404).end('not found');
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(data);
    });
  });
  return new Promise((resolve) =>
    server.listen(port, '127.0.0.1', () => {
      const actual = server.address().port;
      if (!quiet) console.log(`Neon AI Network server: http://localhost:${actual}/  (frames -> ${path.relative(ROOT, framesDir)})`);
      resolve({ server, port: actual });
    }),
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const get = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
  startServer({ port: Number(get('--port', 5173)), framesDir: path.resolve(ROOT, get('--frames-dir', 'frames/preview')) });
}
