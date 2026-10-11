// Shared helpers for the Node scripts (no extra dependencies).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function parseArgs(argv = process.argv.slice(2)) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) out[key] = true;
    else {
      out[key] = next;
      i++;
    }
  }
  return out;
}

export function framePath(dir, i) {
  return path.join(dir, `frame_${String(i).padStart(5, '0')}.png`);
}

// A frame is complete if it is a PNG that ends with an IEND chunk.
export function isCompletePng(file) {
  try {
    const st = fs.statSync(file);
    if (st.size < 64) return false;
    const fd = fs.openSync(file, 'r');
    const head = Buffer.alloc(8);
    const tail = Buffer.alloc(12);
    fs.readSync(fd, head, 0, 8, 0);
    fs.readSync(fd, tail, 0, 12, st.size - 12);
    fs.closeSync(fd);
    return head.toString('hex') === '89504e470d0a1a0a' && tail.toString('latin1', 4, 8) === 'IEND';
  } catch {
    return false;
  }
}

export function requireTool(name) {
  const r = spawnSync(name, ['-version'], { encoding: 'utf8' });
  if (r.error || r.status !== 0) {
    console.error(
      `\n✖ ${name} was not found on PATH.\n` +
        `  Install FFmpeg (https://ffmpeg.org/download.html, e.g. "sudo apt install ffmpeg" or "brew install ffmpeg")\n` +
        `  and re-run. Rendered frames are kept, so nothing has to be re-rendered.\n`,
    );
    process.exit(2);
  }
}

export function fmtDuration(sec) {
  if (!isFinite(sec)) return '--';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return h ? `${h}h${String(m).padStart(2, '0')}m` : `${m}m${String(s).padStart(2, '0')}s`;
}
