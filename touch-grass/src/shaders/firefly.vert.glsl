attribute float aSeed;

uniform float uTime;
uniform float uPixelRatio;
uniform float uAmount;
uniform float uScale;

varying float vGlow;

void main() {
  vec4 mv = viewMatrix * modelMatrix * vec4(position, 1.0);
  // Slow breathing with an occasional bright flash.
  float phase = uTime * (0.6 + aSeed * 0.9) + aSeed * 40.0;
  float breathe = pow(0.5 + 0.5 * sin(phase), 2.5);
  float flash = pow(max(sin(phase * 0.37 + aSeed * 9.0), 0.0), 24.0);
  // Each firefly wakes at a slightly different moment of dusk.
  float awake = smoothstep(aSeed * 0.6, aSeed * 0.6 + 0.3, uAmount);
  vGlow = (0.12 + breathe * 0.9 + flash * 1.4) * awake;
  gl_PointSize = uScale * uPixelRatio * (0.7 + aSeed * 0.6) / -mv.z * (0.75 + 0.25 * breathe);
  gl_Position = projectionMatrix * mv;
}
