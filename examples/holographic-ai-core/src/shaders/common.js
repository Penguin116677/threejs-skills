// Shared GLSL used by every holographic material.
//
// All holographic layers are additive and do not write depth. Additive
// blending is commutative, so draw order cannot matter: this removes the
// transparency-sorting problem entirely instead of trying to hide it.
// Occlusion by the glass sphere is computed analytically (glassTransmit).

export const COMMON_GLSL = /* glsl */ `
#define TAU 6.28318530718
uniform float uPhase;       // loop phase 0..1
uniform float uStoryTime;   // canonical story seconds (1e4 in loop mode)
uniform float uPulseR;
uniform float uPulseAmp;
uniform float uPulseW;
uniform float uSphereR;
uniform float uLight;       // global lighting state
uniform float uGlow;        // glow multiplier
uniform vec3 uCyan;
uniform vec3 uIce;
uniform vec3 uViolet;
uniform vec3 uSilver;
uniform vec3 uGlassTint;
uniform vec3 uKeyDir;       // key softbox direction (world, normalized)
uniform vec3 uRimDir;       // rim softbox direction (world, normalized)

float pulseAt(float r) {
  float d = (r - uPulseR) / uPulseW;
  return uPulseAmp * exp(-d * d);
}

// Light reaching the eye from world point wp after crossing the glass shell.
// Returns 1 when the view ray does not pass through the sphere before wp.
vec3 glassTransmit(vec3 wp) {
  vec3 ro = cameraPosition;
  vec3 rd = wp - ro;
  float L = length(rd);
  rd /= L;
  float b = dot(ro, rd);
  float c = dot(ro, ro) - uSphereR * uSphereR;
  float h = b * b - c;
  if (h <= 0.0) return vec3(1.0);
  float sh = sqrt(h);
  float tEnter = -b - sh;
  // soft at the silhouette so the occlusion boundary never aliases
  float cover = smoothstep(0.0, 0.18 * uSphereR * uSphereR, h);
  float behind = smoothstep(tEnter - 0.02, tEnter + 0.06, L);
  return mix(vec3(1.0), uGlassTint, cover * behind);
}

// Stylised thin-film interference, constrained to the brand palette so it reads
// as premium iridescence (cyan / ice / violet / silver) rather than rainbow.
vec3 thinFilm(float ndv, float thickness) {
  float opd = thickness * (1.15 - 0.55 * ndv);
  vec3 w = 0.5 + 0.5 * cos(TAU * (opd + vec3(0.0, 0.33, 0.67)));
  vec3 col = uCyan * w.x + uViolet * w.y * 1.1 + uIce * w.z;
  return mix(col / 1.6, uSilver, 0.18);
}

// Two procedural softboxes give glass and metal something believable to reflect.
float softbox(vec3 R, vec3 dir, float size, float sharp) {
  float d = max(dot(R, dir), 0.0);
  return smoothstep(1.0 - size, 1.0 - size * (1.0 - sharp), d);
}
vec3 envReflect(vec3 R) {
  vec3 c = uSilver * softbox(R, uKeyDir, 0.055, 0.6) * 1.5;
  c += uViolet * softbox(R, uRimDir, 0.16, 0.35) * 0.9;
  // faint horizon band
  c += uIce * 0.05 * exp(-R.y * R.y * 18.0);
  return c * uLight;
}

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
`;

// Shared uniform objects. Materials spread these into their own uniforms so a
// single update per frame reaches every shader.
export function createSharedUniforms(THREE) {
  return {
    uPhase: { value: 0 },
    uStoryTime: { value: 1e4 },
    uPulseR: { value: 0 },
    uPulseAmp: { value: 0 },
    uPulseW: { value: 0.3 },
    uSphereR: { value: 1 },
    uLight: { value: 1 },
    uGlow: { value: 1 },
    uCyan: { value: new THREE.Color() },
    uIce: { value: new THREE.Color() },
    uViolet: { value: new THREE.Color() },
    uSilver: { value: new THREE.Color() },
    uGlassTint: { value: new THREE.Color() },
    uKeyDir: { value: new THREE.Vector3(-0.55, 0.62, 0.56).normalize() },
    uRimDir: { value: new THREE.Vector3(0.75, 0.25, -0.62).normalize() },
  };
}

export function holoMaterial(THREE, shared, { uniforms = {}, vertexShader, fragmentShader, side = THREE.FrontSide }) {
  return new THREE.ShaderMaterial({
    uniforms: { ...shared, ...uniforms },

    vertexShader: COMMON_GLSL + vertexShader,
    fragmentShader: COMMON_GLSL + fragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    side,
  });
}
