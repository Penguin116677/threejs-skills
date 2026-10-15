// Material factories. Uniforms that change per frame are SHARED objects
// (same { value } reference in every ribbon material) so one update drives all.
import { ShaderMaterial, Matrix3, Vector2, Vector3, Vector4, FrontSide } from 'three';
import { ribbonVertexShader, ribbonFragmentShader } from '../shaders/ribbon.glsl.js';
import { backgroundVertexShader, backgroundFragmentShader } from '../shaders/background.glsl.js';
import { SHADING, BACKGROUND } from '../config/look.js';

export function createSharedUniforms() {
  return {
    uPhase: { value: 0 },
    uLoop: { value: new Vector2(1, 0) },
    uFrameSeed: { value: 0 },
    uGrain: { value: BACKGROUND.grain },
    uPixelScale: { value: 1 },
    uEnvRot: { value: new Matrix3() },
    uBoxes: { value: new Vector4(1, 1, 1, 1) },
    uHueShift: { value: 0 },
    uExposure: { value: SHADING.exposure },
    uIrid: { value: SHADING.iridescence },
    uFilmScale: { value: SHADING.filmScale },
    uFogColor: { value: new Vector3(...SHADING.fogColor) },
    uFog: { value: new Vector2(SHADING.fogNear, SHADING.fogFar) },
    uFogAmount: { value: SHADING.fogAmount },
  };
}

export function createChromeMaterial(shared, look, preset) {
  return new ShaderMaterial({
    name: `chrome-${look.name}`,
    vertexShader: ribbonVertexShader,
    fragmentShader: ribbonFragmentShader,
    defines: {
      NOISE_OCTAVES: preset.octaves,
      DUAL_LOBE: preset.dualLobe,
    },
    uniforms: {
      ...shared,
      uSeed: { value: look.seed },
      uLength: { value: look.length },
      uWidth: { value: look.width },
      uThickness: { value: look.thickness },
      uTwist: { value: look.twist },
      uWaveAmp: { value: look.waveAmp },
      uRipple: { value: look.ripple },
      uNoiseFreq: { value: look.noiseFreq },
      uLoopRadius: { value: look.loopRadius },
      uBrightness: { value: look.brightness },
    },
    side: FrontSide,
  });
}

export function createBackgroundMaterial(shared) {
  return new ShaderMaterial({
    name: 'background',
    vertexShader: backgroundVertexShader,
    fragmentShader: backgroundFragmentShader,
    uniforms: {
      uFrameSeed: shared.uFrameSeed,
      uGrain: shared.uGrain,
      uPixelScale: shared.uPixelScale,
      uResolution: { value: new Vector2(1920, 1080) },
      uGlowPos: { value: new Vector2(...BACKGROUND.glowPos) },
      uGlowAmt: { value: BACKGROUND.glowAmount },
      uTop: { value: new Vector3(...BACKGROUND.top) },
      uBottom: { value: new Vector3(...BACKGROUND.bottom) },
      uGlow: { value: new Vector3(...BACKGROUND.glow) },
    },
    depthTest: false,
    depthWrite: false,
  });
}
