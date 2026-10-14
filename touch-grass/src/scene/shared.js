import * as THREE from 'three';

/**
 * Uniform objects shared by reference between materials, so a single update
 * per frame reaches every shader.
 */
export const shared = {
  uTime: { value: 0 },
  uFogColor: { value: new THREE.Color() },
  uGlowColor: { value: new THREE.Color() },
  uSunDir: { value: new THREE.Vector3(0, 1, 0) },
  uFogDensity: { value: 0.01 },
  uLightDir: { value: new THREE.Vector3(0, 1, 0) },
  uLightColor: { value: new THREE.Color(1, 1, 1) },
  uAmbient: { value: new THREE.Color() },
  uGround: { value: new THREE.Color() },
  uRim: { value: new THREE.Color() },
  uRimAmt: { value: 0.4 },
  uWind: { value: 0.5 },
  uPixelRatio: { value: 1 }
};

export function fogUniforms() {
  return {
    uFogColor: shared.uFogColor,
    uGlowColor: shared.uGlowColor,
    uSunDir: shared.uSunDir,
    uFogDensity: shared.uFogDensity
  };
}

export function lightUniforms() {
  return {
    uLightDir: shared.uLightDir,
    uLightColor: shared.uLightColor,
    uAmbient: shared.uAmbient,
    uGround: shared.uGround,
    uRim: shared.uRim,
    uRimAmt: shared.uRimAmt
  };
}
