// In-browser seamless-loop test (works on Android, no extra tools).
// Renders small frames into an 8-bit render target (core WebGL2, no float textures),
// reads the pixels back and compares them.
//   1. identity : t = 0  vs  t = T (must be ~identical)
//   2. seam     : frame 449 → frame 0  vs  typical frame-to-frame change
import { WebGLRenderTarget, UnsignedByteType, RGBAFormat } from 'three';
import { VIDEO } from '../config/render-config.js';
import { sampleTimeline, frameToTime } from '../animation/timeline.js';

const W = 480;
const H = 270;

function meanAbsDiff(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i += 4) {
    sum += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
  }
  return sum / ((a.length / 4) * 3);
}

export async function runLoopTest(liquid, restoreSize) {
  const rt = new WebGLRenderTarget(W, H, { type: UnsignedByteType, format: RGBAFormat, depthBuffer: true, samples: 0 });
  const grab = (t, seedOverride) => {
    const s = sampleTimeline(t);
    if (seedOverride !== undefined) s.frameIndex = seedOverride;
    liquid.update(s);
    liquid.setTargetSize(W, H);
    liquid.render(rt);
    const buf = new Uint8Array(W * H * 4);
    liquid.renderer.readRenderTargetPixels(rt, 0, 0, W, H, buf);
    return buf;
  };
  const N = VIDEO.frames;
  // timeline wraps t=T to 0, so feed the raw phase path explicitly for the identity check:
  // sampleTimeline(T) == sampleTimeline(0) by construction; we test the unwrapped maths too.
  const f0 = grab(0);
  const fT = grab(VIDEO.duration - 1e-9, 0); // as close to T as floating point allows, same grain seed
  const identity = meanAbsDiff(f0, fT);

  const seam = meanAbsDiff(grab(frameToTime(N - 1)), f0);
  const samples = [];
  for (let k = 0; k < 12; k++) {
    const n = Math.floor((k + 0.5) * (N / 12));
    samples.push(meanAbsDiff(grab(frameToTime(n)), grab(frameToTime(n + 1))));
    await new Promise((r) => setTimeout(r, 0));
  }
  rt.dispose();
  restoreSize();
  const sorted = [...samples].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const max = sorted[sorted.length - 1];
  return {
    identity,
    seam,
    median,
    max,
    identityPass: identity < 0.5, // < 0.5 / 255 average: invisible
    seamPass: seam <= max * 1.25 + 0.25,
  };
}
