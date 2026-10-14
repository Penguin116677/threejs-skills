// Wind + bending shared by grass blades and flower stems.
uniform float uTime;
uniform float uWind;
uniform sampler2D uTrail;
uniform vec4 uTrailBounds; // minX, minZ, sizeX, sizeZ

const vec2 WIND_DIR = vec2(0.94, 0.34);

// Returns the lean vector (xz) at a root position. Length ~ bend amount.
vec2 windAt(vec2 xz, float rnd) {
  float rolling = vnoise(xz * 0.075 - WIND_DIR * uTime * 0.55);
  float gust = 0.5 + 0.5 * sin(dot(xz, WIND_DIR) * 0.22 - uTime * 1.25);
  float amount = uWind * (0.25 + 1.05 * rolling * (0.45 + 0.55 * gust));
  float flutter = 0.07 * sin(uTime * (2.4 + rnd * 1.6) + rnd * 40.0 + xz.x * 0.7);
  vec2 perp = vec2(-WIND_DIR.y, WIND_DIR.x);
  return WIND_DIR * amount + perp * flutter + WIND_DIR * flutter * 0.5;
}

// xyz = push direction (xz in .xy) and strength (.z) from the cursor trail.
vec3 trailAt(vec2 xz) {
  vec2 uv = (xz - uTrailBounds.xy) / uTrailBounds.zw;
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return vec3(0.0);
  vec4 t = texture2D(uTrail, uv);
  return vec3(t.rg, t.b);
}

// Constant-length arc: a blade of height h, bent by `curve` radians at the tip
// toward dir. Returns the offset of the point at parameter t (0 root, 1 tip).
vec3 bendArc(float t, float h, float curve, vec2 dir, out vec3 tangent) {
  float a = curve * t;
  float horiz;
  float vert;
  if (curve < 1e-3) {
    horiz = 0.0;
    vert = t * h;
  } else {
    horiz = h * (1.0 - cos(a)) / curve;
    vert = h * sin(a) / curve;
  }
  tangent = normalize(vec3(dir.x * sin(a), cos(a), dir.y * sin(a)));
  return vec3(dir.x * horiz, vert, dir.y * horiz);
}

// Combined lean for a root: wind plus cursor push. Returns dir in xy, curve in z, trail in w.
vec4 leanAt(vec2 xz, float rnd, vec2 restLean) {
  vec2 lean = restLean + windAt(xz, rnd);
  vec3 tr = trailAt(xz);
  float push = clamp(tr.z, 0.0, 1.0);
  vec2 pdir = length(tr.xy) > 1e-3 ? normalize(tr.xy) : lean;
  lean = mix(lean, pdir * 1.55, smoothstep(0.0, 0.85, push));
  float curve = min(length(lean), 1.6);
  vec2 dir = curve > 1e-4 ? lean / length(lean) : vec2(1.0, 0.0);
  return vec4(dir, curve, push);
}
