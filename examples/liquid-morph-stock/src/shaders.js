// GLSL ES 3.00 shaders (WebGL2; #version is added by Three.js via glslVersion).
// The liquid is a signed distance field: capsule "lobes" smooth-unioned
// together (so they genuinely merge and pinch apart), domain-warped and
// displaced by loop-periodic waves, then sphere-traced. Shading is a polished
// metal with Fresnel, a procedural studio environment (soft boxes + strip
// lights), one bounce of self-reflection, cavity occlusion and thin-film
// style iridescence.

export const vertexShader = /* glsl */ `
in vec3 position;
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const fragmentShader = /* glsl */ `
precision highp float;
precision highp int;

#define LOBES 8
#define TAU 6.28318530718

uniform vec2  uResolution;
uniform float uPhase;          // loop phase 0..1 — everything periodic in it
uniform vec4  uLobeA[LOBES];   // xyz = segment start, w = radius
uniform vec4  uLobeB[LOBES];   // xyz = segment end
uniform float uBlend;          // smooth-union radius
uniform float uWave;
uniform float uRipple;
uniform float uIri;
uniform float uLight;
uniform mat3  uRot;            // object → world rotation
uniform vec3  uCamPos;
uniform vec3  uCamTarget;
uniform float uFov;            // vertical, radians
uniform float uBound;          // bounding-sphere radius of the liquid
uniform int   uAA;             // 1 single, 2 adaptive, 3 full supersampling
uniform int   uMaxSteps;
uniform int   uReflSteps;      // 0 disables self-reflection
uniform float uExposure;
uniform float uRough;
uniform float uGlow;
uniform float uVignette;
uniform float uDither;

out vec4 fragColor;

// ------------------------------------------------------------------ SDF

float smin(float a, float b, float k) {
  float h = max(k - abs(a - b), 0.0) / k;
  return min(a, b) - h * h * k * 0.25;
}

float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
  vec3 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return length(pa - ba * h) - r;
}

// Large flowing waves; integer time harmonics keep the loop seamless.
float waves(vec3 q) {
  float ph = uPhase * TAU;
  return sin(dot(q, vec3(1.7, 0.9, -0.6)) * 1.9 + ph) * 0.55
       + sin(dot(q, vec3(-0.8, 1.4, 1.1)) * 2.6 - 2.0 * ph + 1.3) * 0.30
       + sin(dot(q, vec3(0.5, -1.2, 1.6)) * 3.4 + 3.0 * ph + 2.1) * 0.15;
}

float ripples(vec3 q) {
  float ph = uPhase * TAU;
  return sin(dot(q, vec3(4.1, 2.3, -3.2)) * 1.6 - 4.0 * ph) * 0.5
       + sin(dot(q, vec3(-2.8, 4.6, 1.9)) * 1.7 + 5.0 * ph + 0.7) * 0.5;
}

vec3 warp(vec3 q) {
  float ph = uPhase * TAU;
  vec3 w = sin(q.yzx * vec3(1.9, 1.6, 2.1) + vec3(ph, 2.0 * ph + 1.0, -ph + 2.0));
  return q + w * (uWave * 1.2);
}

vec3 toObject(vec3 p) { return p * uRot; } // = transpose(uRot) * p

float map(vec3 p) {
  vec3 q = warp(toObject(p));
  float d = 1e5;
  for (int i = 0; i < LOBES; i++) {
    vec4 A = uLobeA[i];
    if (A.w < 0.002) continue;
    d = smin(d, sdCapsule(q, A.xyz, uLobeB[i].xyz, A.w), uBlend);
  }
  return d - uWave * waves(q) - uRipple * ripples(q);
}

vec3 calcNormal(vec3 p) {
  const vec2 k = vec2(1.0, -1.0);
  const float e = 0.0008;
  return normalize(k.xyy * map(p + k.xyy * e) + k.yyx * map(p + k.yyx * e) +
                   k.yxy * map(p + k.yxy * e) + k.xxx * map(p + k.xxx * e));
}

