// Builds the whole scene and exposes renderFrame(t). Used by both the
// interactive preview and the headless frame exporter.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

import { createRng } from './rng.js';
import { computeState } from './timeline.js';
import { createSharedUniforms } from './shaders/common.js';
import { buildPalette } from './palette.js';
import { createBackground } from './background.js';
import { createGlassCore } from './glassCore.js';
import { createRings } from './rings.js';
import { createOrbits } from './orbits.js';
import { createParticles } from './particles.js';
import { createInterfacePlane } from './interfacePlane.js';
import { createFinishShader } from './finishPass.js';

const COMPOSITION_NDC_X = { right: 0.3, left: -0.3, center: 0 };
const FOV = 30;
const BASE_DISTANCE = 10.4;

export function createWorld({ canvas, width, height, cfg, msaa = 4 }) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false, // MSAA happens in the HDR composer target instead
    alpha: false,
    preserveDrawingBuffer: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  renderer.toneMapping = THREE.NoToneMapping; // done in the finish pass
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace; // encoded manually in the finish pass
  renderer.autoClear = true;
  renderer.setClearColor(0x000000, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, width / height, 0.1, 100);

  const rng = createRng(cfg.seed);
  const shared = createSharedUniforms(THREE);
  const pal = buildPalette(THREE, cfg.hue);
  shared.uCyan.value.copy(pal.cyan);
  shared.uIce.value.copy(pal.ice);
  shared.uViolet.value.copy(pal.violet);
  shared.uSilver.value.copy(pal.silver);
  shared.uGlassTint.value.copy(pal.glassTint);
  shared.uGlow.value = cfg.glowIntensity;

  const background = createBackground(THREE, shared);
  background.uniforms.uNavyDeep.value.copy(pal.navyDeep);
  background.uniforms.uNavy.value.copy(pal.navy);
  background.uniforms.uDark.value = cfg.backgroundDarkness;

  const core = createGlassCore(THREE, shared, rng);
  const rings = createRings(THREE, shared, cfg);
  const orbits = createOrbits(THREE, shared, cfg);
  const particles = createParticles(THREE, shared, cfg, rng);
  const iface = createInterfacePlane(THREE, shared);

  scene.add(background.mesh, iface.mesh, orbits.group, rings.group, core.group, particles.points);

  // ------------------------------------------------------- post-processing
  const target = new THREE.WebGLRenderTarget(width, height, {
    type: THREE.HalfFloatType,
    samples: msaa,
    colorSpace: THREE.LinearSRGBColorSpace,
  });
  const composer = new EffectComposer(renderer, target);
  composer.setPixelRatio(1);
  composer.setSize(width, height);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(width, height), 0.5 * cfg.glowIntensity, 0.55, 0.62);
  composer.addPass(bloom);
  const finish = new ShaderPass(createFinishShader());
  finish.uniforms.uExposure.value = cfg.exposure;
  composer.addPass(finish);

  const ndcX = COMPOSITION_NDC_X[cfg.composition] ?? COMPOSITION_NDC_X.right;
  const coreProj = new THREE.Vector3();
  const rimProj = new THREE.Vector3();
  const right = new THREE.Vector3();

  function placeCamera(c) {
    const d = BASE_DISTANCE * cfg.framing * c.dist;
    camera.position.set(d * Math.cos(c.el) * Math.sin(c.az), d * Math.sin(c.el), d * Math.cos(c.el) * Math.cos(c.az));
    camera.up.set(0, 1, 0);
    camera.lookAt(0, 0, 0);
    camera.rotateZ(c.roll);
    // Lens shift (not a camera pan) moves the core off-centre with no
    // perspective skew, leaving clean negative space for copy.
    camera.aspect = width / height;
    camera.filmOffset = -ndcX * Math.tan((FOV * Math.PI) / 360) * camera.aspect * camera.getFilmWidth();
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  }

  let lastState = null;
  function renderFrame(t) {
    const state = computeState(t, cfg);
    lastState = state;
    placeCamera(state.camera);

    shared.uPhase.value = state.u;
    shared.uStoryTime.value = state.build.storyTime;
    shared.uPulseR.value = state.pulse.radius;
    shared.uPulseAmp.value = state.pulse.amp;
    shared.uPulseW.value = state.pulse.width;
    shared.uLight.value = state.light;

    coreProj.set(0, 0, 0).project(camera);
    right.setFromMatrixColumn(camera.matrixWorld, 1); // camera up
    rimProj.copy(right).project(camera);
    background.uniforms.uCore.value.set(coreProj.x * 0.5 + 0.5, coreProj.y * 0.5 + 0.5);
    background.uniforms.uCoreRadius.value = Math.abs(rimProj.y - coreProj.y) * 0.5;
    background.uniforms.uAspect.value = width / height;
    background.uniforms.uBuild.value = state.build.background;

    core.update(state);
    rings.update(state);
    orbits.update(state);
    iface.update(state);
    particles.update(state, { height, fov: FOV, focus: camera.position.length() });

    composer.render();
    return state;
  }

  return {
    THREE,
    renderer,
    scene,
    camera,
    composer,
    renderFrame,
    get state() {
      return lastState;
    },
    info() {
      const gl = renderer.getContext();
      return {
        width,
        height,
        msaa,
        particles: particles.counts,
        rings: cfg.ringCount,
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        programs: renderer.info.programs?.length,
        gl: gl.getParameter(gl.VERSION),
      };
    },
    dispose() {
      composer.dispose();
      renderer.dispose();
    },
  };
}
