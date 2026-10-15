// Slow cinematic camera: a small closed path (orbit + float), periodic over the loop.
import { PerspectiveCamera, Vector3 } from 'three';
import { CAMERA } from '../config/look.js';

const base = new Vector3(...CAMERA.position);
const target = new Vector3(...CAMERA.target);
const tmp = new Vector3();

export function createCamera(aspect) {
  const cam = new PerspectiveCamera(CAMERA.fov, aspect, CAMERA.near, CAMERA.far);
  cam.position.copy(base);
  cam.lookAt(target);
  return cam;
}

export function updateCamera(cam, s) {
  const p = s.phase;
  cam.position.set(
    base.x + 0.55 * Math.sin(p),
    base.y + 0.2 * Math.sin(2 * p + 0.6),
    base.z + 0.35 * Math.cos(p),
  );
  tmp.set(
    target.x + 0.12 * Math.sin(p + 1.2),
    target.y + 0.06 * Math.cos(2 * p),
    target.z,
  );
  // Tiny roll for a hand-held-free but "alive" feel.
  const roll = 0.012 * Math.sin(p + 0.9);
  cam.up.set(Math.sin(roll), Math.cos(roll), 0);
  cam.lookAt(tmp);
}
