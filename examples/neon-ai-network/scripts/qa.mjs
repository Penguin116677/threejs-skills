// Quality assurance for a rendered clip.
//
//   node scripts/qa.mjs --video renders/x.mp4 [--frames-dir frames/3840x2160] [--fps 30] [--duration 15]
//
// Checks (results -> qa/<video-name>.json + .md, contact sheet -> qa/<video-name>_sheet.jpg):
//   1. Container/stream: codec, profile, pixel format, dimensions, frame rate,
//      exact frame count and duration (ffprobe, frames counted by decoding).
//   2. Temporal stability: per-frame mean luma and mean absolute frame-to-frame
//      difference; spikes vs. the local median flag flicker / popping.
//   3. Loop seam: the wrap-around difference (last frame -> first frame) is
//      compared with ordinary consecutive-frame differences; and, if the
//      renderer's seam frame (frame_<N>.png, t = duration) exists, it must be
//      pixel-identical to frame_0000.png.
//   4. Exposure: share of near-clipped pixels per frame.
import { spawnSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const get = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const video = path.resolve(ROOT, get('--video', 'renders/neon-ai-network_3840x2160_30fps.mp4'));
const framesDir = get('--frames-dir') ? path.resolve(ROOT, get('--frames-dir')) : null;
const fps = Number(get('--fps', 30));
const duration = Number(get('--duration', 15));
const expectedFrames = Math.round(fps * duration);
const AW = 960, AH = 540; // analysis resolution

const qaDir = path.join(ROOT, 'qa');
fs.mkdirSync(qaDir, { recursive: true });
const base = path.basename(video, path.extname(video));

function run(cmd, a) {
  const r = spawnSync(cmd, a, { encoding: 'utf8', maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error(`${cmd} failed: ${r.stderr}`);
  return r.stdout;
}

function probe() {
  const j = JSON.parse(run('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries',
    'stream=codec_name,profile,level,pix_fmt,width,height,r_frame_rate,avg_frame_rate,nb_read_frames,duration,bit_rate,color_space,color_transfer,color_primaries,color_range:format=duration,size,format_name',
    '-of', 'json', video]));
  const audio = JSON.parse(run('ffprobe', ['-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=index', '-of', 'json', video]));
  return { ...j.streams[0], format: j.format, audioStreams: (audio.streams || []).length };
}

function analyse() {
  return new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', ['-v', 'error', '-i', video, '-vf', `scale=${AW}:${AH}:flags=area:out_range=full,format=gray`, '-f', 'rawvideo', '-']);
    const size = AW * AH;
    let buf = Buffer.alloc(0);
    let prev = null, first = null;
    const rows = [];
    ff.stdout.on('data', (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      while (buf.length >= size) {
        const f = buf.subarray(0, size);
        buf = buf.subarray(size);
        let sum = 0, clip = 0, diff = 0;
        for (let i = 0; i < size; i++) {
          const v = f[i];
          sum += v;
          if (v >= 250) clip++;
          if (prev) diff += Math.abs(v - prev[i]);
        }
        rows.push({ mean: sum / size, clipPct: (100 * clip) / size, diff: prev ? diff / size : null });
        const copy = Buffer.from(f);
        if (!first) first = copy;
        prev = copy;
      }
    });
    ff.on('close', (code) => {
      if (code !== 0) return reject(new Error('ffmpeg decode failed'));
      let seam = 0;
      for (let i = 0; i < size; i++) seam += Math.abs(first[i] - prev[i]);
      resolve({ rows, seamDiff: seam / size });
    });
  });
}

function median(a) {
  const s = [...a].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
}

function pngIdentical(a, b) {
  // Decode both PNGs to raw RGB and compare byte-for-byte.
  const dec = (f) => spawnSync('ffmpeg', ['-v', 'error', '-i', f, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 30 }).stdout;
  const A = dec(a), B = dec(b);
  if (A.length !== B.length) return { identical: false, maxDiff: Infinity };
  let maxDiff = 0, n = 0;
  for (let i = 0; i < A.length; i++) {
    const d = Math.abs(A[i] - B[i]);
    if (d) n++;
    if (d > maxDiff) maxDiff = d;
  }
  return { identical: n === 0, differingBytes: n, maxDiff };
}

function contactSheet() {
  const out = path.join(qaDir, `${base}_sheet.jpg`);
  const picks = [0, 45, 90, 135, 180, 210, 240, 270, 300, 330, 360, 390, 405, 420, 435, expectedFrames - 1];
  const sel = picks.map((n) => `eq(n\\,${n})`).join('+');
  run('ffmpeg', ['-v', 'error', '-y', '-i', video, '-vf', `select='${sel}',scale=480:270,tile=4x4:padding=4:color=0x202020`, '-frames:v', '1', '-q:v', '3', out]);
  return out;
}

