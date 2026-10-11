---
name: threejs-particles-cinematic
description: Cinematic Three.js particle systems - glowing point sprites, curl-noise flow fields, GPGPU simulation with GPUComputationRenderer, particles sampled from a mesh surface, morphing between shapes, trails and bloom. Use when creating particle effects, dust/sparks/magic/energy fields, product-to-particles dissolves, galaxy or nebula visuals, or any motion graphics built from thousands of points.
---

# Three.js Cinematic Particles

## Quick Start

Glowing, size-attenuated particles with additive blending and a custom shader. This is the base for every other pattern below.

```javascript
import * as THREE from "three";

const COUNT = 20000;
const positions = new Float32Array(COUNT * 3);
const seeds = new Float32Array(COUNT); // per-particle random value

for (let i = 0; i < COUNT; i++) {
  // Random point inside a sphere
  const r = Math.cbrt(Math.random()) * 3;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  positions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
  positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
  positions[i * 3 + 2] = r * Math.cos(phi);
  seeds[i] = Math.random();
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));

const material = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uSize: { value: 40 },
    uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    uColorA: { value: new THREE.Color("#ff6a00") },
    uColorB: { value: new THREE.Color("#3a7bff") },
  },
  vertexShader: /* glsl */ `
    uniform float uTime;
    uniform float uSize;
    uniform float uPixelRatio;
    attribute float aSeed;
    varying float vSeed;

    void main() {
      vec3 p = position;
      // gentle per-particle drift
      p.y += sin(uTime * 0.5 + aSeed * 6.2831) * 0.15;

      vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mvPosition;

      // size attenuation: smaller when farther away
      gl_PointSize = uSize * uPixelRatio * (0.5 + aSeed) / -mvPosition.z;
      vSeed = aSeed;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    varying float vSeed;

    void main() {
      // soft round sprite (gl_PointCoord is 0..1 across the point)
      float d = length(gl_PointCoord - 0.5);
      float alpha = 1.0 - smoothstep(0.0, 0.5, d);
      alpha = pow(alpha, 2.0); // tighter hot core

      vec3 color = mix(uColorA, uColorB, vSeed);
      gl_FragColor = vec4(color, alpha);
    }
  `,
  transparent: true,
  depthWrite: false, // essential for additive particles
  blending: THREE.AdditiveBlending,
});

const particles = new THREE.Points(geometry, material);
scene.add(particles);

const timer = new THREE.Clock();
renderer.setAnimationLoop(() => {
  material.uniforms.uTime.value = timer.getElapsedTime();
  particles.rotation.y += 0.001;
  renderer.render(scene, camera);
});
```

**Key rules for good-looking particles**

- `depthWrite: false` + `AdditiveBlending` produces glow where particles overlap, with no sorting artefacts.
- Never use `smoothstep(a, b, x)` with `a > b`. It is undefined in GLSL and breaks on some mobile GPUs. Use `1.0 - smoothstep(b, a, x)`.
- Multiply the point size by the pixel ratio, otherwise particles look tiny on phones.
- Hardware caps `gl_PointSize` (often 64-1024 px; check `renderer.getContext().getParameter(gl.ALIASED_POINT_SIZE_RANGE)`). For huge sprites, use instanced quads instead.

## GLSL Noise Library

Paste this into any shader that needs organic motion. Simplex noise by Ian McEwan / Stefan Gustavson (MIT).

```glsl
// ---- 3D simplex noise ----
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857; // 1/7
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

// ---- curl noise: divergence-free flow (smoke / fluid-like swirls) ----
vec3 snoiseVec3(vec3 x) {
  return vec3(
    snoise(x),
    snoise(vec3(x.y - 19.1, x.z + 33.4, x.x + 47.2)),
    snoise(vec3(x.z + 74.2, x.x - 124.5, x.y + 99.4))
  );
}

vec3 curlNoise(vec3 p) {
  const float e = 0.1;
  vec3 dx = vec3(e, 0.0, 0.0);
  vec3 dy = vec3(0.0, e, 0.0);
  vec3 dz = vec3(0.0, 0.0, e);

  vec3 px0 = snoiseVec3(p - dx), px1 = snoiseVec3(p + dx);
  vec3 py0 = snoiseVec3(p - dy), py1 = snoiseVec3(p + dy);
  vec3 pz0 = snoiseVec3(p - dz), pz1 = snoiseVec3(p + dz);

  float x = (py1.z - py0.z) - (pz1.y - pz0.y);
  float y = (pz1.x - pz0.x) - (px1.z - px0.z);
  float z = (px1.y - px0.y) - (py1.x - py0.x);
  return vec3(x, y, z) / (2.0 * e);
}
```

`curlNoise` costs 18 `snoise` calls. Run it in a GPGPU pass (once per particle per frame), not in a fragment shader, and keep particle counts moderate on phones.

In JavaScript, store the library as a string and inject it:

```javascript
const NOISE_GLSL = `/* paste the block above */`;
const vertexShader = NOISE_GLSL + /* glsl */ `
  void main() { /* ... */ }
`;
```

## Stateless Flow (No Simulation)

The cheapest cinematic motion: compute each particle's offset purely from `(startPosition, time)` in the vertex shader. There is no state and no extra render targets, and you can seek to any time, which is ideal for video export.

```glsl
uniform float uTime;
uniform float uFlowStrength;  // 0..1
uniform float uFlowScale;     // ~0.3..1.0
attribute float aSeed;

void main() {
  vec3 p = position;
  float t = uTime * 0.15 + aSeed * 10.0;

  // a cheaper single snoise per axis instead of full curl
  vec3 offset = vec3(
    snoise(p * uFlowScale + vec3(t, 0.0, 0.0)),
    snoise(p * uFlowScale + vec3(0.0, t, 0.0)),
    snoise(p * uFlowScale + vec3(0.0, 0.0, t))
  );
  p += offset * uFlowStrength;

  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = 30.0 / -mvPosition.z;
}
```

## GPGPU Simulation (GPUComputationRenderer)

For real flow fields, attraction, and particles that remember velocity: positions live in a float texture and are updated by a fragment shader each frame. A 256x256 texture holds 65,536 particles.

```javascript
import { GPUComputationRenderer } from "three/addons/misc/GPUComputationRenderer.js";

const SIZE = 256; // SIZE * SIZE particles (128 on low-end phones)
const gpu = new GPUComputationRenderer(SIZE, SIZE, renderer);

// Mobile safety: half floats are supported more widely than full floats
if (/Android|iPhone|iPad/i.test(navigator.userAgent)) {
  gpu.setDataType(THREE.HalfFloatType);
}

// Initial positions (xyz) + life (w)
const posTex = gpu.createTexture();
const data = posTex.image.data;
for (let i = 0; i < data.length; i += 4) {
  data[i + 0] = (Math.random() - 0.5) * 4;
  data[i + 1] = (Math.random() - 0.5) * 4;
  data[i + 2] = (Math.random() - 0.5) * 4;
  data[i + 3] = Math.random(); // life 0..1
}

const positionShader = NOISE_GLSL + /* glsl */ `
  uniform float uTime;
  uniform float uDelta;
  uniform float uSpeed;
  uniform sampler2D uOrigin; // respawn positions

  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;  // 'resolution' is injected
    vec4 pos = texture2D(texturePosition, uv);   // previous frame
    vec3 origin = texture2D(uOrigin, uv).xyz;

    vec3 vel = curlNoise(pos.xyz * 0.4 + uTime * 0.05);
    pos.xyz += vel * uSpeed * uDelta;

    // age and respawn
    pos.w -= uDelta * 0.2;
    if (pos.w < 0.0) {
      pos.xyz = origin;
      pos.w = 1.0;
    }
    gl_FragColor = pos;
  }
