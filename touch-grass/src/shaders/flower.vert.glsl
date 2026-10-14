attribute vec3 aOffset;
attribute vec4 aParams; // stem height, head size, color index, appear threshold
attribute float aPart;  // 0 = stem, 1 = head

uniform float uAmount;

varying vec2 vUv;
varying float vPart;
varying float vColor;
varying float vT;
varying vec3 vWorld;

void main() {
  float h = aParams.x;
  float size = aParams.y;
  float threshold = aParams.w;
  // Flowers open one by one as dusk arrives.
  float open = smoothstep(threshold, threshold + 0.12, uAmount);

  float rnd = fract(threshold * 91.7 + aOffset.x);
  vec2 rest = vec2(cos(rnd * 6.28), sin(rnd * 6.28)) * 0.1;
  vec4 lean = leanAt(aOffset.xz, rnd, rest);

  float hh = h * mix(0.3, 1.0, open);
  vec3 tangent;
  vec3 world;
  if (aPart < 0.5) {
    float t = position.y;
    vec3 arc = bendArc(t, hh, lean.z * 0.85, lean.xy, tangent);
    // Stems are thin camera-facing ribbons.
    vec3 toCam = normalize(cameraPosition - aOffset);
    vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), toCam));
    world = aOffset + arc + right * position.x * 0.012 * (1.0 - t * 0.5) * open;
    vT = t;
  } else {
    vec3 arc = bendArc(1.0, hh, lean.z * 0.85, lean.xy, tangent);
    vec3 head = aOffset + arc;
    // Billboard the head toward the camera.
    vec3 camRight = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
    vec3 camUp = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
    float s = size * open;
    world = head + (camRight * position.x + camUp * (position.y - 1.0)) * s;
    vT = 1.0;
  }

  vUv = position.xy;
  vPart = aPart;
  vColor = aParams.z;
  vWorld = world;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
