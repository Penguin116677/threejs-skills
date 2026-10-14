import * as THREE from 'three';
import { shared } from './shared.js';
import { heightAt } from './terrain.js';
import vert from '../shaders/firefly.vert.glsl?raw';
import frag from '../shaders/firefly.frag.glsl?raw';

/**
 * Fireflies wander over the near/mid field on the CPU (a few hundred points
 * is cheap) so they can react to the cursor: they scatter from it when it
 * comes close and drift curiously toward it from a little farther away.
 */
export function createFireflies({ count, field }) {
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const flies = [];
  for (let i = 0; i < count; i++) {
    const d = 3.5 + Math.pow(Math.random(), 1.2) * 28;
    const half = d * field.halfTan * 0.9 + 1;
    const x = (Math.random() * 2 - 1) * half;
    const z = field.camera.z - d;
    const fly = {
      home: new THREE.Vector3(x, 0, z),
      pos: new THREE.Vector3(x, heightAt(x, z) + 0.4 + Math.random() * 1.8, z),
      vel: new THREE.Vector3(),
      lift: 0.35 + Math.random() * 1.9,
      seed: Math.random(),
      freq: 0.15 + Math.random() * 0.25
    };
    flies.push(fly);
    seeds[i] = fly.seed;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: shared.uTime,
      uPixelRatio: shared.uPixelRatio,
      uAmount: { value: 0 },
      uScale: { value: 120 }
    },
    vertexShader: vert,
    fragmentShader: frag,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const points = new THREE.Points(geo, material);
  points.frustumCulled = false;
  points.name = 'fireflies';

  const target = new THREE.Vector3();
  const tmp = new THREE.Vector3();

  return {
    points,
    update(p, dt, time, cursor) {
      material.uniforms.uAmount.value = p.fireflies;
      points.visible = p.fireflies > 0.01;
      if (!points.visible) return;
      const step = Math.min(dt, 1 / 20);
      for (let i = 0; i < count; i++) {
        const f = flies[i];
        const t = time * f.freq + f.seed * 100;
        // Lazy Lissajous wander around home.
        target.set(
          f.home.x + Math.sin(t * 1.3) * 1.6 + Math.sin(t * 0.37) * 1.2,
          0,
          f.home.z + Math.cos(t * 1.1) * 1.4 + Math.sin(t * 0.53) * 1.0
        );
        target.y = heightAt(target.x, target.z) + f.lift + Math.sin(t * 2.1) * 0.35;
        tmp.subVectors(target, f.pos).multiplyScalar(0.6);
        f.vel.addScaledVector(tmp, step);

        if (cursor) {
          tmp.subVectors(f.pos, cursor);
          tmp.y *= 0.6;
          const d = tmp.length();
          if (d < 1.4) {
            // Scatter away from a close hand.
            f.vel.addScaledVector(tmp.normalize(), (1.4 - d) * 9 * step);
          } else if (d < 5) {
            // ...and drift curiously toward it from farther away.
            f.vel.addScaledVector(tmp.normalize(), -(5 - d) * 0.35 * step);
          }
        }
        f.vel.multiplyScalar(Math.pow(0.35, step));
        f.pos.addScaledVector(f.vel, step);
        const ground = heightAt(f.pos.x, f.pos.z) + 0.12;
        if (f.pos.y < ground) f.pos.y = ground;
        positions[i * 3] = f.pos.x;
        positions[i * 3 + 1] = f.pos.y;
        positions[i * 3 + 2] = f.pos.z;
      }
      geo.attributes.position.needsUpdate = true;
    }
  };
}