vec2 sphereHit(vec3 ro, vec3 rd, float r) {
  float b = dot(ro, rd);
  float c = dot(ro, ro) - r * r;
  float h = b * b - c;
  if (h < 0.0) return vec2(-1.0);
  h = sqrt(h);
  return vec2(-b - h, -b + h);
}

// Sphere tracing. Also records the closest approach (for silhouette
// anti-aliasing).
float march(vec3 ro, vec3 rd, out float minRatio, out float tClose) {
  minRatio = 1e9; tClose = 0.0;
  vec2 bs = sphereHit(ro, rd, uBound);
  if (bs.y < 0.0) return -1.0;
  float t = max(bs.x, 0.0);
  for (int i = 0; i < 256; i++) {
    if (i >= uMaxSteps) break;
    float d = map(ro + rd * t);
    float ratio = d / t;
    if (ratio < minRatio) { minRatio = ratio; tClose = t; }
    if (d < 0.00035 * t) return t;
    t += d * 0.72; // < 1: the warp/displacement break the exact SDF bound
    if (t > bs.y) break;
  }
  return -1.0;
}

// Short secondary march for self-reflections.
float marchRefl(vec3 ro, vec3 rd) {
  float t = 0.03;
  for (int i = 0; i < 64; i++) {
    if (i >= uReflSteps) break;
    float d = map(ro + rd * t);
    if (d < 0.0015) return t;
    t += d * 0.8;
    if (t > 3.0) break;
  }
  return -1.0;
}

float cavity(vec3 p, vec3 n) {
  float occ = 0.0, w = 1.0;
  for (int i = 1; i <= 4; i++) {
    float h = 0.035 * float(i * i);
    occ += (h - map(p + n * h)) * w;
    w *= 0.6;
  }
  return clamp(1.0 - 1.6 * occ, 0.15, 1.0);
}

// ------------------------------------------------------------------ studio

float softbox(vec3 d, vec3 c, vec2 size, float soft) {
  float cd = dot(d, c);
  if (cd <= 0.0) return 0.0;
  vec3 up = abs(c.y) > 0.9 ? vec3(0.0, 0.0, 1.0) : vec3(0.0, 1.0, 0.0);
  vec3 right = normalize(cross(up, c));
  vec3 u = cross(c, right);
  vec3 pp = d / cd;
  vec2 uv = vec2(dot(pp, right), dot(pp, u));
  vec2 q = abs(uv) - size;
  float e = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
  float panel = 0.78 + 0.22 * (1.0 - clamp(length(uv / size) * 0.7, 0.0, 1.0));
  return (1.0 - smoothstep(-soft, soft, e)) * panel;
}

vec3 envMap(vec3 d) {
  float L = uLight;
  float R = mix(0.55, 1.0, clamp(L, 0.0, 1.0)); // rims stay on: thin highlights in the dark
  vec3 c = vec3(0.008, 0.009, 0.012);
  // Studio cyclorama: a soft bright horizon band and a gentle overhead gradient
  // give the chrome its silvery body between the hard light reflections.
  float horizon = smoothstep(-0.30, 0.02, d.y) * (1.0 - smoothstep(0.02, 0.55, d.y));
  c += vec3(0.20, 0.21, 0.25) * horizon * (0.25 + 0.75 * L);
  c += vec3(0.05, 0.05, 0.07) * smoothstep(0.0, 1.0, d.y) * L;
  c += vec3(0.04, 0.07, 0.16) * smoothstep(0.1, -0.9, d.y) * L; // cool floor bounce
  c += vec3(1.00, 0.97, 0.93) * 2.6 * L * softbox(d, normalize(vec3(-0.45, 0.75, 0.60)), vec2(0.75, 0.42), uRough * 6.0);
  c += vec3(0.78, 0.86, 1.00) * 1.3 * L * softbox(d, normalize(vec3(0.85, 0.05, 0.55)), vec2(0.10, 0.95), uRough * 4.0);
  c += vec3(0.55, 0.60, 0.70) * 0.9 * L * softbox(d, normalize(vec3(0.0, 0.25, -1.0)), vec2(1.1, 0.35), uRough * 8.0);
  c += vec3(0.35, 0.85, 1.00) * 1.8 * R * softbox(d, normalize(vec3(-1.0, 0.15, -0.55)), vec2(0.07, 1.10), uRough * 3.0);
  c += vec3(0.78, 0.40, 1.00) * 1.6 * R * softbox(d, normalize(vec3(1.0, 0.25, -0.65)), vec2(0.07, 1.10), uRough * 3.0);
  c += vec3(1.00, 0.84, 0.62) * 1.0 * L * softbox(d, normalize(vec3(0.05, 1.0, -0.25)), vec2(0.90, 0.06), uRough * 3.0);
  c += vec3(0.20, 0.32, 0.75) * 0.45 * L * softbox(d, normalize(vec3(0.0, -1.0, 0.2)), vec2(1.2, 1.2), 0.6);
  return c;
}

