#!/usr/bin/env python3
"""Quality control for a rendered sequence and its encoded video.

usage: qc.py --frames DIR [--video FILE] [--loop] [--fps 30] [--duration 16]
             [--expect-size 3840x2160] [--handoff STORY_LAST_PNG] [--report OUT.json]

Checks
  sequence   frame count, no missing indices, consistent dimensions
  motion     per-frame difference: no duplicated frames, no jumps (> 4x median)
  exposure   mean luminance per frame, max frame-to-frame change
  clipping   share of pixels at full white
  framing    bright content stays inside the 5% safe area; copy-space side stays dark
  loop       (--loop) seam diff (last -> first) is in line with normal motion and,
             if frame N was rendered, frame N is identical to frame 0
  handoff    (--handoff) story's last frame -> loop frame 0 is a normal step
  video      ffprobe codec/size/fps/duration/frame count/audio; decodes every frame,
             checks the decoded stream has no duplicates and matches the PNGs
Exit code 1 if any check fails.
"""
import argparse, glob, json, os, subprocess, sys
import numpy as np
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('--frames', required=True)
ap.add_argument('--video')
ap.add_argument('--loop', action='store_true')
ap.add_argument('--story', action='store_true', help='opens from darkness: only bit-identical frames count as duplicates')
ap.add_argument('--fps', type=float, default=30)
ap.add_argument('--duration', type=float, default=16)
ap.add_argument('--expect-size')
ap.add_argument('--handoff')
ap.add_argument('--report')
ap.add_argument('--copy-side', choices=['left', 'right', 'none'], default='left')
a = ap.parse_args()

results = []
def check(name, ok, detail):
    results.append({'check': name, 'pass': bool(ok), 'detail': detail})
    print(f"[{'PASS' if ok else 'FAIL'}] {name}: {detail}")

N = int(round(a.fps * a.duration))
files = sorted(glob.glob(os.path.join(a.frames, 'frame_*.png')))
idx = [int(os.path.basename(f)[6:11]) for f in files]
main = [f for f, i in zip(files, idx) if i < N]
missing = sorted(set(range(N)) - set(i for i in idx if i < N))
check('sequence.count', len(main) == N and not missing, f'{len(main)}/{N} frames, missing={missing[:10]}')

W = 480  # analysis width (luma)
def load(f, w=W):
    im = Image.open(f)
    size = im.size
    g = im.convert('RGB')
    h = round(g.height * w / g.width)
    small = np.asarray(g.resize((w, h), Image.BOX), dtype=np.float32)
    return size, small

