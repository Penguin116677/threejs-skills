attribute vec3 aPos;
attribute vec3 aNormal;
attribute vec3 aParams; // size, rotation, ao

uniform float uTime;
uniform float uWind;

varying vec2 vUv;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vAo;
varying float vRand;

void main() {
  vec3 base = aPos;
  float k = smoothstep(3.5, 9.0, base.y);
  base.x += sin(uTime * 0.7 + base.y * 0.4) * 0.07 * k * (0.4 + uWind);
  base.z += cos(uTime * 0.55 + base.x * 0.3) * 0.04 * k;
  // Small flutter per card.
  base += aNormal * sin(uTime * 2.0 + aParams.y * 10.0) * 0.03;

  vec4 world = modelMatrix * vec4(base, 1.0);
  vec3 camRight = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 camUp = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  float c = cos(aParams.y);
  float s = sin(aParams.y);
  vec2 q = mat2(c, -s, s, c) * position.xy;
  world.xyz += (camRight * q.x + camUp * q.y) * aParams.x;

  vUv = position.xy + 0.5;
  vWorld = world.xyz;
  vNormal = normalize(mat3(modelMatrix) * aNormal);
  vAo = aParams.z;
  vRand = fract(aParams.y * 3.7);
  gl_Position = projectionMatrix * viewMatrix * world;
}