// Restrained oil-slick palette: cyan → electric blue → violet → magenta → champagne.
vec3 iriPalette(float x) {
  x = fract(x) * 5.0;
  vec3 c0 = vec3(0.30, 0.95, 1.00);
  vec3 c1 = vec3(0.15, 0.40, 1.00);
  vec3 c2 = vec3(0.58, 0.32, 1.00);
  vec3 c3 = vec3(1.00, 0.34, 0.82);
  vec3 c4 = vec3(1.00, 0.86, 0.62);
  float f = smoothstep(0.0, 1.0, fract(x));
  if (x < 1.0) return mix(c0, c1, f);
  if (x < 2.0) return mix(c1, c2, f);
  if (x < 3.0) return mix(c2, c3, f);
  if (x < 4.0) return mix(c3, c4, f);
  return mix(c4, c0, f);
}

vec3 metalFresnel(float cosT) {
  vec3 F0 = vec3(0.78, 0.80, 0.84);
  return F0 + (1.0 - F0) * pow(1.0 - clamp(cosT, 0.0, 1.0), 5.0);
}

vec3 iriTint(vec3 p, vec3 n, float NdV) {
  vec3 q = toObject(p);
  float x = 1.1 * (1.0 - NdV) + 0.18 * waves(q)
          + 0.22 * sin(dot(q, vec3(1.1, -0.7, 0.9)) * 1.3 + uPhase * TAU) + uPhase;
  float mask = uIri * (0.25 + 0.75 * smoothstep(0.0, 0.85, 1.0 - NdV));
  return mix(vec3(1.0), iriPalette(x) * 1.45, mask * 0.8);
}

vec3 shade(vec3 p, vec3 rd, bool bounce) {
  vec3 n = calcNormal(p);
  float NdV = clamp(dot(n, -rd), 0.0, 1.0);
  vec3 r = reflect(rd, n);
  vec3 tint = iriTint(p, n, NdV);
  vec3 F = metalFresnel(NdV);
  float occ = cavity(p, n);

  vec3 refl = envMap(r);
  if (bounce && uReflSteps > 0) {
    float tr = marchRefl(p + n * 0.01, r);
    if (tr > 0.0) {
      vec3 p2 = p + r * tr;
      vec3 n2 = calcNormal(p2);
      float c2 = dot(n2, -r);
      // Ignore grazing / back-facing hits (numerical self-intersections) and
      // fade the bounce in with facing ratio so reflection edges stay soft.
      float w = smoothstep(0.0, 0.35, c2);
      if (w > 0.0) {
        vec3 b = envMap(reflect(r, n2)) * metalFresnel(c2) * iriTint(p2, n2, c2) * 0.85;
        refl = mix(refl, b, w);
      }
    }
  }
  vec3 col = refl * F * tint * occ;
  col += tint * 0.010 * occ; // faint base so cavities never crush to pure black
  return col;
}

// ------------------------------------------------------------------ image

