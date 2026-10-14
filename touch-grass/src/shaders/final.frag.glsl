// Runs after OutputPass (display space): vignette + a whisper of film grain.
uniform sampler2D tDiffuse;
uniform float uTime;
uniform float uVignette;
uniform float uGrain;
uniform vec2 uResolution;

varying vec2 vUv;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vec4 col = texture2D(tDiffuse, vUv);
  vec2 c = (vUv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
  float v = smoothstep(1.15, 0.35, length(c));
  col.rgb *= mix(1.0, v, uVignette);
  float g = hash(vUv * uResolution + fract(uTime * 7.31) * 517.0) - 0.5;
  // Grain is strongest in the mid-tones, gentle in shadows and highlights.
  float lum = dot(col.rgb, vec3(0.299, 0.587, 0.114));
  col.rgb += g * uGrain * (0.4 + 0.6 * (1.0 - abs(lum - 0.5) * 2.0));
  // Alpha-to-coverage edges leave alpha < 1 in the buffer; the canvas must stay opaque.
  gl_FragColor = vec4(col.rgb, 1.0);
}
