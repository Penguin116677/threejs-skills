// Headless render entry. Driven by scripts/render.mjs through Playwright:
//   await window.neonRender.frame(i)  -> renders frame i, uploads a PNG to the
//                                        local server, resolves when written.
import { NeonNetwork } from './NeonNetwork.js';
import { parseConfig, totalFrames } from './config.js';

const config = parseConfig(location.search);
const canvas = document.getElementById('c');
const net = new NeonNetwork(canvas, config, { preserveDrawingBuffer: true });
net.setSize(config.width, config.height);

const gl = net.renderer.getContext();

async function upload(blob, index) {
  const res = await fetch(`/__frame/${index}`, { method: 'POST', body: blob });
  if (!res.ok) throw new Error(`upload failed for frame ${index}: ${res.status}`);
}

window.neonRender = {
  config,
  frames: totalFrames(config),
  stats: net.network.stats,
  // Renders the frame at time = index / fps. Index may equal `frames` to check
  // the loop seam (it must reproduce frame 0 exactly).
  async frame(index, { save = true } = {}) {
    const t = index / config.fps;
    const state = net.renderAt(t, index);
    gl.finish();
    if (!save) return state;
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    await upload(blob, index);
    return state;
  },
};
window.neonNet = net;
window.neonReady = true;
