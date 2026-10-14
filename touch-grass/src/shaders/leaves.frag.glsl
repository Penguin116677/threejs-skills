varying vec2 vUv;
varying float vRand;

void main() {
  // Irregular leaf clump silhouette.
  vec2 p = vUv - 0.5;
  float n = vnoise(vUv * 5.0 + vRand * 37.0);
  float d = length(p * vec2(1.0, 1.25)) + (n - 0.5) * 0.32;
  float alpha = smoothstep(0.42, 0.34, d);
  if (alpha < 0.02) discard;
  vec3 N = normalize(vNormal);
  vec3 col = shadeLeaves(N, vWorld, vAo * (0.8 + 0.35 * n), vRand);
  // Each clump is a touch brighter on top and darker toward its edge.
  col *= (0.78 + 0.32 * vUv.y) * (1.05 - smoothstep(0.1, 0.42, d) * 0.3);
  col = applyFog(col, vWorld);
  gl_FragColor = vec4(col, alpha);
}
