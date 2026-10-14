uniform vec3 uBark;
uniform vec3 uLightDir;
uniform vec3 uLightColor;
uniform vec3 uAmbient;
uniform vec3 uRim;
uniform float uRimAmt;

varying vec3 vWorld;
varying vec3 vNormal;
varying float vAo;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(cameraPosition - vWorld);
  float streak = vnoise(vec2(atan(N.z, N.x) * 6.0, vWorld.y * 1.5));
  vec3 albedo = uBark * (0.75 + 0.45 * streak);
  float wrap = clamp(dot(N, uLightDir) * 0.5 + 0.5, 0.0, 1.0);
  vec3 col = albedo * (uAmbient * 0.5 + uLightColor * wrap * 0.45) * vAo;
  col += uRim * pow(1.0 - max(dot(N, V), 0.0), 3.0) * uRimAmt * 0.25;
  col = applyFog(col, vWorld);
  gl_FragColor = vec4(col, 1.0);
}
