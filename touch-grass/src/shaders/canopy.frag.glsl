void main() {
  // The shell is the deep interior seen between leaf clumps: keep it dim.
  vec3 col = shadeLeaves(normalize(vNormal), vWorld, vAo * 0.55, 0.0) * 0.55;
  col = applyFog(col, vWorld);
  gl_FragColor = vec4(col, 1.0);
}