sizes, lum, means, clip, boxes, copy_energy = set(), [], [], [], [], []
prev = None
diffs = []
full_clip = []
for k, f in enumerate(main):
    size, rgb = load(f)
    sizes.add(size)
    y = rgb @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    means.append(float(y.mean()))
    if k % 40 == 0:  # full-res clipping sample
        full = np.asarray(Image.open(f).convert('RGB'))
        full_clip.append(float((full.min(axis=2) >= 254).mean()))
    # 3x3 median removes isolated ambient specks: framing is about structure
    pad = np.pad(y, 1, mode='edge')
    stack = np.stack([pad[i:i + y.shape[0], j:j + y.shape[1]] for i in range(3) for j in range(3)])
    m = np.median(stack, axis=0) > 70
    ys, xs = np.nonzero(m)
    h, w = y.shape
    if len(xs):
        boxes.append((xs.min() / w, ys.min() / h, (xs.max() + 1) / w, (ys.max() + 1) / h))
    third = slice(0, w // 3) if a.copy_side == 'left' else slice(w - w // 3, w)
    copy_energy.append(float(np.percentile(y[:, third], 99.9)) if a.copy_side != 'none' else 0.0)
    if prev is not None:
        diffs.append(float(np.abs(y - prev).mean()))
    prev = y
    lum.append(y)

check('sequence.size', len(sizes) == 1 and (not a.expect_size or f'{list(sizes)[0][0]}x{list(sizes)[0][1]}' == a.expect_size),
      f'sizes={sorted(sizes)} expected={a.expect_size}')

d = np.array(diffs)
med = float(np.median(d))
DUP = 1e-6 if a.story else 0.02
dup = [i + 1 for i, v in enumerate(d) if v < DUP]
jumps = [i + 1 for i, v in enumerate(d) if v > 4 * med + 0.25]
if a.story:
    print(f'       story: first-second steps {[round(float(x), 4) for x in d[:30:5]]}')
check('motion.no_duplicates', not dup, f'min step={d.min():.4f} median={med:.4f} duplicates at {dup[:10]}')
check('motion.no_jumps', not jumps, f'max step={d.max():.4f} (limit {4 * med + 0.25:.4f}) jumps at {jumps[:10]}')

mu = np.array(means)
dmu = np.abs(np.diff(mu))
check('exposure.stable', dmu.max() < 1.2, f'mean luma {mu.min():.2f}..{mu.max():.2f}, max frame-to-frame change {dmu.max():.3f} (8-bit levels)')
check('clipping.highlights', max(full_clip) < 0.003, f'max share of pure-white pixels {max(full_clip) * 100:.3f}% (limit 0.3%)')
dark = float(np.mean([(l < 25).mean() for l in lum[::20]]))
check('contrast.negative_space', dark > 0.45, f'{dark * 100:.1f}% of frame below luma 25 (dark negative space)')

if boxes:
    bx = np.array(boxes)
    x0, y0, x1, y1 = bx[:, 0].min(), bx[:, 1].min(), bx[:, 2].max(), bx[:, 3].max()
    inside = x0 >= 0.05 and y0 >= 0.05 and x1 <= 0.95 and y1 <= 0.95
    check('framing.safe_area', inside, f'union of bright content box x[{x0:.3f},{x1:.3f}] y[{y0:.3f},{y1:.3f}] (must lie within 0.05..0.95)')
if a.copy_side != 'none':
    ce = max(copy_energy)
    check('framing.copy_space', ce < 48, f'{a.copy_side} third: 99.9th-percentile luma max {ce:.1f} (limit 48, keeps copy area clean)')

if a.loop:
    seam = float(np.abs(lum[0] - lum[-1]).mean())
    check('loop.seam_step', seam <= max(d.max(), 1e-6) * 1.0 and seam > 0.02,
          f'last->first step {seam:.4f} vs median {med:.4f} / max {d.max():.4f}')
    nxt = os.path.join(a.frames, f'frame_{N:05d}.png')
    if os.path.exists(nxt):
        A = np.asarray(Image.open(nxt).convert('RGB'), dtype=np.int16)
        B = np.asarray(Image.open(main[0]).convert('RGB'), dtype=np.int16)
        mx = int(np.abs(A - B).max())
        check('loop.state_periodic', mx <= 1, f'frame {N} (t=T) vs frame 0: max abs pixel difference {mx}')
if a.handoff:
    _, rgb = load(a.handoff)
    y = rgb @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    step = float(np.abs(y - lum[0]).mean())
    check('handoff.story_to_loop', step <= d.max() * 1.0, f'story last -> loop first step {step:.4f} vs loop median {med:.4f} / max {d.max():.4f}')
    # If the story's frame N (t = T) was rendered, it must be pixel-identical to loop frame 0.
    sib = os.path.join(os.path.dirname(a.handoff), f'frame_{N:05d}.png')
    if os.path.exists(sib):
        A = np.asarray(Image.open(sib).convert('RGB'), dtype=np.int16)
        B = np.asarray(Image.open(main[0]).convert('RGB'), dtype=np.int16)
        mx = int(np.abs(A - B).max())
        check('handoff.state_identical', mx <= 1, f'story frame {N} vs loop frame 0: max abs pixel difference {mx}')

if a.video:
    pr = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', a.video]))
    vs = [s for s in pr['streams'] if s['codec_type'] == 'video']
    au = [s for s in pr['streams'] if s['codec_type'] == 'audio']
    v = vs[0]
    num, den = map(int, v['r_frame_rate'].split('/'))
    fr = num / den
    nb = int(v.get('nb_read_frames', 0))
    dur = float(pr['format']['duration'])
    meta = dict(codec=v['codec_name'], profile=v.get('profile'), size=f"{v['width']}x{v['height']}", fps=round(fr, 3),
                frames=nb, duration=round(dur, 3), pix_fmt=v.get('pix_fmt'), field_order=v.get('field_order', 'progressive'),
                bitrate_mbps=round(int(pr['format']['bit_rate']) / 1e6, 1), audio_streams=len(au), size_mb=round(os.path.getsize(a.video) / 1e6, 1),
                color=f"{v.get('color_primaries')}/{v.get('color_transfer')}/{v.get('color_space')}")
    exp_size = a.expect_size
    ok = (meta['codec'] == 'h264' and abs(fr - a.fps) < 1e-6 and nb == N and abs(dur - a.duration) < 0.05 and not au
          and (not exp_size or meta['size'] == exp_size) and meta['field_order'] in ('progressive', None))
    check('video.metadata', ok, json.dumps(meta))
    # Decode every frame at analysis size and verify continuity + order against PNGs.
    vw = W
    vh = round(v['height'] * vw / v['width'])
    raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', a.video, '-vf', f'scale={vw}:{vh}:flags=area,format=gray', '-f', 'rawvideo', '-'])
    fr_arr = np.frombuffer(raw, np.uint8).reshape(-1, vh, vw).astype(np.float32)
    vd = np.abs(np.diff(fr_arr, axis=0)).mean(axis=(1, 2))
    vdup = [i + 1 for i, x in enumerate(vd) if x < DUP]
    check('video.decoded_continuity', len(fr_arr) == N and not vdup, f'decoded {len(fr_arr)} frames, min step {vd.min():.4f}, duplicates at {vdup[:10]}')
    errs = []
    for k in [0, N // 4, N // 2, 3 * N // 4, N - 1]:
        # order is only testable where neighbouring frames differ (a story opens on near-black)
        while k < N - 2 and float(np.abs(lum[k] - lum[k + 1]).mean()) < 0.1:
            k += 1
        ref = lum[k] if lum[k].shape == fr_arr[k].shape else None
        if ref is None:
            continue
        own = float(np.abs(fr_arr[k] - ref).mean())
        nb_ = float(np.abs(fr_arr[k] - lum[k - 1 if k else k + 1]).mean())
        errs.append((k, round(own, 3), round(nb_, 3)))
    ordered = all(o < n for _, o, n in errs)
    check('video.frame_order', ordered, f'(frame, err vs own PNG, err vs neighbour PNG): {errs}')

summary = {'frames': a.frames, 'video': a.video, 'pass': all(r['pass'] for r in results), 'results': results,
           'motion': {'median_step': med, 'max_step': float(d.max())}}
if a.report:
    os.makedirs(os.path.dirname(os.path.abspath(a.report)), exist_ok=True)
    json.dump(summary, open(a.report, 'w'), indent=2)
print('QC', 'PASSED' if summary['pass'] else 'FAILED')
sys.exit(0 if summary['pass'] else 1)
