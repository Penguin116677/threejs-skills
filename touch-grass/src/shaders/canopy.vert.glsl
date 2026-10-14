attribute float aAo;

uniform float uTime;
uniform float uWind;

varying vec3 vWorld;
varying vec3 vNormal;
varying float vAo;

void main() {
  vec3 p = position;
  // Slow breathing sway, stronger toward the crown.
  float k = smoothstep(3.5, 9.0, p.y);
  p.x += sin(uTime * 0.7 + p.y * 0.4) * 0.07 * k * (0.4 + uWind);
  p.z += cos(uTime * 0.55 + p.x * 0.3) * 0.04 * k;
  vec4 world = modelMatrix * vec4(p, 1.0);
  vWorld = world.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vAo = aAo;
  gl_Position = projectionMatrix * viewMatrix * world;
}
