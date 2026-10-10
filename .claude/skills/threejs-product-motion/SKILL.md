---
name: threejs-product-motion
description: 3D product motion graphics with Three.js - studio lighting and environment for products, auto-framing a GLB model, deterministic timelines with easing, camera choreography (orbit reveal, dolly, spline paths), hero shots (turntable, exploded view, light sweep, reveal), social video aspect ratios and exporting the canvas to video. Use when making product renders, commercials, launch animations, showcase pages, or recording a Three.js animation as a video.
---

# Three.js Product Motion Graphics

## Quick Start

A complete product stage: neutral studio reflections, soft key light, shadow-catcher floor, auto-framed model, and a deterministic timeline.

```javascript
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.NeutralToneMapping; // r162+, keeps product colors true. Use ACESFilmic for drama
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color("#0d0d10");

// Studio reflections without any HDR file
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.8; // r163+

const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.01, 100);

// Key light (casts shadow) + rim light (separates silhouette from background)
const key = new THREE.DirectionalLight("#ffffff", 2.0);
key.position.set(3, 5, 4);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.radius = 6;
key.shadow.bias = -0.0005;
scene.add(key);

const rim = new THREE.DirectionalLight("#9fc4ff", 3.0);
rim.position.set(-4, 2, -5);
scene.add(rim);

// Shadow catcher floor
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 20),
  new THREE.ShadowMaterial({ opacity: 0.35 }),
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const product = new THREE.Group();
scene.add(product);

new GLTFLoader().load("product.glb", (gltf) => {
  gltf.scene.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  product.add(gltf.scene);
  const { size } = normalizeToStage(gltf.scene, 1.0); // see below
  frameCamera(camera, size);
  start();
});
```

## Auto-Fit Any Model

Models arrive at random scale and offset. Normalize them so every shot works the same way.

```javascript
// Center on X/Z, sit on the floor (y=0), scale the largest side to `targetSize`
function normalizeToStage(object, targetSize = 1) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const scale = targetSize / Math.max(size.x, size.y, size.z);
  object.scale.setScalar(scale);

  box.setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  object.position.x -= center.x;
  object.position.z -= center.z;
  object.position.y -= box.min.y;

  return { size: size.multiplyScalar(scale) };
}

// Distance so the object fills `fill` (0..1) of the vertical view
function frameCamera(camera, size, fill = 0.6) {
  const fov = THREE.MathUtils.degToRad(camera.fov);
  const height = Math.max(size.y, size.x / camera.aspect);
  const dist = height / fill / (2 * Math.tan(fov / 2));
  camera.position.set(0, size.y * 0.6, dist);
  camera.lookAt(0, size.y * 0.5, 0);
  return dist;
}
```

## Deterministic Timeline

Drive **everything** from a single time value `t` (seconds). Never use `+= delta` for choreography. A pure `render(t)` function can be scrubbed, looped, and exported frame-perfectly.

```javascript
// Easing library
const ease = {
  linear: (x) => x,
  inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  outExpo: (x) => (x === 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  inOutSine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
  outBack: (x) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  },
};

// 0..1 progress of a segment [start, start+duration] at time t
function seg(t, start, duration, easing = ease.inOutCubic) {
  return easing(THREE.MathUtils.clamp((t - start) / duration, 0, 1));
}

const DURATION = 8; // seconds, loop length

function renderAt(t) {
  // 0-2s: product rises and fades in
  const rise = seg(t, 0, 2, ease.outExpo);
  product.position.y = THREE.MathUtils.lerp(-0.3, 0, rise);

  // 0-8s: slow turntable (linear for a constant, premium feel)
  product.rotation.y = seg(t, 0, DURATION, ease.linear) * Math.PI * 2;

  // 2-5s: camera dolly in
  const dolly = seg(t, 2, 3);
  camera.position.z = THREE.MathUtils.lerp(4.5, 2.8, dolly);
  camera.lookAt(0, 0.5, 0);

  // 4-6s: rim light sweep
  const sweep = seg(t, 4, 2, ease.inOutSine);
  rim.position.x = THREE.MathUtils.lerp(-6, 6, sweep);

  renderer.render(scene, camera); // or composer.render() when using post-processing
}

function start() {
  const t0 = performance.now();
  renderer.setAnimationLoop(() => {
    const t = ((performance.now() - t0) / 1000) % DURATION;
    renderAt(t);
  });
}
```

### Using GSAP Instead (Optional)

GSAP is free for all uses. A paused timeline is still deterministic: call `tl.seek(t)` in `renderAt`.

```html
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
```

```javascript
const tl = gsap.timeline({ paused: true });
tl.from(product.position, { y: -0.3, duration: 2, ease: "expo.out" }, 0)
  .to(camera.position, { z: 2.8, duration: 3, ease: "power2.inOut" }, 2)
  .to(rim.position, { x: 6, duration: 2, ease: "sine.inOut" }, 4);

function renderAt(t) {
  tl.seek(t, false);
  camera.lookAt(0, 0.5, 0);
  renderer.render(scene, camera);
}
```

## Camera Choreography

