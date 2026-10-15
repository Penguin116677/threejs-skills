// Studio lighting animation. The "lights" are analytic soft boxes inside the
// chrome shader's environment function; here we only drive them over time.
// All motion = integer harmonics of the loop phase → identical at t=0 and t=T.
import { Euler, Matrix4 } from 'three';
import { BACKGROUND } from '../config/look.js';

const euler = new Euler();
const m4 = new Matrix4();

export function updateLighting(shared, background, s) {
  const p = s.phase;
  // Slow drift of the whole studio around the object: highlights glide over the chrome.
  const yaw = 0.22 * Math.sin(p + 0.3) + 0.06 * Math.sin(2 * p + 1.1);
  const pitch = 0.07 * Math.sin(p + 2.0);
  const roll = 0.04 * Math.sin(2 * p + 0.4);
  euler.set(pitch, yaw, roll, 'YXZ');
  shared.uEnvRot.value.setFromMatrix4(m4.makeRotationFromEuler(euler));

  // Gentle "breathing" of each light (±10–18 %).
  shared.uBoxes.value.set(
    1.0 + 0.12 * Math.sin(p + 0.5), // white key strip
    1.0 + 0.1 * Math.sin(2 * p + 1.0), // top soft box
    1.0 + 0.18 * Math.sin(p + 2.4), // electric-blue rim
    1.0 + 0.1 * Math.sin(p + 4.0), // colour bounce cards
  );

  // Iridescent hue drifts back and forth (never a full rainbow cycle).
  shared.uHueShift.value = 0.1 * Math.sin(p) + 0.04 * Math.sin(2 * p + 1.0);

  // Background glow follows the hero a little.
  background.uniforms.uGlowPos.value.set(
    BACKGROUND.glowPos[0] + 0.02 * Math.sin(p + 0.7),
    BACKGROUND.glowPos[1] + 0.02 * Math.cos(p + 0.7),
  );
}
