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
import { DURATION, sampleTimeline, createTimelineState } from './motion/timeline.js';
import { createTitles } from './motion/titles.js';

/*
 * Two ways to run the film:
 *   - playback (default): real-time loop, letterboxed 16:9 in the window.
 *   - capture (?capture&w=1920&h=1080): nothing animates on its own; the
 *     render script calls window.__motion.frame(i, fps) for each frame, so
 *     every frame is deterministic regardless of how slow rendering is.
 */
const params = new URLSearchParams(location.search);
const capture = params.has('capture');
const ASPECT = 16 / 9;
const FOV = 40;

const isMobile = !capture && (matchMedia('(pointer: coarse)').matches || Math.min(screen.width, screen.height) < 700);
const quality = isMobile
  ? { blades: 60000, flowers: 1400, fireflies: 90, leafCards: 5000, detail: 7, samples: 0, maxDpr: 1.5 }
  : { blades: 160000, flowers: 3600, fireflies: 170, leafCards: 10000, detail: 10, samples: 4, maxDpr: 2 };
if (params.has('blades')) quality.blades = Number(params.get('blades'));
if (params.has('samples')) quality.samples = Number(params.get('samples'));

// ------------------------------------------------------------------ stage
const stage = document.getElementById('stage');
const canvas = document.getElementById('scene');
const fadeEl = stage.querySelector('.fade');
const frameSize = { w: 1920, h: 1080 };

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false, // MSAA happens in the composer's render target
  powerPreference: 'high-performance',
  stencil: false,
  preserveDrawingBuffer: capture
});
let pixelRatio = capture ? 1 : Math.min(window.devicePixelRatio || 1, quality.maxDpr);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(FOV, ASPECT, 0.05, 1500);
setMoonAzimuth(THREE.MathUtils.radToDeg(Math.atan(Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * ASPECT)));

// ------------------------------------------------------------------ world
// The field covers the 16:9 frame plus the camera's sideways drift.
const field = {
  camera: { x: 0, z: 0 },
  near: 4.6, // the camera pushes 3.2 units forward; keep blades out of the lens
  far: 50,
  halfTan: Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * ASPECT * 1.18
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
const titles = createTitles(stage);

// ----------------------------------------------------------------- layout
function layout() {
  let w;
  let h;
  if (capture) {
    w = Number(params.get('w')) || 1920;
    h = Number(params.get('h')) || Math.round(w / ASPECT);
    stage.style.left = '0px';
    stage.style.top = '0px';
  } else {
    w = Math.min(innerWidth, innerHeight * ASPECT);
    h = w / ASPECT;
    stage.style.left = `${(innerWidth - w) / 2}px`;
    stage.style.top = `${(innerHeight - h) / 2}px`;
  }
  frameSize.w = w;
  frameSize.h = h;
  stage.style.width = `${w}px`;
  stage.style.height = `${h}px`;
  stage.style.setProperty('--u', `${w / 100}px`);
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(w, h, false);
  post.setSize(w, h, pixelRatio);
  shared.uPixelRatio.value = pixelRatio * (h / 900);
}
layout();
if (!capture) window.addEventListener('resize', layout);

// --------------------------------------------------------------- one step
const tl = createTimelineState();
const raycaster = new THREE.Raycaster();
const brushWorld = new THREE.Vector3();
const lookAt = new THREE.Vector3();

function step(t, dt, draw = true) {
  sampleTimeline(t, tl);
  const palette = samplePalette(tl.timeOfDay);

  shared.uTime.value = t;
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
  shared.uWind.value = palette.wind * (1 + tl.gust);
  renderer.toneMappingExposure = palette.exposure;

  camera.position.set(tl.eye.x, heightAt(tl.eye.x, tl.eye.z) + tl.eye.y, tl.eye.z);
  lookAt.set(tl.look.x, HILL.top + tl.look.y, HILL.z);
  camera.lookAt(lookAt);

  // The unseen hand: a screen-space stroke projected onto the hill.
  let hit = null;
  if (tl.brush) {
    raycaster.setFromCamera(tl.brush, camera);
    hit = intersectTerrain(raycaster.ray, 80, brushWorld);
  }
  const radius = hit ? 0.55 + hit.distanceTo(camera.position) * 0.04 : 1;
  trail.update(dt, hit, radius);

  fireflies.update(palette, dt, t, hit);
  clouds.update(palette, dt);
  if (!draw) return;

  terrain.update(palette);
  grass.update(palette, trail.texture);
  sky.update(palette, camera);
  tree.update(palette);
  post.update(palette, t);
  titles.update(t, palette, tl.timeOfDay, frameSize.w / 1920);
  fadeEl.style.opacity = tl.fade.toFixed(3);

  post.render();
}

// --------------------------------------------------------------- capture
if (capture) {
  let last = -1;
  window.__motion = {
    duration: DURATION,
    /** Render frame i at the given fps. Frames must be requested in order. */
    frame(i, fps) {
      const dt = 1 / fps;
      // Simulation (trail, fireflies) integrates, so step through any gap.
      for (let k = last + 1; k < i; k++) step(k * dt, dt, false);
      step(i * dt, dt);
      last = i;
      return true;
    }
  };
  document.documentElement.dataset.ready = 'true';
} else {
  // ------------------------------------------------------------ playback
  let t = params.has('t') ? Number(params.get('t')) % DURATION : 0;
  let playing = true;
  const timer = new THREE.Timer();
  timer.connect(document);

  // Space pauses (the film is longer than 5s); arrows scrub.
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      playing = !playing;
      e.preventDefault();
    }
    if (e.key === 'ArrowRight') t = (t + 2) % DURATION;
    if (e.key === 'ArrowLeft') t = (t - 2 + DURATION) % DURATION;
  });
  stage.addEventListener('click', () => (playing = !playing));

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
      layout();
    } else if (fps >= 55) {
      perf.settled = true;
    }
  }

  const fpsEl = params.has('debug')
    ? Object.assign(document.body.appendChild(document.createElement('div')), {
        style: 'position:fixed;left:8px;bottom:8px;font:12px monospace;color:#fff;background:#0008;padding:4px 6px;border-radius:4px;z-index:9'
      })
    : null;
  let fpsAcc = 0;
  let fpsFrames = 0;

  renderer.setAnimationLoop((now) => {
    timer.update(now);
    const real = Math.min(timer.getDelta(), 1 / 20);
    adapt(real);
    const dt = playing ? real : 0;
    t = (t + dt) % DURATION;
    step(t, dt);

    if (fpsEl) {
      fpsAcc += real;
      fpsFrames++;
      if (fpsAcc > 0.5) {
        fpsEl.textContent = `${Math.round(fpsFrames / fpsAcc)} fps · dpr ${pixelRatio} · ${quality.blades.toLocaleString()} blades · t ${t.toFixed(1)}s`;
        fpsAcc = 0;
        fpsFrames = 0;
      }
    }
  });
}
