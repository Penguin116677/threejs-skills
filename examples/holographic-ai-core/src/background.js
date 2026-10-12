// Full-screen background: midnight-navy gradient, faint volumetric scatter
// around the core, very soft light shafts and a vignette. Opaque, drawn first.
import { COMMON_GLSL } from './shaders/common.js';

export function createBackground(THREE, shared) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const uniforms = {
    ...shared,
    uCore: { value: new THREE.Vector2(0.6, 0.5) },
    uAspect: { value: 16 / 9 },
    uDark: { value: 0.6 },
    uBuild: { value: 1 },
    uNavyDeep: { value: new THREE.Color() },
    uNavy: { value: new THREE.Color() },
    uCoreRadius: { value: 0.12 }, // sphere radius in screen-height units
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    depthTest: false,
    depthWrite: false,
    blending: THREE.NoBlending,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: COMMON_GLSL + /* glsl */ `
      uniform vec2 uCore;
      uniform float uAspect;
      uniform float uDark;
      uniform float uBuild;
      uniform vec3 uNavyDeep;
      uniform vec3 uNavy;
      uniform float uCoreRadius;
      varying vec2 vUv;
      void main() {
        vec2 p = vUv;
        vec2 q = (p - uCore) * vec2(uAspect, 1.0) / (uCoreRadius * 4.0);
        float d = length(q);

        // Base gradient: lifts slightly toward the core side, deepest at the bottom.
        float g = clamp(0.55 * p.y + 0.45 * (1.0 - abs(p.x - uCore.x)), 0.0, 1.0);
        vec3 col = mix(uNavyDeep, uNavy, g * g);

        // Volumetric scatter around the core.
        float scatter = exp(-d * d * 2.2) * 0.9 + exp(-d * 1.35) * 0.35;
        col += mix(uIce, uCyan, 0.6) * 0.022 * scatter * uBuild * uLight;

        // Light shafts: integer angular frequencies, rotating by whole periods per loop.
        float a = atan(q.y, q.x);
        float rays = pow(0.5 + 0.5 * cos(a * 7.0 + TAU * uPhase), 5.0) * 0.6
                   + pow(0.5 + 0.5 * cos(a * 12.0 - TAU * uPhase + 1.3), 9.0) * 0.4;
        float shaftMask = smoothstep(0.3, 0.75, d) * exp(-d * 0.9);
        col += uCyan * 0.012 * rays * shaftMask * uBuild * uLight;

        // Energy pulse lights the haze as it passes.
        float pr = pulseAt(d * 4.0 * uSphereR);
        col += uCyan * 0.02 * pr * exp(-d * 0.6) * uBuild;

        // Cool violet accent in the far lower corner, away from the copy space.
        vec2 accent = vec2(uCore.x > 0.5 ? 1.02 : -0.02, -0.05);
        col += uViolet * 0.010 * exp(-length((p - accent) * vec2(uAspect, 1.0)) * 1.8) * uBuild;

        col *= mix(1.35, 0.45, uDark);

        vec2 v = (p - 0.5) * vec2(uAspect, 1.0);
        col *= 1.0 - 0.45 * smoothstep(0.45, 1.25, length(v));
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -100;
  return { mesh, uniforms };
}
