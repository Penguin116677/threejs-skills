// The liquid "object": a full-screen quad carrying the raymarching shader.
// update(state) copies a timeline sample (see animation.js) into uniforms.

import * as THREE from 'three';
import { vertexShader, fragmentShader } from './shaders.js';
import { LOBE_COUNT } from './animation.js';
import { LOOK } from './config.js';

export function createLiquid() {
  const uniforms = {
    uResolution: { value: new THREE.Vector2(1, 1) },
    uPhase: { value: 0 },
    uLobeA: { value: Array.from({ length: LOBE_COUNT }, () => new THREE.Vector4()) },
    uLobeB: { value: Array.from({ length: LOBE_COUNT }, () => new THREE.Vector4()) },
    uBlend: { value: 0.4 },
    uWave: { value: 0 },
    uRipple: { value: 0 },
    uIri: { value: 0 },
    uLight: { value: 1 },
    uRot: { value: new THREE.Matrix3() },
    uCamPos: { value: new THREE.Vector3(0, 0, 7) },
    uCamTarget: { value: new THREE.Vector3() },
    uFov: { value: 0.5 },
    uBound: { value: 2 },
    uAA: { value: 1 },
    uMaxSteps: { value: 96 },
    uReflSteps: { value: 24 },
    uExposure: { value: LOOK.exposure },
    uRough: { value: LOOK.roughness },
    uGlow: { value: LOOK.glow },
    uVignette: { value: LOOK.vignette },
    uDither: { value: LOOK.dither },
  };

  const material = new THREE.RawShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    glslVersion: THREE.GLSL3,
    depthTest: false,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  mesh.frustumCulled = false;

  function update(state) {
    uniforms.uPhase.value = state.phase;
    for (let i = 0; i < LOBE_COUNT; i++) {
      uniforms.uLobeA.value[i].fromArray(state.lobesA, i * 4);
      uniforms.uLobeB.value[i].fromArray(state.lobesB, i * 4);
    }
    uniforms.uBlend.value = state.blend;
    uniforms.uWave.value = state.wave;
    uniforms.uRipple.value = state.ripple;
    uniforms.uIri.value = state.iri;
    uniforms.uLight.value = state.light;
    uniforms.uRot.value.fromArray(state.rot); // column-major, like GLSL
    uniforms.uCamPos.value.fromArray(state.camPos);
    uniforms.uCamTarget.value.fromArray(state.camTarget);
    uniforms.uFov.value = THREE.MathUtils.degToRad(state.fov);
    uniforms.uBound.value = state.bound;
  }

  function setQuality({ aa, maxSteps, reflSteps }) {
    if (aa !== undefined) uniforms.uAA.value = aa;
    if (maxSteps !== undefined) uniforms.uMaxSteps.value = maxSteps;
    if (reflSteps !== undefined) uniforms.uReflSteps.value = reflSteps;
  }

  return { mesh, material, uniforms, update, setQuality };
}
