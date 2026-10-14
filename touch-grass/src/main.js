import * as THREE from 'three';
import { samplePalette, setMoonAzimuth } from './scene/palette.js';
import { shared } from './scene/shared.js';
import { createTerrain, heightAt, intersectTerrain, HILL } from './scene/terrain.js';
import { createTrail } from './scene/trail.js';
import { createGrass } from './scene/grass.js';
import { createSky } from './scene/sky.js';
import { createClouds } from './scene/clouds.js';
import { createTree } from './scene/tree.js';
import { createFireflies } from './scene/fireflies.js';
import { createPost } from './scene/post.js';
import { createUI } from './ui.js';

// ---------------------------------------------------------------- quality
const params = new URLSearchParams(location.search);
const isMobile =
  matchMedia('(pointer: coarse)').matches || Math.min(screen.width, screen.height) < 700;
const quality = isMobile
  ? { blades: 60000, flowers: 1400, fireflies: 90, leafCards: 5000, detail: 7, samples: 0, maxDpr: 1.5 }
  : { blades: 160000, flowers: 3600, fireflies: 170, leafCards: 10000, detail: 10, samples: 4, maxDpr: 2 };
if (params.has('blades')) quality.blades = Number(params.get('blades'));
if (params.has('samples')) quality.samples = Number(params.get('samples'));

// --------------------------------------------------------------- renderer
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false, // MSAA happens in the composer's render target
  powerPreference: 'high-performance',
  stencil: false
});
let pixelRatio = Math.min(window.devicePixelRatio || 1, quality.maxDpr);
renderer.setPixelRatio(pixelRatio);
renderer.setSize(innerWidth, innerHeight, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
shared.uPixelRatio.value = pixelRatio;

const scene = new THREE.Scene();

// ----------------------------------------------------------------- camera
// Sitting in the grass at the foot of the hill, looking up at the tree.
const EYE = 0.62;
const camBase = new THREE.Vector3(0, heightAt(0, 0) + EYE, 0);
const lookBase = new THREE.Vector3(0, HILL.top + 8.1, HILL.z);
const camBreak = new THREE.Vector3(0, heightAt(0, -2.6) + EYE - 0.16, -2.6);
const lookBreak = new THREE.Vector3(0, HILL.top + 6.9, HILL.z);

const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.05, 1500);
camera.position.copy(camBase);

function fovFor(aspect) {
  // Portrait screens get a taller view so the tree and hill both fit.
  return aspect >= 1 ? 40 : THREE.MathUtils.clamp(40 / Math.pow(aspect, 0.55), 40, 64);
}
function halfTanFor(aspect, fov) {
  return Math.tan(THREE.MathUtils.degToRad(fov / 2)) * Math.max(aspect, 1) * 1.12;
}

// ------------------------------------------------------------------ world
const field = {
  camera: { x: camBase.x, z: camBase.z },
  near: 2.4,
  far: 50,
  halfTan: halfTanFor(Math.max(innerWidth / innerHeight, 1.9), 40)
};
const trailBounds = { minX: -50, maxX: 50, minZ: -54, maxZ: 3 };

const trail = createTrail(renderer, trailBounds, isMobile ? 256 : 512);
const terrain = createTerrain();
const grass = createGrass({ count: quality.blades, flowerCount: quality.flowers, field, trail });
const sky = createSky();
const clouds = createClouds({ count: isMobile ? 10 : 14 });
const tree = createTree({
  position: new THREE.Vector3(0, heightAt(0, HILL.z) - 0.15, HILL.z),
  leafCards: quality.leafCards,
  detail: quality.detail
});
const fireflies = createFireflies({ count: quality.fireflies, field });

scene.add(sky.group, clouds.group, terrain.mesh, tree.group, grass.group, fireflies.points);

const post = createPost(renderer, scene, camera, { samples: quality.samples });

// --------------------------------------------------------------------- UI
let breakTarget = 0;
const ui = createUI({
  onBreakChange(on) {
    breakTarget = on ? 1 : 0;
  }
});

