import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import frag from '../shaders/trail.frag.glsl?raw';

/**
 * A small top-down texture over the grass field that remembers where the
 * cursor brushed: RG = push direction (xz), B = strength. Ping-ponged each
 * frame and decayed so blades slowly stand back up.
 */
export function createTrail(renderer, bounds, size = 512) {
  const opts = {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping
  };
  let read = new THREE.WebGLRenderTarget(size, size, opts);
  let write = new THREE.WebGLRenderTarget(size, size, opts);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uPrev: { value: read.texture },
      uBounds: { value: new THREE.Vector4(bounds.minX, bounds.minZ, bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ) },
      uFrom: { value: new THREE.Vector2() },
      uTo: { value: new THREE.Vector2() },
      uRadius: { value: 1 },
      uActive: { value: 0 },
      uDecay: { value: 0.98 }
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
    `,
    fragmentShader: frag,
    depthTest: false,
    depthWrite: false
  });
  const quad = new FullScreenQuad(material);

  for (const rt of [read, write]) {
    renderer.setRenderTarget(rt);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
  }
  renderer.setRenderTarget(null);

  const last = new THREE.Vector2();
  let hasLast = false;

  return {
    texture: read.texture,
    boundsUniform: material.uniforms.uBounds,
    /**
     * @param {THREE.Vector3|null} point cursor on the terrain, or null
     * @param {number} radius brush radius in world units
     */
    update(dt, point, radius) {
      const u = material.uniforms;
      // Frame-rate independent decay: strength halves roughly every 0.9s.
      u.uDecay.value = Math.pow(0.5, dt / 0.9);
      if (point) {
        if (!hasLast) last.set(point.x, point.z);
        u.uFrom.value.copy(last);
        u.uTo.value.set(point.x, point.z);
        last.set(point.x, point.z);
        hasLast = true;
        u.uRadius.value = radius;
        u.uActive.value = Math.min(1, dt * 20);
      } else {
        hasLast = false;
        u.uActive.value = 0;
      }
      u.uPrev.value = read.texture;
      const prevTarget = renderer.getRenderTarget();
      renderer.setRenderTarget(write);
      quad.render(renderer);
      renderer.setRenderTarget(prevTarget);
      [read, write] = [write, read];
      this.texture = read.texture;
    }
  };
}
