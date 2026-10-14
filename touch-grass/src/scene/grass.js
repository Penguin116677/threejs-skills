import * as THREE from 'three';
import { shared, fogUniforms, lightUniforms } from './shared.js';
import { heightAt } from './terrain.js';
import common from '../shaders/common.glsl?raw';
import wind from '../shaders/wind.glsl?raw';
import grassVert from '../shaders/grass.vert.glsl?raw';
import grassFrag from '../shaders/grass.frag.glsl?raw';
import flowerVert from '../shaders/flower.vert.glsl?raw';
import flowerFrag from '../shaders/flower.frag.glsl?raw';

const SEGMENTS = 5;

/** One tapered blade: pairs of vertices up the spine, a single tip vertex. */
function bladeGeometry() {
  const positions = [];
  for (let i = 0; i < SEGMENTS; i++) {
    const t = i / SEGMENTS;
    positions.push(-0.5, t, 0, 0.5, t, 0);
  }
  positions.push(0, 1, 0);
  const index = [];
  for (let i = 0; i < SEGMENTS - 1; i++) {
    const a = i * 2;
    index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const last = (SEGMENTS - 1) * 2;
  index.push(last, last + 1, last + 2);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(index);
  return geo;
}

/** Stem (3 rows) + a head quad, told apart by aPart. */
function flowerGeometry() {
  const positions = [];
  const part = [];
  for (let i = 0; i <= 2; i++) {
    const t = i / 2;
    positions.push(-0.5, t, 0, 0.5, t, 0);
    part.push(0, 0);
  }
  positions.push(-0.5, 0.5, 0, 0.5, 0.5, 0, -0.5, 1.5, 0, 0.5, 1.5, 0);
  part.push(1, 1, 1, 1);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('aPart', new THREE.Float32BufferAttribute(part, 1));
  geo.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4, 3, 5, 4, 6, 7, 8, 7, 9, 8]);
  return geo;
}

// Distances are sampled with density ∝ d^(k-1): a bit more weight up front
// than a uniform spread, while perspective still packs the far field.
function sampleDistance(rand, min, max, k) {
  const a = min ** k;
  const b = max ** k;
  return (a + rand * (b - a)) ** (1 / k);
}