`;

const posVar = gpu.addVariable("texturePosition", positionShader, posTex);
gpu.setVariableDependencies(posVar, [posVar]);
posVar.material.uniforms.uTime = { value: 0 };
posVar.material.uniforms.uDelta = { value: 0 };
posVar.material.uniforms.uSpeed = { value: 0.6 };
posVar.material.uniforms.uOrigin = { value: posTex }; // init() only copies it, so it stays valid

const err = gpu.init();
if (err !== null) console.error(err);

// Render geometry: one vertex per texel, carrying its lookup UV
const COUNT = SIZE * SIZE;
const refs = new Float32Array(COUNT * 2);
for (let i = 0; i < COUNT; i++) {
  refs[i * 2 + 0] = ((i % SIZE) + 0.5) / SIZE;
  refs[i * 2 + 1] = (Math.floor(i / SIZE) + 0.5) / SIZE;
}
const geo = new THREE.BufferGeometry();
geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3)); // unused, required
geo.setAttribute("aRef", new THREE.BufferAttribute(refs, 2));

const renderMat = new THREE.ShaderMaterial({
  uniforms: {
    uPositions: { value: null },
    uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
  },
  vertexShader: /* glsl */ `
    uniform sampler2D uPositions;
    uniform float uPixelRatio;
    attribute vec2 aRef;
    varying float vLife;
    void main() {
      vec4 data = texture2D(uPositions, aRef);
      vLife = data.w;
      vec4 mvPosition = modelViewMatrix * vec4(data.xyz, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      gl_PointSize = 18.0 * uPixelRatio * vLife / -mvPosition.z;
    }
  `,
  fragmentShader: /* glsl */ `
    varying float vLife;
    void main() {
      float d = length(gl_PointCoord - 0.5);
      float a = 1.0 - smoothstep(0.0, 0.5, d);
      // life runs 1 -> 0: fade in right after birth, fade out before death
      a *= (1.0 - smoothstep(0.9, 1.0, vLife)) * smoothstep(0.0, 0.2, vLife);
      gl_FragColor = vec4(vec3(1.0, 0.75, 0.4) * 1.5, a);
    }
  `,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});

const points = new THREE.Points(geo, renderMat);
points.frustumCulled = false; // real positions come from the texture
scene.add(points);

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 1 / 30); // clamp after tab switches
  posVar.material.uniforms.uTime.value += dt;
  posVar.material.uniforms.uDelta.value = dt;
  gpu.compute();
  renderMat.uniforms.uPositions.value = gpu.getCurrentRenderTarget(posVar).texture;
  renderer.render(scene, camera); // or composer.render()
});
```

Add a second variable `textureVelocity` (with `setVariableDependencies(velVar, [posVar, velVar])`) when you need inertia, gravity, or mouse attraction. Integrate velocity in its shader and read it in the position shader.

## Particles From a Product / Mesh Surface

`MeshSurfaceSampler` places particles on the actual surface of a model. Use it for "product assembles from dust" or "dissolves into particles" shots.

```javascript
import { MeshSurfaceSampler } from "three/addons/math/MeshSurfaceSampler.js";

function samplePoints(mesh, count) {
  // Sampler reads geometry in local space; bake world transform first if needed
  const sampler = new MeshSurfaceSampler(mesh).build();
  const out = new Float32Array(count * 3);
  const p = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    sampler.sample(p);
    p.applyMatrix4(mesh.matrixWorld);
    p.toArray(out, i * 3);
  }
  return out;
}

// For a GLTF with many meshes, merge first or sample each mesh weighted by area.
let productMesh;
gltf.scene.traverse((o) => { if (o.isMesh && !productMesh) productMesh = o; });
gltf.scene.updateMatrixWorld(true);
const target = samplePoints(productMesh, 30000);
```

## Shape Morphing (Scatter → Product → Logo)

Store two (or more) position sets as attributes and blend in the vertex shader with a per-particle delay. The staggering is what makes it look cinematic.

```javascript
geometry.setAttribute("position", new THREE.BufferAttribute(scatterPositions, 3));
geometry.setAttribute("aTarget", new THREE.BufferAttribute(productPositions, 3));
material.uniforms.uProgress = { value: 0 }; // animate 0 → 1
```

```glsl
uniform float uProgress;
attribute vec3 aTarget;
attribute float aSeed;

float easeInOutCubic(float t) {
  return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
}

void main() {
  // each particle starts at a different moment (0..0.4 delay window)
  float delay = aSeed * 0.4;
  float t = clamp((uProgress - delay) / (1.0 - 0.4), 0.0, 1.0);
  t = easeInOutCubic(t);

  vec3 p = mix(position, aTarget, t);
  // arc outwards mid-flight for a swirl
  p += normalize(p + 0.0001) * sin(t * 3.14159) * 0.6 * (1.0 - aSeed * 0.5);

  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = 25.0 / -mvPosition.z;
}
```

Both attributes must have the same count. Resample the smaller set (repeat indices randomly) if the sources differ.

## Glow: Bloom + HDR Colors

Bloom makes particles cinematic. Output colors above 1.0 for the brightest particles so that only they pass the bloom threshold.

```javascript
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.2, // strength
  0.6, // radius
  0.8, // threshold: only colors brighter than this glow
);
composer.addPass(bloom);
composer.addPass(new OutputPass()); // tone mapping + sRGB at the end
```

In the particle fragment shader: `gl_FragColor = vec4(color * 2.5, alpha);` for "hot" particles.

## Trails / Motion Blur

```javascript
import { AfterimagePass } from "three/addons/postprocessing/AfterimagePass.js";

const afterimage = new AfterimagePass(0.92); // damp: higher = longer trails
composer.addPass(afterimage); // add after RenderPass, before bloom
```

For streak-shaped particles (sparks, warp speed), stretch the sprite along the screen-space velocity instead. Pass the previous position as an attribute and render with `LineSegments` or instanced quads.

## Recipes

| Look | Recipe |
|---|---|
| Floating dust in light beam | 2-5k points, tiny size, stateless flow, low alpha, warm color, strong bloom, DOF (BokehPass) |
| Magic / energy swirl | GPGPU curl noise, additive, two-color gradient by life, AfterimagePass |
| Galaxy | Spiral arms: `angle = radius * twist + branch * 2π/branches`, random offset with `pow(rand, 3)` concentrated near arms, inner color hot → outer cool |
| Product dissolve | MeshSurfaceSampler on product, morph `uProgress` 1 → 0 toward scattered positions + curl offset; fade the real mesh out with a dissolve shader (see threejs-shaders) |
| Sparks | Short life, high initial velocity + gravity in velocity shader, streak sprites, very high HDR color |
| Starfield / bokeh | Large soft sprites far away, low count (300-800), slight color variety, no additive on light backgrounds |

## Performance (Mobile First)

| Device tier | Stateless points | GPGPU texture |
|---|---|---|
| Low-end Android | 10-30k | 128x128 (16k) |
| Mid-range | 50-100k | 256x256 (65k) |
| Flagship / desktop | 200k-1M | 512x512 (262k) |

- `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`. Big particles at DPR 3 fill-rate-kill phones.
- Overdraw is the real cost, not the vertex count. Smaller sprites mean more particles are affordable.
- Use `gpu.setDataType(THREE.HalfFloatType)` on mobile.
- Set the bloom render size to half resolution on phones: `bloom.resolution.set(w / 2, h / 2)` or `composer.setPixelRatio(1)`.
- Set `points.frustumCulled = false` when shader-moved particles disappear at screen edges.
- Pause the loop when `document.hidden` to save battery.

## See Also

- `threejs-shaders` for GLSL fundamentals, dissolve, and fresnel
- `threejs-postprocessing` for the bloom, DOF, and afterimage setups
- `threejs-geometry` for Points and InstancedMesh basics
- `threejs-product-motion` for camera choreography, timelines, and video export
