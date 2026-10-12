import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FPS, LOOP } from './lib.js';

const q = new URLSearchParams(location.search);
const W = +q.get('w'), H = +q.get('h');
const start = +q.get('start'), count = +q.get('count');

async function run() {
  const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, alpha: false });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  document.body.appendChild(renderer.domElement);

  // px = line-width multiplier so lines keep the same visual weight at 1080p and 4K.
  const ctx = { W, H, px: H / 1080, aspect: W / H, renderer };
  const mod = await import(`./scenes/${q.get('scene')}.js`);
  const S = mod.create(ctx);

  // 4x MSAA on the HDR scene target; bloom and output run on top of the resolved image.
  const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(1);
  composer.setSize(W, H);
  composer.addPass(new RenderPass(S.scene, S.camera));
  const b = S.bloom || {};
  // Bloom resolution is doubled so its first mip runs at full frame size: thin lines are blurred
  // *before* decimation. At the default half size the 2x2 decimation aliases 1–2 px lines into
  // crawling "dashes" in the glow, which flickers in motion.
  const bloom = new UnrealBloomPass(new THREE.Vector2(W * 2, H * 2), b.strength ?? 0.6, b.radius ?? 0.35, b.threshold ?? 0.2);
  composer.addPass(bloom);
  bloom.setSize(W * 2, H * 2); // addPass() resets it to the composer size
  composer.addPass(new OutputPass());
  if (q.has('nobloom')) bloom.enabled = false; // debug: inspect raw lines

  const gl = renderer.getContext();
  const buf = new Uint8Array(W * H * 4);
  for (let i = start; i < start + count; i++) {
    const t = i / FPS;
    S.update(t, (t % LOOP) / LOOP, bloom);
    composer.render();
    gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    const r = await fetch('/frame?i=' + i, { method: 'POST', body: buf });
    await r.text();
  }
}
run().catch((e) => fetch('/error', { method: 'POST', body: String(e && e.stack || e) }));
