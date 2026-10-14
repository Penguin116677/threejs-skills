varying float vGlow;

void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float core = smoothstep(0.35, 0.0, d);
  float halo = pow(max(1.0 - d, 0.0), 2.5) * 0.35;
  vec3 col = vec3(0.78, 1.0, 0.32) * (core * 3.2 + halo) * vGlow;
  gl_FragColor = vec4(col, 1.0);
}
