import * as THREE from 'three';
import { shared, fogUniforms } from './shared.js';
import common from '../shaders/common.glsl?raw';
import vert from '../shaders/sky.vert.glsl?raw';
import frag from '../shaders/sky.frag.glsl?raw';

export function createSky() {
  const group = new THREE.Group();
  group.name = 'sky';

  const material = new THREE.ShaderMaterial({
    uniforms: {
      ...fogUniforms(),
      uZenith: { value: new THREE.Color() },
      uMid: { value: new THREE.Color() },
      uHorizon: { value: new THREE.Color() },
      uSunColor: { value: new THREE.Color() },
      uMoonDir: { value: new THREE.Vector3() },
      uSunVis: { value: 1 },
      uMoonVis: { value: 0 }
    },
    vertexShader: vert,
    fragmentShader: common + frag,
    side: THREE.BackSide,
    depthWrite: false
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(500, 64, 32), material);
  dome.renderOrder = -10;
  dome.frustumCulled = false;
  group.add(dome);

  // Stars: a sprinkle of points on the upper sky that twinkle at night.
  const count = 1400;
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const u = Math.random();
    const el = Math.asin(0.04 + 0.96 * Math.sqrt(u));
    const az = Math.random() * Math.PI * 2;
    const r = 450;
    pos[i * 3] = Math.cos(el) * Math.sin(az) * r;
    pos[i * 3 + 1] = Math.sin(el) * r;
    pos[i * 3 + 2] = -Math.cos(el) * Math.cos(az) * r;
    seed[i] = Math.random();
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  starGeo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const starMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: shared.uTime,
      uPixelRatio: shared.uPixelRatio,
      uOpacity: { value: 0 },
      uMoonDir: material.uniforms.uMoonDir
    },
    vertexShader: /* glsl */ `
      attribute float aSeed;
      uniform float uTime;
      uniform float uPixelRatio;
      uniform vec3 uMoonDir;
      varying float vBright;
      void main() {
        vec3 dir = normalize(position);
        float twinkle = 0.65 + 0.35 * sin(uTime * (0.8 + aSeed * 2.5) + aSeed * 60.0);
        float nearMoon = smoothstep(0.985, 0.94, dot(dir, uMoonDir));
        float horizon = smoothstep(0.02, 0.25, dir.y);
        vBright = (0.25 + pow(aSeed, 6.0) * 1.6) * twinkle * nearMoon * horizon;
        gl_PointSize = (1.0 + pow(aSeed, 4.0) * 2.2) * uPixelRatio;
        vec4 clip = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
        gl_Position = clip.xyww;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      varying float vBright;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(vec3(0.85, 0.9, 1.0) * vBright * a * uOpacity, 1.0);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const stars = new THREE.Points(starGeo, starMat);
  stars.renderOrder = -9;
  stars.frustumCulled = false;
  group.add(stars);

  return {
    group,
    update(p, camera) {
      group.position.copy(camera.position);
      const u = material.uniforms;
      u.uZenith.value.copy(p.zenith);
      u.uMid.value.copy(p.mid);
      u.uHorizon.value.copy(p.horizon);
      u.uSunColor.value.copy(p.sun);
      u.uMoonDir.value.copy(p.moonDir);
      u.uSunVis.value = p.sunVis;
      u.uMoonVis.value = p.moonVis;
      starMat.uniforms.uOpacity.value = p.stars;
      stars.visible = p.stars > 0.01;
    }
  };
}
