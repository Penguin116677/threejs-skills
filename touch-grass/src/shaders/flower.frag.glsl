uniform vec3 uStem;
uniform vec3 uLightColor;
uniform vec3 uAmbient;
uniform float uGlow;

varying vec2 vUv;
varying float vPart;
varying float vColor;
varying float vT;
varying vec3 vWorld;

void main() {
  vec3 col;
  float alpha = 1.0;
  if (vPart < 0.5) {
    col = uStem * mix(0.4, 1.0, vT) * (uAmbient * 0.6 + uLightColor * 0.3);
  } else {
    vec2 p = vec2(vUv.x, vUv.y - 1.0);
    float r = length(p) * 2.0;
    float a = atan(p.y, p.x);
    float petals = vColor < 1.5 ? 5.0 : 6.0;
    float edge = 0.62 + 0.38 * abs(cos(a * petals * 0.5));
    float aa = 0.08;
    float mask = smoothstep(edge, edge - aa, r);
    if (mask < 0.01) discard;
    alpha = mask;

    vec3 petal = vColor < 0.5 ? vec3(1.0, 0.97, 0.92)
               : vColor < 1.5 ? vec3(1.0, 0.82, 0.22)
               : vec3(1.0, 0.52, 0.16);
    vec3 center = vec3(1.0, 0.68, 0.12);
    col = mix(center, petal, smoothstep(0.22, 0.32, r));
    col *= 0.75 + 0.25 * (1.0 - r);
    // Lit by the remaining sky, with a faint self-glow so they read at night.
    col = col * (uAmbient * 0.5 + uLightColor * 0.3) + col * uGlow;
  }
  col = applyFog(col, vWorld);
  gl_FragColor = vec4(col, alpha);
}
