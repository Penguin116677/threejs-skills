import * as THREE from 'three';
import { fogUniforms } from './shared.js';
import common from '../shaders/common.glsl?raw';
import frag from '../shaders/cloud.frag.glsl?raw';

// --- tiny value-noise for baking cloud textures on the CPU ---------------
function makeNoise(seed) {
  const perm = new Uint8Array(512);
  const p = Array.from({ length: 256 }, (_, i) => i);
  let s = seed * 9301 + 49297;
  for (let i = 255; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const v = (x, y) => perm[(perm[x & 255] + y) & 255] / 255;
  const fade = (t) => t * t * (3 - 2 * t);
  const noise = (x, y) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = fade(x - xi);
    const yf = fade(y - yi);
    const a = v(xi, yi);
    const b = v(xi + 1, yi);
    const c = v(xi, yi + 1);
    const d = v(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  };
  return (x, y) => {
    let sum = 0;
    let amp = 0.5;
    let f = 1;
    for (let o = 0; o < 5; o++) {
      sum += noise(x * f, y * f) * amp;
      f *= 2.1;
      amp *= 0.5;
    }
    return sum;
  };
}

/**
 * Bake a soft cumulus: R = density, G = self-shadowed light (lit from above).
 * Low resolution + linear filtering keeps the edges blurry and cheap.
 */
function bakeCloud(seed, w = 192, h = 96) {
  const fbm = makeNoise(seed);
  const density = new Float32Array(w * h);
  const puffs = [];
  const n = 4 + (seed % 3);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    puffs.push({
      x: 0.18 + t * 0.64 + (fbm(i * 3.1, seed) - 0.5) * 0.12,
      y: 0.42 + (fbm(seed, i * 1.7) - 0.5) * 0.18 + Math.sin(t * Math.PI) * 0.1,
      r: 0.16 + Math.sin(t * Math.PI) * 0.14 + fbm(i, seed * 0.3) * 0.05
    });
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const v = y / h;
      let shape = 0;
      for (const p of puffs) {
        const dx = (u - p.x) / p.r;
        const dy = ((v - p.y) / p.r) * 2.0;
        shape = Math.max(shape, 1 - Math.sqrt(dx * dx + dy * dy));
      }
      // Flatten the base like a fair-weather cumulus.
      const base = THREE.MathUtils.smoothstep(v, 0.2, 0.36);
      const n2 = fbm(u * 6 + seed * 10, v * 3);
      let d = shape * 1.25 + (n2 - 0.5) * 0.9;
      const win =
        THREE.MathUtils.smoothstep(u, 0, 0.14) * THREE.MathUtils.smoothstep(1 - u, 0, 0.14) *
        THREE.MathUtils.smoothstep(v, 0, 0.12) * THREE.MathUtils.smoothstep(1 - v, 0, 0.2);
      d = THREE.MathUtils.clamp(d * base * win, 0, 1);
      density[y * w + x] = d;
    }
  }
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      // March upward to estimate how much cloud shades this texel.
      let occ = 0;
      for (let k = 1; k <= 8; k++) {
        const yy = Math.min(h - 1, y + k * 2);
        const xx = Math.max(0, x - k);
        occ += density[yy * w + xx];
      }
      const light = Math.exp(-occ * 0.55);
      data[i * 4] = density[i] * 255;
      data[i * 4 + 1] = light * 255;
      data[i * 4 + 2] = 0;
      data[i * 4 + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

const SPAN = 520; // horizontal wrap range

export function createClouds({ count = 14 } = {}) {
  const group = new THREE.Group();
  group.name = 'clouds';
  const textures = [1, 2, 3, 4].map((s) => bakeCloud(s));

  const uniforms = {
    ...fogUniforms(),
    uLit: { value: new THREE.Color() },
    uShade: { value: new THREE.Color() },
    uOpacity: { value: 1 },
    uSunVis: { value: 1 },
    uMoonDir: { value: new THREE.Vector3() },
    uMoonVis: { value: 0 }
  };

  const geo = new THREE.PlaneGeometry(1, 0.5);
  const clouds = [];
  for (let i = 0; i < count; i++) {
    const material = new THREE.ShaderMaterial({
      uniforms: { ...uniforms, uMap: { value: textures[i % textures.length] }, uFlip: { value: Math.random() < 0.5 ? 1 : 0 } },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vWorld;
        void main() {
          vUv = uv;
          vec4 w = modelMatrix * vec4(position, 1.0);
          vWorld = w.xyz;
          gl_Position = projectionMatrix * viewMatrix * w;
        }
      `,
      fragmentShader: common + frag,
      transparent: true,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geo, material);
    const dist = 170 + Math.random() * 150;
    const elevation = THREE.MathUtils.degToRad(6 + Math.pow(Math.random(), 1.4) * 30);
    const scale = 70 + Math.random() * 90;
    mesh.position.set((i / count - 0.5) * SPAN + (Math.random() - 0.5) * 30, Math.tan(elevation) * dist + 4, -dist);
    mesh.scale.set(scale, scale, 1);
    mesh.userData.speed = 1.2 + Math.random() * 1.6 + (320 - dist) * 0.01;
    mesh.renderOrder = -5;
    clouds.push(mesh);
    group.add(mesh);
  }

  return {
    group,
    update(p, dt) {
      uniforms.uLit.value.copy(p.cloudLit);
      uniforms.uShade.value.copy(p.cloudShade);
      uniforms.uOpacity.value = p.cloudOpacity;
      uniforms.uSunVis.value = p.sunVis;
      uniforms.uMoonDir.value.copy(p.moonDir);
      uniforms.uMoonVis.value = p.moonVis;
      for (const c of clouds) {
        c.position.x += c.userData.speed * dt;
        if (c.position.x > SPAN / 2 + c.scale.x / 2) c.position.x -= SPAN + c.scale.x;
      }
    }
  };
}