// ------------------------------------------------------------ time of day
const startTime = params.has('t') ? THREE.MathUtils.clamp(Number(params.get('t')), 0, 1) : 0;
let timeOfDay = startTime;
let timeTarget = startTime;
let palette = samplePalette(timeOfDay);

// ------------------------------------------------------------------ input
const pointer = {
  ndc: new THREE.Vector2(),
  smooth: new THREE.Vector2(),
  inside: false,
  down: false,
  dragX: 0,
  id: null
};
const isUI = (el) => el instanceof Element && el.closest('a, button, .card, .break-pill');

function setNdc(e) {
  pointer.ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
}

window.addEventListener('pointerdown', (e) => {
  if (isUI(e.target) || pointer.down) return;
  pointer.down = true;
  pointer.id = e.pointerId;
  pointer.dragX = e.clientX;
  pointer.inside = true;
  setNdc(e);
  document.body.classList.add('dragging');
  canvas.setPointerCapture?.(e.pointerId);
});

window.addEventListener('pointermove', (e) => {
  setNdc(e);
  if (e.pointerType === 'mouse') pointer.inside = !isUI(e.target) || pointer.down;
  if (pointer.down && e.pointerId === pointer.id) {
    const dx = e.clientX - pointer.dragX;
    pointer.dragX = e.clientX;
    // A full sweep across ~85% of the screen runs day → night.
    timeTarget = THREE.MathUtils.clamp(timeTarget + dx / (innerWidth * 0.85), 0, 1);
    if (Math.abs(dx) > 0) document.body.classList.add('hint-done');
  }
});

function endDrag(e) {
  if (!pointer.down || (e && e.pointerId !== pointer.id)) return;
  pointer.down = false;
  pointer.id = null;
  document.body.classList.remove('dragging');
  if (e && e.pointerType !== 'mouse') pointer.inside = false;
}
window.addEventListener('pointerup', endDrag);
window.addEventListener('pointercancel', endDrag);
document.documentElement.addEventListener('pointerleave', () => {
  if (!pointer.down) pointer.inside = false;
});
window.addEventListener('blur', () => {
  endDrag();
  pointer.inside = false;
});

window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLElement && e.target.closest('input, textarea')) return;
  if (e.key === 'ArrowRight') timeTarget = Math.min(1, timeTarget + 0.1);
  if (e.key === 'ArrowLeft') timeTarget = Math.max(0, timeTarget - 0.1);
});

// ----------------------------------------------------------------- resize
let rebuildTimer = 0;
function resize() {
  const w = innerWidth;
  const h = innerHeight;
  const aspect = w / h;
  camera.aspect = aspect;
  camera.fov = fovFor(aspect);
  camera.updateProjectionMatrix();
  setMoonAzimuth(THREE.MathUtils.radToDeg(Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * aspect)));
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(w, h, false);
  post.setSize(w, h, pixelRatio);
  shared.uPixelRatio.value = pixelRatio;

  // Widen the grass field if the window became wider than it covers.
  const need = halfTanFor(aspect, camera.fov);
  if (need > grass.halfTan * 1.04) {
    clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(() => grass.rebuild(need * 1.05), 250);
  }
}
window.addEventListener('resize', resize);
resize();

// ------------------------------------------------------- adaptive quality
// If the GPU can't hold ~60fps, step the resolution down (never below 1x).
const perf = { frames: 0, time: 0, settled: false };
function adapt(dt) {
  if (perf.settled) return;
  perf.frames++;
  perf.time += dt;
  if (perf.frames < 90) return;
  const fps = perf.frames / perf.time;
  perf.frames = 0;
  perf.time = 0;
  if (fps < 50 && pixelRatio > 1) {
    pixelRatio = Math.max(1, pixelRatio - 0.25);
    resize();
  } else if (fps >= 55) {
    perf.settled = true;
  }
}

// ------------------------------------------------------------------- loop
const timer = new THREE.Timer();
timer.connect(document);
const raycaster = new THREE.Raycaster();
const cursorWorld = new THREE.Vector3();
const lookAt = new THREE.Vector3();
const camPos = new THREE.Vector3();
let elapsed = 0;
let breakAmt = 0;