const report = { video: path.relative(ROOT, video), checkedAt: new Date().toISOString(), checks: [] };
const check = (name, pass, detail) => {
  report.checks.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name} — ${detail}`);
};

const p = probe();
report.probe = p;
const [rn, rd] = p.r_frame_rate.split('/').map(Number);
const frameCount = Number(p.nb_read_frames);
const dur = Number(p.format.duration);
check('codec', p.codec_name === 'h264', `${p.codec_name} ${p.profile} level ${p.level}, ${p.pix_fmt}`);
check('dimensions', p.width && p.height && fs.existsSync(video), `${p.width}x${p.height}`);
check('frame rate', Math.abs(rn / rd - fps) < 1e-6, `${p.r_frame_rate} (avg ${p.avg_frame_rate})`);
check('frame count', frameCount === expectedFrames, `${frameCount} decoded frames (expected ${expectedFrames})`);
check('duration', Math.abs(dur - duration) < 0.5 / fps, `${dur.toFixed(4)} s`);
check('no audio track', p.audioStreams === 0, `${p.audioStreams} audio streams`);
check('colour tags', p.color_space === 'bt709' && p.color_primaries === 'bt709' && p.color_transfer === 'bt709', `${p.color_space}/${p.color_primaries}/${p.color_transfer}, range ${p.color_range}`);

const { rows, seamDiff } = await analyse();
const diffs = rows.slice(1).map((r) => r.diff);
const med = median(diffs);
const spikes = [];
for (let i = 1; i < rows.length; i++) {
  const local = median(diffs.slice(Math.max(0, i - 6), Math.min(diffs.length, i + 5)));
  if (rows[i].diff > Math.max(3 * local, local + 1.0)) spikes.push({ frame: i, diff: +rows[i].diff.toFixed(3), localMedian: +local.toFixed(3) });
}
const lumaJumps = [];
for (let i = 1; i < rows.length; i++) {
  const d = Math.abs(rows[i].mean - rows[i - 1].mean);
  if (d > 1.5) lumaJumps.push({ frame: i, delta: +d.toFixed(2) });
}
check('temporal stability (no difference spikes)', spikes.length === 0, `${spikes.length} spikes; median frame diff ${med.toFixed(3)}, max ${Math.max(...diffs).toFixed(3)}`);
check('no global brightness flicker', lumaJumps.length === 0, `${lumaJumps.length} frames with mean-luma jump > 1.5/255`);
const neighbourhood = [...diffs.slice(0, 5), ...diffs.slice(-5)];
const seamRef = Math.max(...neighbourhood);
check('loop seam (last -> first)', seamDiff <= Math.max(seamRef * 1.5, 0.05), `wrap diff ${seamDiff.toFixed(3)} vs neighbouring consecutive diffs ≤ ${seamRef.toFixed(3)}`);
const maxClip = Math.max(...rows.map((r) => r.clipPct));
check('no harsh clipping', maxClip < 0.5, `max ${maxClip.toFixed(3)}% of pixels ≥ 250/255 in any frame`);
const meanLuma = rows.map((r) => r.mean);
report.luma = { min: Math.min(...meanLuma), max: Math.max(...meanLuma), first: meanLuma[0], last: meanLuma.at(-1) };
report.spikes = spikes;
report.perFrame = rows.map((r, i) => ({ frame: i, mean: +r.mean.toFixed(3), diff: r.diff === null ? null : +r.diff.toFixed(4), clipPct: +r.clipPct.toFixed(4) }));

if (framesDir) {
  const f0 = path.join(framesDir, 'frame_0000.png');
  const fN = path.join(framesDir, `frame_${String(expectedFrames).padStart(4, '0')}.png`);
  if (fs.existsSync(f0) && fs.existsSync(fN)) {
    const r = pngIdentical(f0, fN);
    check('seam frame t=duration reproduces frame 0', r.identical, r.identical ? 'pixel-identical' : `${r.differingBytes} bytes differ, max ${r.maxDiff}`);
  } else {
    console.log(`skip  seam-frame check (render it with: node scripts/render.mjs --list ${expectedFrames} --width W --height H)`);
  }
  const pngs = fs.readdirSync(framesDir).filter((f) => /^frame_\d{4}\.png$/.test(f));
  const seq = pngs.filter((f) => Number(f.slice(6, 10)) < expectedFrames).length;
  check('PNG sequence complete', seq === expectedFrames, `${seq} PNGs for frames 0..${expectedFrames - 1}`);
}

report.sheet = path.relative(ROOT, contactSheet());
report.allPassed = report.checks.every((c) => c.pass);
fs.writeFileSync(path.join(qaDir, `${base}.json`), JSON.stringify(report, null, 2));
const md = [`# QA — ${report.video}`, '', `Checked ${report.checkedAt}`, '', '| Check | Result | Detail |', '|---|---|---|',
  ...report.checks.map((c) => `| ${c.name} | ${c.pass ? 'PASS' : '**FAIL**'} | ${c.detail} |`), '',
  `Mean luma range ${report.luma.min.toFixed(2)}–${report.luma.max.toFixed(2)} (first ${report.luma.first.toFixed(2)}, last ${report.luma.last.toFixed(2)}).`, '',
  `Contact sheet: \`${report.sheet}\``, ''].join('\n');
fs.writeFileSync(path.join(qaDir, `${base}.md`), md);
console.log(`\n${report.allPassed ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED'} — report: qa/${base}.md`);
process.exit(report.allPassed ? 0 : 2);
