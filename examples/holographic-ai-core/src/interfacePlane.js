// A single translucent "lens" interface: fine concentric circles, a calibrated
// tick band and a few slowly turning arc segments. Deliberately faint; it gives
// the core a sense of scale and orientation without becoming a HUD.
import { holoMaterial } from './shaders/common.js';

const VS = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec2 vLocal;
  void main() {
    vLocal = position.xy;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;

const FS = /* glsl */ `
  uniform float uBuild;
  varying vec3 vWorldPos;
  varying vec2 vLocal;
  float aaLine(float x, float center, float halfWidth) {
    float fw = fwidth(x);
    return 1.0 - smoothstep(halfWidth, halfWidth + fw * 1.2, abs(x - center));
  }
  void main() {
    float r = length(vLocal);
    float a = atan(vLocal.y, vLocal.x) / TAU + 0.5;   // 0..1
    float c = 0.0;
    c += aaLine(r, 2.62, 0.0015) * 0.8;
    c += aaLine(r, 2.645, 0.0008) * 0.5;
    c += aaLine(r, 2.98, 0.0012) * 0.55;

    // tick band: 180 minor / 36 major
    float ta = a * 180.0;
    float fw = fwidth(ta);
    float tick = 1.0 - smoothstep(0.05, 0.05 + fw * 1.4, abs(fract(ta + 0.5) - 0.5));
    float major = 1.0 - step(0.5, mod(floor(ta + 0.5), 5.0));
    float inner = mix(2.87, 2.81, major);
    tick *= step(inner, r) * step(r, 2.94);
    tick *= 1.0 - smoothstep(0.3, 0.55, fw);
    c += tick * 0.45;

    // arc segments turning one full turn per loop
    float sa = fract(a - uPhase);
    float seg = step(0.04, sa) * step(sa, 0.19) + step(0.41, sa) * step(sa, 0.47) + step(0.66, sa) * step(sa, 0.88);
    float fr = fwidth(r);
    float band = (1.0 - smoothstep(0.012, 0.012 + fr * 1.2, abs(r - 2.72)));
    c += seg * band * 0.32;

    float pr = pulseAt(r);
    vec3 col = mix(uIce, uCyan, 0.5) * c * (0.11 + 0.6 * pr) * uBuild * uLight;
    col *= glassTransmit(vWorldPos);
    gl_FragColor = vec4(col, 1.0);
  }`;

export function createInterfacePlane(THREE, shared) {
  const uniforms = { uBuild: { value: 1 } };
  const mesh = new THREE.Mesh(
    new THREE.RingGeometry(2.55, 3.05, 512, 1),
    holoMaterial(THREE, shared, { uniforms, vertexShader: VS, fragmentShader: FS, side: THREE.DoubleSide }),
  );
  // Nearly horizontal, slightly below the equator: reads as a grounded ellipse.
  mesh.rotation.set(-Math.PI / 2 + 0.16, 0, 0.06);
  mesh.position.y = -0.18;
  mesh.scale.setScalar(0.9);
  mesh.frustumCulled = false;
  return {
    mesh,
    update(state) {
      uniforms.uBuild.value = state.build.interface;
    },
  };
}
