import * as THREE from 'three';
import { shared, fogUniforms, lightUniforms } from './shared.js';
import common from '../shaders/common.glsl?raw';
import vert from '../shaders/terrain.vert.glsl?raw';
import frag from '../shaders/terrain.frag.glsl?raw';

/** The hill: a broad, soft mound whose sides roll away below the horizon. */
export const HILL = { top: 4.4, z: -40, sx: 30, sz: 17, roll: 0.0042 };

export function heightAt(x, z) {
  const dx = x / HILL.sx;
  const dz = (z - HILL.z) / HILL.sz;
  const mound = HILL.top * Math.exp(-0.5 * (dx * dx + dz * dz));
  const roll = -HILL.roll * x * x - 0.0016 * Math.max(0, -z + HILL.z) ** 2;
  const ripple = 0.12 * Math.sin(x * 0.31 + 1.3) * Math.sin(z * 0.23 + 0.7);
  return mound + roll + ripple;
}

export function normalAt(x, z, target = new THREE.Vector3()) {
  const e = 0.05;
  const hx = heightAt(x + e, z) - heightAt(x - e, z);
  const hz = heightAt(x, z + e) - heightAt(x, z - e);
  return target.set(-hx, 2 * e, -hz).normalize();
}

/** Ray-march the analytic heightfield; cheaper than raycasting a dense mesh. */
export function intersectTerrain(ray, maxDist = 120, target = new THREE.Vector3()) {
  const p = new THREE.Vector3();
  let prevT = 0;
  let step = 0.25;
  for (let t = 0.2; t < maxDist; t += step) {
    ray.at(t, p);
    if (p.y < heightAt(p.x, p.z)) {
      // Refine with a short bisection.
      let lo = prevT;
      let hi = t;
      for (let i = 0; i < 12; i++) {
        const mid = (lo + hi) * 0.5;
        ray.at(mid, p);
        if (p.y < heightAt(p.x, p.z)) hi = mid;
        else lo = mid;
      }
      return ray.at(hi, target);
    }
    prevT = t;
    step = 0.25 + t * 0.02;
  }
  return null;
}

export function createTerrain() {
  const size = 260;
  const geo = new THREE.PlaneGeometry(size, size, 220, 220);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0, -size / 2 + 30);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)) - 0.02);
  }
  geo.computeVertexNormals();

  const material = new THREE.ShaderMaterial({
    uniforms: {
      ...fogUniforms(),
      ...lightUniforms(),
      uTime: shared.uTime,
      uColor: { value: new THREE.Color() },
      uTipColor: { value: new THREE.Color() }
    },
    vertexShader: vert,
    fragmentShader: common + frag
  });

  const mesh = new THREE.Mesh(geo, material);
  mesh.name = 'terrain';

  return {
    mesh,
    update(p) {
      material.uniforms.uColor.value.copy(p.terrain);
      material.uniforms.uTipColor.value.copy(p.grassTip);
    }
  };
}
