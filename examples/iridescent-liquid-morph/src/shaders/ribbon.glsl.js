// Liquid chrome ribbon — vertex deformation + chrome/iridescent shading.
//
// Vertex stage: the flat (u, v) grid is turned into a flattened tube that follows a
// moving centreline. Normals are computed with finite differences of the same
// analytic surface function, so lighting stays correct however the shape morphs.
//
// Fragment stage: chrome = reflection of an analytic "studio" environment
// (soft-box rectangles + coloured bounce cards), tinted by a thin-film inspired
// iridescence. No textures, no float render targets, no extensions → runs on any
// WebGL2 device (incl. Mali/Adreno Android GPUs).

import { noiseGLSL, commonGLSL } from './noise.glsl.js';

export const ribbonVertexShader = /* glsl */ `
${commonGLSL}
${noiseGLSL}

uniform float uPhase;       // 2π·t/T
uniform vec2  uLoop;        // (cos φ, sin φ) — the noise time-circle
uniform float uSeed;        // makes every ribbon different
uniform float uLength;      // half length of the centreline (object units)
uniform float uWidth;       // half width of the ribbon
uniform float uThickness;   // half thickness of the ribbon
uniform float uTwist;       // static twist (in half-turns over the length)
uniform float uWaveAmp;     // travelling-wave strength of the centreline
uniform float uRipple;      // liquid undulation of the sheet (fraction of width)
uniform float uNoiseFreq;   // spatial frequency of the morph noise along the length
uniform float uLoopRadius;  // radius of the noise time-circle (= morph speed)

varying vec3  vWorldPos;
varying vec3  vWorldNormal;
varying float vFilm;
varying float vAcross;

// Centreline: a fixed S-shaped arc + travelling waves.
// Waves use (k·π·s − m·φ) with integer m  →  periodic over the loop.
vec3 centerline(float s) {
  float ph = uPhase;
  vec3 c;
  c.x = s * uLength
      + uWaveAmp * 0.22 * sin(PI * 1.1 * s - ph + 2.0 + uSeed);
  c.y = 0.62 * sin(PI * 1.25 * s + 0.35 + uSeed)
      + uWaveAmp * (0.42 * sin(PI * 1.6 * s - ph + uSeed)
                  + 0.14 * sin(PI * 3.2 * s + 2.0 * ph + 1.3));
  c.z = 0.95 * cos(PI * 1.05 * s + 0.5 * uSeed)
      + uWaveAmp * (0.46 * cos(PI * 1.3 * s - ph + 0.8)
                  + 0.12 * sin(PI * 2.7 * s - 2.0 * ph));
  return c;
}

float twistAngle(float s) {
  return uTwist * PI * s
       + 0.85 * sin(PI * 1.2 * s - uPhase + 0.5 + uSeed)
       + 0.30 * sin(2.0 * uPhase + PI * 2.3 * s);
}

// Morph noise. Time enters only through uLoop (a circle) → exact loop.
float flowNoise(float s, float e) {
  float n = snoise(vec4(s * uNoiseFreq + uSeed * 7.13, e * 0.85 + uSeed * 3.71, uLoop * uLoopRadius));
#if NOISE_OCTAVES > 1
  n += 0.45 * snoise(vec4(s * uNoiseFreq * 2.07 + 19.1, e * 1.9 - 4.3, vec2(uLoop.y, -uLoop.x) * uLoopRadius * 1.6));
  n *= 0.72;
#endif
  return n;
}

// Surface point for (u, beta). beta walks around the flattened cross-section.
vec3 surfacePoint(float u, float beta, out float n) {
  float s = u * 2.0 - 1.0;
  vec3 c = centerline(s);
  vec3 T = normalize(centerline(s + 0.0025) - centerline(s - 0.0025));
  vec3 up = vec3(0.0, 1.0, 0.0);
  vec3 N0 = normalize(up - T * dot(up, T));
  vec3 B0 = cross(T, N0);
  float a = twistAngle(s);
  vec3 N1 = cos(a) * N0 + sin(a) * B0; // across the width
  vec3 B1 = cross(T, N1);              // through the thickness

  // Tapered ends become thin liquid tendrils instead of hard cuts.
  float taper = smoothstep(0.0, 0.18, u) * (1.0 - smoothstep(0.82, 1.0, u));
  float w = uWidth * (0.8 + 0.2 * sin(PI * 1.6 * s + uPhase + uSeed)) * taper;
  float e = cos(beta);
  float f = sin(beta);
  n = flowNoise(s, e);
  float h = uThickness * mix(0.4, 1.0, taper) * (1.0 + 0.55 * n);

  vec3 p = c + N1 * (e * w) + B1 * (f * h);
  p += B1 * (uRipple * w * n); // the whole sheet undulates like a liquid film
  return p;
}

void main() {
  float u = position.x;
  float beta = position.y * TAU;
  float n, nd;
  vec3 p0 = surfacePoint(u, beta, n);
  vec3 pu = surfacePoint(u + 0.0015, beta, nd);
  vec3 pb = surfacePoint(u, beta + 0.012, nd);
  // Parameterisation is right-handed: cross(dβ, du) points outwards everywhere.
  vec3 nrm = normalize(cross(pb - p0, pu - p0));

  vec4 world = modelMatrix * vec4(p0, 1.0);
  vWorldPos = world.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * nrm);
  float s = u * 2.0 - 1.0;
  vFilm = 0.5 + 0.35 * n + 0.25 * sin(PI * 1.4 * s + uPhase + uSeed);
  vAcross = cos(beta);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const ribbonFragmentShader = /* glsl */ `
${commonGLSL}

