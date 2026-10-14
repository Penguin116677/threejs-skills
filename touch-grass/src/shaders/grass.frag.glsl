uniform vec3 uBase;
uniform vec3 uTip;
uniform vec3 uDry;
uniform vec3 uTerrain;
uniform vec3 uTrailGlow;
uniform float uTrailGlowAmt;
uniform vec3 uLightDir;
uniform vec3 uLightColor;
uniform vec3 uAmbient;
uniform vec3 uGround;

varying float vT;
varying float vX;
varying float vRand;
varying float vTrail;
varying float vDist;
varying vec3 vWorld;
varying vec3 vNormal;

void main() {
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 N = normalize(vNormal);
  if (dot(N, V) < 0.0) N = -N;
  N = normalize(mix(N, vec3(0.0, 1.0, 0.0), 0.45));

  // Color: dark root → bright tip, with dry patches and per-blade variation.
  float patchy = vnoise(vWorld.xz * 0.16 + 3.0);
  float dry = smoothstep(0.58, 0.9, patchy) * 0.7 + vRand * 0.18;
  vec3 tip = mix(uTip, uDry, clamp(dry, 0.0, 1.0));
  tip *= 0.82 + 0.36 * fract(vRand * 13.7);
  vec3 col = mix(uBase, tip, pow(vT, 1.15));

  // Distant blades settle toward the ground tone to keep the far field calm.
  float far = smoothstep(18.0, 46.0, vDist);
  col = mix(col, mix(uTerrain, tip, 0.45), far * 0.5);

  // Root occlusion.
  float ao = mix(0.32, 1.0, smoothstep(0.0, 0.7, vT));

  // Soft wrap lighting + hemisphere ambient + backlit translucency.
  float wrap = clamp(dot(N, uLightDir) * 0.5 + 0.5, 0.0, 1.0);
  vec3 hemi = mix(uGround, uAmbient, N.y * 0.5 + 0.5);
  float back = pow(clamp(dot(-V, uLightDir), 0.0, 1.0), 3.0) * vT;
  vec3 lit = col * (hemi * 0.6 + uLightColor * wrap * 0.55) * ao;
  lit += uLightColor * tip * back * 0.35;

  // Subtle sheen down the blade's spine.
  lit *= 0.9 + 0.2 * (1.0 - abs(vX) * 2.0);

  // Brushed grass lifts a little, and glows softly at night.
  lit *= 1.0 + vTrail * 0.25;
  lit += uTrailGlow * uTrailGlowAmt * vTrail * smoothstep(0.15, 1.0, vT);

  lit = applyFog(lit, vWorld);
  gl_FragColor = vec4(lit, 1.0);
}
