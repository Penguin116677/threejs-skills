// Background: dark navy → black gradient, faint glow behind the hero, vignette, dither.
// Drawn as a fullscreen triangle in clip space (ignores the camera).
import { commonGLSL } from './noise.glsl.js';

export const backgroundVertexShader = /* glsl */ `
void main() {
  gl_Position = vec4(position.xy, 1.0, 1.0);
}
`;

export const backgroundFragmentShader = /* glsl */ `
${commonGLSL}
uniform vec2  uResolution;  // drawing-buffer size in pixels
uniform float uFrameSeed;
uniform vec2  uGlowPos;     // 0..1 screen position of the glow (periodic drift)
uniform float uGlowAmt;
uniform vec3  uTop;         // sRGB
uniform vec3  uBottom;      // sRGB
uniform vec3  uGlow;        // sRGB

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  float aspect = uResolution.x / uResolution.y;
  float g = smoothstep(-0.15, 1.05, uv.y * 0.8 + (1.0 - uv.x) * 0.25);
  vec3 col = mix(uBottom, uTop, g);

  vec2 gp = uv - uGlowPos;
  gp.x *= aspect;
  col += uGlow * exp(-dot(gp, gp) * 3.2) * uGlowAmt;

  vec2 p = uv - 0.5;
  p.x *= aspect;
  float vig = 1.0 - smoothstep(0.45, 1.3, length(p * vec2(0.8, 1.0)));
  col *= mix(0.55, 1.0, vig);

  gl_FragColor = vec4(col + dither8(gl_FragCoord.xy, uFrameSeed), 1.0);
}
`;
