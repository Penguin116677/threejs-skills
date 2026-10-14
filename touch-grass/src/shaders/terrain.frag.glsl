uniform vec3 uColor;
uniform vec3 uTipColor;
uniform vec3 uLightDir;
uniform vec3 uLightColor;
uniform vec3 uAmbient;

varying vec3 vWorld;
varying vec3 vNormal;

void main() {
  vec3 n = normalize(vNormal);
  // Mottled ground so the soil under the blades never reads as a flat fill.
  float m = fbm2(vWorld.xz * 0.35);
  vec3 base = mix(uColor * 0.7, mix(uColor, uTipColor, 0.35), m);
  float wrap = clamp(dot(n, uLightDir) * 0.5 + 0.5, 0.0, 1.0);
  vec3 col = base * (uAmbient * 0.55 + uLightColor * wrap * 0.55);
  col = applyFog(col, vWorld);
  gl_FragColor = vec4(col, 1.0);
}