```javascript
// Orbit reveal: sweep around the product on a circle while rising
function orbitCamera(t01, radius = 3, fromAngle = -0.6, toAngle = 0.6, y0 = 0.2, y1 = 0.8) {
  const a = THREE.MathUtils.lerp(fromAngle, toAngle, t01);
  camera.position.set(Math.sin(a) * radius, THREE.MathUtils.lerp(y0, y1, t01), Math.cos(a) * radius);
  camera.lookAt(0, 0.5, 0);
}

// Spline camera path: smooth multi-point flythrough
const path = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(-3, 0.4, 3),
    new THREE.Vector3(0, 1.2, 2.5),
    new THREE.Vector3(2.5, 0.6, 0.5),
    new THREE.Vector3(1.2, 0.3, -2),
  ],
  false,
  "catmullrom",
  0.5,
);
const lookTarget = new THREE.Vector3(0, 0.5, 0);

function pathCamera(t01) {
  path.getPointAt(t01, camera.position); // arc-length parameterized = even speed
  camera.lookAt(lookTarget);
}

// Subtle handheld feel: low-amplitude, low-frequency noise on top of any move
function handheld(t, amount = 0.01) {
  camera.position.x += Math.sin(t * 1.3) * amount + Math.sin(t * 2.7) * amount * 0.5;
  camera.position.y += Math.sin(t * 1.7 + 1.0) * amount * 0.6;
}

// Animated focal length (dolly-zoom / "vertigo")
function dollyZoom(t01, startFov = 30, endFov = 55, subjectHeight = 1) {
  camera.fov = THREE.MathUtils.lerp(startFov, endFov, t01);
  const dist = subjectHeight / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
  camera.position.setLength(dist * 1.6);
  camera.updateProjectionMatrix(); // required after changing fov
}
```

Cinematography tips for products:
- Use long lenses (FOV 20-35°). They flatten perspective like real product photography.
- Move slowly with ease-in-out. One idea per shot, 2-4 seconds per shot.
- Always keep a little motion. A static frame looks like a still image.

## Hero Shot Recipes

### Exploded View

```javascript
// Push each part away from the product center along its own direction
const parts = [];
const center = new THREE.Box3().setFromObject(product).getCenter(new THREE.Vector3());
product.traverse((o) => {
  if (o.isMesh) {
    const c = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());
    const dir = c.sub(center);
    if (dir.lengthSq() < 1e-6) dir.set(0, 1, 0);
    parts.push({ mesh: o, base: o.position.clone(), dir: dir.normalize() });
  }
});

function explode(amount) {
  // amount 0..1; distances are in each mesh's parent space, so tune `0.5` per model
  for (const p of parts) {
    p.mesh.position.copy(p.base).addScaledVector(p.dir, amount * 0.5);
  }
}
// in renderAt: explode(seg(t, 3, 1.5, ease.inOutCubic) - seg(t, 6, 1.5, ease.inOutCubic));
```

### Light Sweep / Specular Streak

Animate a narrow, very bright `RectAreaLight` (or the rim light) across the product so that a highlight glides along glossy surfaces. Pair it with bloom at a high threshold so only the streak glows.

```javascript
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
RectAreaLightUniformsLib.init();

const strip = new THREE.RectAreaLight("#ffffff", 30, 0.15, 4); // thin vertical strip
strip.position.set(-3, 1, 2);
strip.lookAt(0, 0.5, 0);
scene.add(strip);

// in renderAt:
const s = seg(t, 1, 2.5, ease.inOutSine);
strip.position.x = THREE.MathUtils.lerp(-3, 3, s);
strip.lookAt(0, 0.5, 0);
```

`RectAreaLight` only affects `MeshStandardMaterial` and `MeshPhysicalMaterial`.

### Reveal From Darkness

```javascript
// Start black, bring up environment then key light, finish with rim
scene.environmentIntensity = seg(t, 0, 2) * 0.8;
key.intensity = seg(t, 0.5, 1.5) * 2.0;
rim.intensity = seg(t, 1.5, 1.0, ease.outExpo) * 3.0;
```

### Particle Assemble / Dissolve

Use `threejs-particles-cinematic`: sample the product surface with `MeshSurfaceSampler`, morph particles from a scattered cloud to the surface, then cross-fade to the real mesh (`material.opacity` or a dissolve shader from `threejs-shaders`).

### Material Showcase

```javascript
// Premium finishes with MeshPhysicalMaterial
const finishes = {
  glossyPaint: { color: "#b3001b", metalness: 0, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.05 },
  brushedMetal: { color: "#c8c8c8", metalness: 1, roughness: 0.35 },
  frostedGlass: { color: "#ffffff", metalness: 0, roughness: 0.25, transmission: 1, thickness: 0.5, ior: 1.5 },
  softTouch: { color: "#1a1a1a", metalness: 0, roughness: 0.8, sheen: 1, sheenRoughness: 0.6 },
};
const mat = new THREE.MeshPhysicalMaterial(finishes.glossyPaint);
```

Transmission is expensive (it adds an extra render of the scene). Use it on one hero object, not everywhere, especially on phones.

