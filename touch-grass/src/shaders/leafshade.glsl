// Shared leaf lighting for the canopy shell and the leaf cards.
uniform vec3 uLeaf;
uniform vec3 uLeafShade;
uniform vec3 uLightDir;
uniform vec3 uLightColor;
uniform vec3 uAmbient;
uniform vec3 uGround;
uniform vec3 uRim;
uniform float uRimAmt;

varying vec3 vWorld;
varying vec3 vNormal;
varying float vAo;

vec3 shadeLeaves(vec3 N, vec3 worldPos, float ao, float variation) {
  vec3 V = normalize(cameraPosition - worldPos);
  // Leafy clumps: low-frequency lumps plus fine speckle.
  float clump = vnoise3(worldPos * 1.7);
  float fine = vnoise3(worldPos * 6.5);
  float wrap = clamp(dot(N, uLightDir) * 0.5 + 0.5, 0.0, 1.0);
  wrap = pow(wrap, 1.4) * (0.7 + 0.5 * clump);
  float occl = ao * (0.75 + 0.25 * fine);

  vec3 albedo = mix(uLeafShade, uLeaf, clamp(wrap * occl * 1.25, 0.0, 1.0));
  albedo *= 0.9 + 0.2 * variation;
  vec3 hemi = mix(uGround, uAmbient, N.y * 0.5 + 0.5);
  vec3 col = albedo * (hemi * 0.55 * occl + uLightColor * wrap * occl * 0.5);

  // Rim of sky light around the silhouette (strong at dusk).
  float rim = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.0);
  float facing = 0.5 + 0.5 * dot(normalize(vec3(uLightDir.x, 0.0, uLightDir.z) + 1e-4), normalize(vec3(N.x, 0.0, N.z) + 1e-4));
  col += uRim * rim * uRimAmt * (0.25 + 0.75 * facing) * (0.6 + 0.4 * clump) * 0.6;
  return col;
}
