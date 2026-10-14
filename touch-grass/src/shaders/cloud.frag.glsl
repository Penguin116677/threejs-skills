uniform sampler2D uMap;
uniform float uFlip;
uniform vec3 uLit;
uniform vec3 uShade;
uniform float uOpacity;
uniform float uSunVis;
uniform vec3 uMoonDir;
uniform float uMoonVis;

varying vec2 vUv;
varying vec3 vWorld;

void main() {
  vec2 uv = vec2(mix(vUv.x, 1.0 - vUv.x, uFlip), vUv.y);
  vec4 s = texture2D(uMap, uv);
  float density = s.r;
  float alpha = smoothstep(0.03, 0.55, density) * uOpacity;
  if (alpha < 0.003) discard;

  vec3 col = mix(uShade, uLit, s.g);
  vec3 view = normalize(vWorld - cameraPosition);
  // Silver lining toward the sun / moon on the thin edges.
  float edge = 1.0 - smoothstep(0.05, 0.5, density);
  float toSun = pow(max(dot(view, uSunDir), 0.0), 4.0) * uSunVis;
  float toMoon = pow(max(dot(view, uMoonDir), 0.0), 60.0) * uMoonVis;
  col += uGlowColor * (toSun * (0.35 + edge * 0.8));
  col += vec3(0.7, 0.8, 1.0) * toMoon * (0.15 + edge * 0.5);

  // Clouds near the horizon sink into the haze.
  float low = smoothstep(0.22, 0.0, view.y);
  col = mix(col, uFogColor, low * 0.55);

  gl_FragColor = vec4(col, alpha);
}