## Cinematic Finishing (Post-Processing)

```javascript
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.35, 0.5, 0.9));
composer.addPass(new OutputPass());

// Vignette + film grain as the final pass (after OutputPass, works in display space)
const finishPass = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uGrain: { value: 0.04 }, uVignette: { value: 0.35 } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime, uGrain, uVignette;
    varying vec2 vUv;
    float rand(vec2 co) { return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float v = 1.0 - smoothstep(0.2, 0.85, length(vUv - 0.5));
      c.rgb *= mix(1.0, v, uVignette);
      c.rgb += (rand(vUv + fract(uTime)) - 0.5) * uGrain;
      gl_FragColor = c;
    }
  `,
});
composer.addPass(finishPass);
// in renderAt: finishPass.uniforms.uTime.value = t;
```

Remember `composer.setSize(w, h)` on resize. Use depth of field (`BokehPass`) sparingly: it is heavy on phones.

## Social Video Formats

Render at a fixed output resolution and scale the canvas with CSS so that the framing is identical on every screen.

| Format | Size | Use |
|---|---|---|
| 9:16 | 1080x1920 | Reels, TikTok, Shorts, Stories |
| 1:1 | 1080x1080 | Feed post |
| 4:5 | 1080x1350 | Instagram portrait feed |
| 16:9 | 1920x1080 | YouTube, website hero |

```javascript
function setOutputSize(w, h) {
  renderer.setPixelRatio(1);           // exact pixel size for export
  renderer.setSize(w, h, false);       // false = don't touch CSS size
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  // composer.setSize(w, h); // if using post-processing
}

// Fit the canvas inside the screen, preserving aspect
const canvas = renderer.domElement;
Object.assign(canvas.style, {
  width: "100%", height: "100%", objectFit: "contain", display: "block", background: "#000",
});

setOutputSize(1080, 1920);
```

Vertical (9:16) frames are narrow: re-run `frameCamera()` after changing the aspect so that the product is not cropped.

## Export to Video

### Real-Time Recording (Simplest, Works in Android Chrome)

```javascript
async function recordVideo(seconds = DURATION, fps = 30) {
  const stream = renderer.domElement.captureStream(fps);
  const mimeType = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"]
    .find((m) => MediaRecorder.isTypeSupported(m));
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 12_000_000 });
  const chunks = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);

  const done = new Promise((resolve) => (recorder.onstop = resolve));
  recorder.start();

  const t0 = performance.now();
  renderer.setAnimationLoop(() => {
    const t = (performance.now() - t0) / 1000;
    if (t >= seconds) {
      renderer.setAnimationLoop(null);
      recorder.stop();
      return;
    }
    renderAt(t);
  });

  await done;
  const blob = new Blob(chunks, { type: mimeType });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `product-${Date.now()}.${mimeType.includes("mp4") ? "mp4" : "webm"}`;
  a.click();
}

// Must be triggered from a user gesture on mobile
document.querySelector("#record").addEventListener("click", () => recordVideo());
```

Real-time recording drops frames if the device cannot hold the frame rate. Lower the resolution, bloom quality, or particle count while recording.

### Frame-Perfect Offline Rendering

Because `renderAt(t)` is deterministic, you can render each frame at `t = i / fps` regardless of speed. Then encode with WebCodecs (`VideoEncoder`) and a muxer library (for example `mp4-muxer` / `webm-muxer` from npm), or save a PNG sequence:

```javascript
async function renderFrames(fps = 30, seconds = DURATION, onFrame) {
  const total = Math.round(fps * seconds);
  for (let i = 0; i < total; i++) {
    renderAt(i / fps);
    // Read the canvas immediately after rendering (same task), or create the
    // renderer with { preserveDrawingBuffer: true }
    const bitmap = await createImageBitmap(renderer.domElement);
    await onFrame(bitmap, i, total);
    bitmap.close();
  }
}
```

A WebM from MediaRecorder can be converted to MP4 for Instagram/TikTok with any online converter or video editor app (for example CapCut on Android).

## Mobile Performance Checklist

- `setPixelRatio(Math.min(devicePixelRatio, 2))` for preview, and exactly `1` at a fixed size for export.
- Compress models: Draco or Meshopt geometry and KTX2 textures (see `threejs-loaders`). Keep products under ~5 MB.
- One shadow-casting light, `mapSize` of 1024-2048. Tighten the shadow camera bounds around the product.
- Bake when possible: a static product on a static floor can use a baked blob shadow instead of shadow maps.
- Avoid `transmission` on multiple objects. Use at most 2-3 post passes on phones.
- Pause rendering when the tab is hidden (`document.visibilitychange`).

## See Also

- `threejs-particles-cinematic` for particle assemble/dissolve, glow, and trails
- `threejs-lighting` for light types, shadows, and IBL details
- `threejs-materials` for MeshPhysicalMaterial properties
- `threejs-loaders` for GLTF/Draco/KTX2 loading
- `threejs-postprocessing` for bloom, DOF, and custom passes
- `threejs-animation` for playing animations embedded in GLB files