export function createGrass({ count, flowerCount, field, trail }) {
  const group = new THREE.Group();
  group.name = 'grass';

  const windUniforms = {
    uTime: shared.uTime,
    uWind: shared.uWind,
    uTrail: { value: trail.texture },
    uTrailBounds: trail.boundsUniform
  };

  const material = new THREE.ShaderMaterial({
    uniforms: {
      ...fogUniforms(),
      ...lightUniforms(),
      ...windUniforms,
      uBase: { value: new THREE.Color() },
      uTip: { value: new THREE.Color() },
      uDry: { value: new THREE.Color() },
      uTerrain: { value: new THREE.Color() },
      uTrailGlow: { value: new THREE.Color() },
      uTrailGlowAmt: { value: 0 }
    },
    vertexShader: common + wind + grassVert,
    fragmentShader: common + grassFrag,
    side: THREE.DoubleSide
  });

  const flowerMaterial = new THREE.ShaderMaterial({
    uniforms: {
      ...fogUniforms(),
      ...lightUniforms(),
      ...windUniforms,
      uAmount: { value: 0 },
      uStem: { value: new THREE.Color() },
      uGlow: { value: 0 }
    },
    vertexShader: common + wind + flowerVert,
    fragmentShader: common + flowerFrag,
    side: THREE.DoubleSide,
    alphaToCoverage: true
  });

  let blades = null;
  let flowers = null;

  /** (Re)build instance data for a given horizontal coverage. */
  function build(halfTan) {
    if (blades) {
      group.remove(blades, flowers);
      blades.geometry.dispose();
      flowers.geometry.dispose();
    }

    const geo = bladeGeometry();
    const offsets = new Float32Array(count * 3);
    const params = new Float32Array(count * 4);
    const cam = field.camera;

    for (let i = 0; i < count; i++) {
      const d = sampleDistance(Math.random(), field.near, field.far, 1.8);
      const half = d * halfTan + 1.2;
      const x = (Math.random() * 2 - 1) * half;
      const z = cam.z - d + (Math.random() - 0.5) * 0.6;
      offsets[i * 3] = x;
      offsets[i * 3 + 1] = heightAt(x, z);
      offsets[i * 3 + 2] = z;

      // Distant blades are scaled up so the field stays dense on screen.
      // ...and the closest ones are tall enough to rise into the frame.
      const grow = (1 + d * 0.016) * (1 + 0.35 * (1 - THREE.MathUtils.smoothstep(d, 3, 9)));
      const tall = Math.random() < 0.1 ? 1.3 : 1;
      const height = (0.26 + Math.random() * 0.3) * grow * tall;
      const width = (0.02 + Math.random() * 0.014) * (1 + d * 0.07);

      // Mostly face the camera so blades aren't lost edge-on.
      const facing = Math.atan2(cam.z - z, cam.x - x);
      const yaw = facing + (Math.random() * 2 - 1) * 1.15;

      params[i * 4] = height;
      params[i * 4 + 1] = width;
      params[i * 4 + 2] = yaw;
      params[i * 4 + 3] = Math.random();
    }
    geo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offsets, 3));
    geo.setAttribute('aParams', new THREE.InstancedBufferAttribute(params, 4));

    blades = new THREE.InstancedMesh(geo, material, count);
    blades.frustumCulled = false;
    blades.name = 'blades';

    const fgeo = flowerGeometry();
    const fOffsets = new Float32Array(flowerCount * 3);
    const fParams = new Float32Array(flowerCount * 4);
    for (let i = 0; i < flowerCount; i++) {
      const d = sampleDistance(Math.random(), 4, field.far * 0.85, 1.7);
      const half = d * halfTan + 1;
      // Flowers grow in loose clumps.
      const clump = Math.floor(Math.random() * 40);
      const cx = Math.sin(clump * 12.9898) * 0.5;
      const x = THREE.MathUtils.clamp((Math.random() * 2 - 1) * 0.6 + cx * 0.8, -1, 1) * half;
      const z = cam.z - d;
      fOffsets[i * 3] = x;
      fOffsets[i * 3 + 1] = heightAt(x, z);
      fOffsets[i * 3 + 2] = z;
      const grow = 1 + d * 0.03;
      fParams[i * 4] = (0.22 + Math.random() * 0.26) * grow;
      fParams[i * 4 + 1] = (0.04 + Math.random() * 0.03) * (1 + d * 0.06);
      fParams[i * 4 + 2] = Math.floor(Math.random() * 3);
      fParams[i * 4 + 3] = Math.random() * 0.85;
    }
    fgeo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(fOffsets, 3));
    fgeo.setAttribute('aParams', new THREE.InstancedBufferAttribute(fParams, 4));
    flowers = new THREE.InstancedMesh(fgeo, flowerMaterial, flowerCount);
    flowers.frustumCulled = false;
    flowers.name = 'flowers';

    group.add(blades, flowers);
  }

  build(field.halfTan);

  return {
    group,
    get halfTan() {
      return field.halfTan;
    },
    rebuild(halfTan) {
      field.halfTan = halfTan;
      build(halfTan);
    },
    update(p, trailTexture) {
      const u = material.uniforms;
      u.uTrail.value = trailTexture;
      u.uBase.value.copy(p.grassBase);
      u.uTip.value.copy(p.grassTip);
      u.uDry.value.copy(p.grassDry);
      u.uTerrain.value.copy(p.terrain);
      u.uTrailGlow.value.copy(p.trailGlow);
      u.uTrailGlowAmt.value = p.trailGlowAmt;

      const f = flowerMaterial.uniforms;
      f.uAmount.value = p.flowers;
      f.uStem.value.copy(p.grassTip);
      f.uGlow.value = p.fireflies * 0.06;
      flowers.visible = p.flowers > 0.01;
    }
  };
}
