attribute vec3 aOffset;
attribute vec4 aParams; // height, width, yaw, random

varying float vT;
varying float vX;
varying float vRand;
varying float vTrail;
varying float vDist;
varying vec3 vWorld;
varying vec3 vNormal;

void main() {
  float t = position.y;
  float h = aParams.x;
  float w = aParams.y;
  float yaw = aParams.z;
  float rnd = aParams.w;

  vec2 face = vec2(cos(yaw), sin(yaw));
  vec2 side = vec2(-face.y, face.x);

  // Each blade has a gentle resting lean of its own.
  vec2 rest = face * (0.12 + 0.28 * fract(rnd * 7.13));
  vec4 lean = leanAt(aOffset.xz, rnd, rest);

  vec3 tangent;
  vec3 arc = bendArc(t, h, lean.z, lean.xy, tangent);

  float taper = 1.0 - pow(t, 1.6);
  vec3 side3 = vec3(side.x, 0.0, side.y);
  vec3 world = aOffset + arc + side3 * position.x * w * taper;

  vec3 n = normalize(cross(side3, tangent));
  n = normalize(n + side3 * position.x * 1.4); // rounded across the width

  vT = t;
  vX = position.x;
  vRand = rnd;
  vTrail = lean.w;
  vWorld = world;
  vNormal = n;
  vDist = length(world - cameraPosition);

  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
