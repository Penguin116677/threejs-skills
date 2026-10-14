uniform sampler2D uPrev;
uniform vec4 uBounds;   // minX, minZ, sizeX, sizeZ
uniform vec2 uFrom;     // previous cursor xz
uniform vec2 uTo;       // current cursor xz
uniform float uRadius;
uniform float uActive;
uniform float uDecay;

varying vec2 vUv;

void main() {
  vec4 prev = texture2D(uPrev, vUv);
  prev.rgb *= uDecay;

  vec2 p = uBounds.xy + vUv * uBounds.zw;

  // Distance to the segment the cursor swept this frame.
  vec2 seg = uTo - uFrom;
  float h = clamp(dot(p - uFrom, seg) / max(dot(seg, seg), 1e-5), 0.0, 1.0);
  vec2 closest = uFrom + seg * h;
  vec2 away = p - closest;
  float d = length(away);
  float s = smoothstep(uRadius, uRadius * 0.15, d) * uActive;

  // Push away from the brush, with a bias along the direction of travel.
  vec2 dir = away / max(d, 1e-4);
  float speed = length(seg);
  if (speed > 1e-4) dir = normalize(dir + seg / speed * 0.6);

  prev.rg = mix(prev.rg, dir, s);
  prev.b += (1.0 - prev.b) * s;
  gl_FragColor = prev;
}