// Smooth, analytic ray-to-liquid distance for the halo (continuous across
// the bounding sphere, unlike the march).
float haloDist(vec3 ro, vec3 rd) {
  float d = 1e5;
  for (int i = 0; i < LOBES; i++) {
    vec4 A = uLobeA[i];
    if (A.w < 0.002) continue;
    vec3 m = uRot * (0.5 * (A.xyz + uLobeB[i].xyz));
    d = smin(d, length(cross(m - ro, rd)) - A.w, 0.5);
  }
  return d;
}

vec3 background(vec2 uvc, float minD) {
  float r = length(uvc);
  vec3 c = vec3(0.006, 0.0065, 0.008);
  c += vec3(0.010, 0.011, 0.016) * clamp(1.0 - r * 1.15, 0.0, 1.0); // soft studio falloff
  c += vec3(0.003, 0.003, 0.005) * smoothstep(-0.5, 0.5, uvc.y);
  vec3 glowCol = mix(vec3(0.25, 0.65, 1.0), vec3(0.70, 0.40, 1.0), clamp(uvc.x + 0.5, 0.0, 1.0));
  c += glowCol * uGlow * exp(-max(minD, 0.0) * 3.2) * (0.45 + 0.55 * uLight);
  return c;
}

vec3 aces(vec3 x) {
  return clamp(x * (2.51 * x + 0.03) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

vec3 toSRGB(vec3 c) {
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

struct Cam { vec3 ro, fw, rt, up; float focal; };

// One camera ray → tone-mapped (linear, display-referred) colour.
vec3 renderSample(Cam cam, vec2 fragPos, float pixAngle, out float hit) {
  vec2 uv = (fragPos - 0.5 * uResolution) / uResolution.y;
  vec3 rd = normalize(uv.x * cam.rt + uv.y * cam.up + cam.focal * cam.fw);
  float minRatio, tClose;
  float t = march(cam.ro, rd, minRatio, tClose);
  vec3 col = background(uv, haloDist(cam.ro, rd));
  hit = 0.0;
  if (t > 0.0) {
    col = shade(cam.ro + rd * t, rd, true);
    hit = 1.0;
  } else if (minRatio < pixAngle) {
    // Ray grazed the silhouette: blend by estimated pixel coverage.
    float cover = clamp(0.5 - minRatio / pixAngle, 0.0, 1.0);
    col = mix(col, shade(cam.ro + rd * tClose, rd, false), cover);
    hit = cover;
  }
  return aces(col * uExposure);
}

void main() {
  Cam cam;
  cam.ro = uCamPos;
  cam.fw = normalize(uCamTarget - cam.ro);
  cam.rt = normalize(cross(cam.fw, vec3(0.0, 1.0, 0.0)));
  cam.up = cross(cam.rt, cam.fw);
  cam.focal = 0.5 / tan(uFov * 0.5);
  float pixAngle = 1.0 / (uResolution.y * cam.focal);

  // uAA: 1 = one sample, 2 = adaptive (4 extra rotated-grid samples wherever
  // the 2x2 pixel quad shows contrast: silhouettes, highlight edges),
  // 3 = rotated-grid supersampling everywhere (reference quality).
  float hit;
  vec3 col = renderSample(cam, gl_FragCoord.xy, pixAngle, hit);
  float contrast = fwidth(dot(col, vec3(0.299, 0.587, 0.114))) + fwidth(hit);
  if (uAA >= 3 || (uAA == 2 && contrast > 0.008)) {
    const vec2 rg[4] = vec2[4](vec2(0.125, 0.375), vec2(-0.375, 0.125), vec2(-0.125, -0.375), vec2(0.375, -0.125));
    vec3 acc = col;
    for (int i = 0; i < 4; i++) {
      float h;
      acc += renderSample(cam, gl_FragCoord.xy + rg[i], pixAngle * 0.5, h);
    }
    col = acc / 5.0;
  }

  vec2 uvn = gl_FragCoord.xy / uResolution - 0.5;
  col *= 1.0 - uVignette * dot(uvn, uvn) * 1.6;
  col = toSRGB(col);
  col += (hash12(gl_FragCoord.xy) - 0.5) * (uDither / 255.0); // static, flicker-free
  fragColor = vec4(col, 1.0);
}
`;
