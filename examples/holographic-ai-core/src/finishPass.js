// Final pass: exposure, ACES filmic tone mapping, sRGB encode and a static
// triangular dither (breaks up 8-bit banding in the dark navy gradients
// without adding temporal noise that would shimmer or bloat the encode).
export function createFinishShader() {
  return {
    uniforms: { tDiffuse: { value: null }, uExposure: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse;
      uniform float uExposure;
      varying vec2 vUv;
      // ACES fitted (Stephen Hill)
      vec3 RRTAndODTFit(vec3 v) {
        vec3 a = v * (v + 0.0245786) - 0.000090537;
        vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
        return a / b;
      }
      vec3 aces(vec3 color) {
        const mat3 inM = mat3(0.59719, 0.07600, 0.02840, 0.35458, 0.90834, 0.13383, 0.04823, 0.01566, 0.83777);
        const mat3 outM = mat3(1.60475, -0.10208, -0.00327, -0.53108, 1.10813, -0.07276, -0.07367, -0.00605, 1.07602);
        color = inM * color;
        color = RRTAndODTFit(color);
        color = outM * color;
        return clamp(color, 0.0, 1.0);
      }
      vec3 toSRGB(vec3 c) {
        return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
      }
      float hash12(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * 0.1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
      }
      void main() {
        vec3 c = texture2D(tDiffuse, vUv).rgb * uExposure;
        c = toSRGB(aces(c));
        float n = hash12(gl_FragCoord.xy) + hash12(gl_FragCoord.xy + 71.3) - 1.0;
        c += n / 255.0;
        gl_FragColor = vec4(c, 1.0);
      }`,
  };
}
