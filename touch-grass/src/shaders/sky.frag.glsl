uniform vec3 uZenith;
uniform vec3 uMid;
uniform vec3 uHorizon;
uniform vec3 uSunColor;
uniform vec3 uMoonDir;
uniform float uSunVis;
uniform float uMoonVis;

varying vec3 vDir;

void main() {
  vec3 d = normalize(vDir);
  float y = d.y;
  float h = clamp(y, 0.0, 1.0);

  // Three-stop gradient, with a soft band where mid meets horizon.
  vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.28, pow(h, 0.8)));
  col = mix(col, uZenith, smoothstep(0.18, 0.9, h));
  // Below the horizon fade into the haze.
  col = mix(col, uFogColor, smoothstep(0.0, -0.12, y));

  // Sun: wide warm bloom, a horizon band around its azimuth, and the disc.
  float sd = max(dot(d, uSunDir), 0.0);
  float az = max(dot(normalize(d.xz + 1e-5), normalize(uSunDir.xz + 1e-5)), 0.0);
  float band = exp(-abs(y - max(uSunDir.y, -0.05)) * 7.0) * pow(az, 3.0);
  col += uGlowColor * (pow(sd, 5.0) * 0.45 + pow(sd, 60.0) * 0.6 + band * 0.35) * uSunVis;
  float disc = smoothstep(0.99955, 0.99975, sd);
  col += uSunColor * disc * 14.0 * uSunVis * smoothstep(-0.03, 0.02, y);

  // Moon: lit disc with faint maria, halo, and a broad glow.
  float md = dot(d, uMoonDir);
  float ang = acos(clamp(md, -1.0, 1.0));
  float R = 0.034;
  float moonMask = smoothstep(R, R - 0.0015, ang);
  vec3 up = vec3(0.0, 1.0, 0.0);
  vec3 tx = normalize(cross(up, uMoonDir));
  vec3 ty = cross(uMoonDir, tx);
  vec2 mp = vec2(dot(d, tx), dot(d, ty)) / R;
  float maria = fbm2(mp * 2.2 + 4.0);
  float limb = sqrt(max(1.0 - dot(mp, mp), 0.0));
  vec3 moonCol = vec3(1.0, 0.98, 0.93) * (0.75 + 0.25 * limb) * (0.82 + 0.3 * smoothstep(0.35, 0.65, maria));
  float halo = pow(max(md, 0.0), 1600.0) * 0.5 + pow(max(md, 0.0), 120.0) * 0.12 + pow(max(md, 0.0), 10.0) * 0.05;
  col = mix(col, moonCol * 1.9, moonMask * uMoonVis);
  col += vec3(0.65, 0.75, 1.0) * halo * uMoonVis * (1.0 - moonMask);

  // Dither to keep the long gradients free of banding.
  col += (hash12(gl_FragCoord.xy) - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0);
}