const fpsEl = params.has('debug') ? Object.assign(document.body.appendChild(document.createElement('div')), {
  style: 'position:fixed;left:8px;bottom:8px;font:12px monospace;color:#fff;background:#0008;padding:4px 6px;border-radius:4px;z-index:9'
}) : null;
let fpsAcc = 0;
let fpsFrames = 0;

function frame(now) {
  timer.update(now);
  const dt = Math.min(timer.getDelta(), 1 / 20);
  elapsed += dt;
  adapt(dt);

  // Ease toward the dragged time so day → night glides rather than jumps.
  timeOfDay += (timeTarget - timeOfDay) * (1 - Math.exp(-dt * 3.2));
  palette = samplePalette(timeOfDay);

  // Shared uniforms.
  shared.uTime.value = elapsed;
  shared.uFogColor.value.copy(palette.fog);
  shared.uGlowColor.value.copy(palette.glow);
  shared.uSunDir.value.copy(palette.sunDir);
  shared.uFogDensity.value = palette.fogDensity;
  shared.uLightDir.value.copy(palette.lightDir);
  shared.uLightColor.value.copy(palette.lightColor);
  shared.uAmbient.value.copy(palette.ambient);
  shared.uGround.value.copy(palette.ground);
  shared.uRim.value.copy(palette.rim);
  shared.uRimAmt.value = palette.rimAmt;
  shared.uWind.value = palette.wind;
  renderer.toneMappingExposure = palette.exposure;

  // Camera: slow dolly for break mode + a breath of pointer parallax.
  breakAmt += (breakTarget - breakAmt) * (1 - Math.exp(-dt * 0.9));
  const e = breakAmt * breakAmt * (3 - 2 * breakAmt);
  pointer.smooth.lerp(pointer.ndc, 1 - Math.exp(-dt * 2));
  camPos.lerpVectors(camBase, camBreak, e);
  camPos.x += pointer.smooth.x * 0.12;
  camPos.y += pointer.smooth.y * 0.04 + Math.sin(elapsed * 0.4) * 0.01;
  camera.position.copy(camPos);
  lookAt.lerpVectors(lookBase, lookBreak, e);
  lookAt.x += pointer.smooth.x * 0.4;
  camera.lookAt(lookAt);

  // Cursor → hill surface → trail texture.
  let hit = null;
  if (pointer.inside) {
    raycaster.setFromCamera(pointer.ndc, camera);
    hit = intersectTerrain(raycaster.ray, 80, cursorWorld);
    if (hit && (hit.x < trailBounds.minX || hit.x > trailBounds.maxX || hit.z < trailBounds.minZ || hit.z > trailBounds.maxZ)) hit = null;
  }
  const brush = hit ? 0.5 + hit.distanceTo(camera.position) * 0.035 : 1;
  trail.update(dt, hit, brush);

  terrain.update(palette);
  grass.update(palette, trail.texture);
  sky.update(palette, camera);
  clouds.update(palette, dt);
  tree.update(palette);
  fireflies.update(palette, dt, elapsed, hit);
  post.update(palette, elapsed);
  ui.update(palette);

  post.render();

  if (fpsEl) {
    fpsAcc += dt;
    fpsFrames++;
    if (fpsAcc > 0.5) {
      fpsEl.textContent = `${Math.round(fpsFrames / fpsAcc)} fps · dpr ${pixelRatio} · ${quality.blades.toLocaleString()} blades · t ${timeOfDay.toFixed(2)}`;
      fpsAcc = 0;
      fpsFrames = 0;
    }
  }
}
renderer.setAnimationLoop(frame);

// Small hook for tinkering from the console.
window.touchGrass = {
  setTime: (t) => (timeTarget = THREE.MathUtils.clamp(t, 0, 1)),
  jumpTo: (t) => (timeOfDay = timeTarget = THREE.MathUtils.clamp(t, 0, 1)),
  get timeOfDay() {
    return timeOfDay;
  }
};