uniform mat3  uEnvRot;      // slow, periodic rotation of the studio
uniform vec4  uBoxes;       // intensities: key strip, top box, blue rim, colour cards
uniform float uExposure;
uniform float uIrid;        // iridescence strength 0..1
uniform float uHueShift;    // periodic hue drift of the film colour
uniform float uFilmScale;
uniform vec3  uFogColor;    // linear
uniform vec2  uFog;         // near / far distance
uniform float uFogAmount;
uniform float uFrameSeed;
uniform float uBrightness;  // per-ribbon multiplier (background ribbons are dimmer)

varying vec3  vWorldPos;
varying vec3  vWorldNormal;
varying float vFilm;
varying float vAcross;

vec3 srgbToLinear(vec3 c) { return pow(c, vec3(2.2)); }

// Cyclic palette: cyan → electric blue → violet → magenta → cyan.
vec3 irisPalette(float h) {
  h = fract(h) * 4.0;
  vec3 c0 = vec3(0.00, 0.86, 1.00);
  vec3 c1 = vec3(0.05, 0.32, 1.00);
  vec3 c2 = vec3(0.52, 0.20, 1.00);
  vec3 c3 = vec3(1.00, 0.18, 0.82);
  float f = smoothstep(0.0, 1.0, fract(h));
  vec3 a = c3; vec3 b = c0;
  if (h < 1.0)      { a = c0; b = c1; }
  else if (h < 2.0) { a = c1; b = c2; }
  else if (h < 3.0) { a = c2; b = c3; }
  return srgbToLinear(mix(a, b, f));
}

// Rounded-rectangle soft box seen in direction d (projected onto the plane at distance 1).
float softbox(vec3 r, vec3 d, vec3 hint, vec2 halfSize, float soft) {
  float z = dot(r, d);
  if (z <= 0.0) return 0.0;
  vec3 W = normalize(cross(d, hint));
  vec3 U = cross(W, d);
  vec2 p = vec2(dot(r, W), dot(r, U)) / z;
  vec2 q = abs(p) - halfSize;
  float dist = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
  return 1.0 - smoothstep(-soft, soft, dist);
}

// Analytic studio: dark navy room, white key strip + top box, coloured bounce cards.
vec3 studioEnv(vec3 r, float soft) {
  r = uEnvRot * r;
  vec3 col = mix(vec3(0.0012, 0.0018, 0.0055), vec3(0.010, 0.016, 0.045), smoothstep(-0.5, 0.8, r.y));
  col += srgbToLinear(vec3(0.00, 0.80, 1.00)) * 0.85 * uBoxes.w * softbox(r, normalize(vec3(-1.0, 0.15, 0.35)), vec3(0.0, 1.0, 0.0), vec2(0.9, 1.4), 0.55 + soft);
  col += srgbToLinear(vec3(1.00, 0.15, 0.80)) * 0.85 * uBoxes.w * softbox(r, normalize(vec3(1.0, -0.05, -0.25)), vec3(0.0, 1.0, 0.0), vec2(0.8, 1.2), 0.55 + soft);
  col += srgbToLinear(vec3(0.45, 0.20, 1.00)) * 0.55 * uBoxes.w * softbox(r, normalize(vec3(0.2, -0.9, 0.3)), vec3(0.0, 0.0, 1.0), vec2(1.5, 1.0), 0.65 + soft);
  col += vec3(6.0) * uBoxes.x * softbox(r, normalize(vec3(-0.35, 0.75, 0.60)), vec3(0.0, 0.0, 1.0), vec2(1.2, 0.07), 0.015 + soft);
  col += vec3(2.5) * uBoxes.y * softbox(r, normalize(vec3(0.10, 1.0, 0.05)), vec3(0.0, 0.0, 1.0), vec2(0.55, 0.55), 0.04 + soft);
  col += srgbToLinear(vec3(0.10, 0.35, 1.00)) * 3.0 * uBoxes.z * softbox(r, normalize(vec3(0.6, 0.35, -1.0)), vec3(0.0, 1.0, 0.0), vec2(0.22, 1.4), 0.03 + soft);
  return col;
}

void main() {
  vec3 N = normalize(vWorldNormal);
  vec3 V = normalize(cameraPosition - vWorldPos);
  float NdV = clamp(dot(N, V), 0.0, 1.0);
  vec3 R = reflect(-V, N);

  vec3 env = studioEnv(R, 0.02);
#if DUAL_LOBE
  // Second, blurrier lobe: gives the "thick liquid" sheen between the sharp highlights.
  vec3 envSoft = studioEnv(normalize(mix(R, N, 0.35)), 0.30);
  env = mix(envSoft, env, 0.7);
#endif

  // Thin-film inspired colour: hue depends on film thickness and refraction angle.
  float sinT2 = (1.0 - NdV * NdV) / (1.45 * 1.45);
  float cosT = sqrt(max(1.0 - sinT2, 0.0));
  vec3 irid = irisPalette(vFilm * uFilmScale * cosT + uHueShift);
  float iridMask = uIrid * mix(0.45, 1.0, pow(1.0 - NdV, 1.5));

  vec3 F0 = vec3(0.90, 0.92, 0.96); // polished chrome / silver
  vec3 tint = mix(F0, irid * 1.6, iridMask);
  vec3 F = tint + (vec3(1.0) - tint) * pow(1.0 - NdV, 5.0);
  vec3 col = env * F * uBrightness;

  float d = length(cameraPosition - vWorldPos);
  col = mix(col, uFogColor, uFogAmount * smoothstep(uFog.x, uFog.y, d));

  col = acesFilm(col * uExposure);
  gl_FragColor = vec4(linearToSRGB(col) + dither8(gl_FragCoord.xy, uFrameSeed), 1.0);
}
`;
