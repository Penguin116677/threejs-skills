// Fine orbital paths: hair-thin tori with a travelling light "comet".
import { holoMaterial } from './shaders/common.js';
import { ORBIT_LAYOUT } from './timeline.js';

const ORBIT_VS = /* glsl */ `
  varying vec3 vWorldPos;
  varying float vAngle;
  void main() {
    vAngle = uv.x;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;

const ORBIT_FS = /* glsl */ `
  uniform float uRadius;
  uniform float uHead;
  uniform float uSweep;
  uniform float uStart;
  uniform vec3 uTint;
  uniform float uDir;
  varying vec3 vWorldPos;
  varying float vAngle;
  void main() {
    float a = fract(vAngle - uStart);
    float behind = fract((uHead - vAngle) * uDir);
    float comet = exp(-behind * 9.0);
    float pr = pulseAt(uRadius);
    vec3 col = uTint * (0.075 + 0.55 * comet) * (1.0 + 3.0 * pr);
    float vis = 1.0 - smoothstep(uSweep - 0.02, uSweep, a);
    col *= vis * uLight * glassTransmit(vWorldPos);
    gl_FragColor = vec4(col, 1.0);
  }`;

export function createOrbits(THREE, shared, cfg) {
  const group = new THREE.Group();
  const deg = Math.PI / 180;
  const orbits = ORBIT_LAYOUT.map((def, i) => {
    const tint = i === 3 ? shared.uViolet.value : i % 2 ? shared.uIce.value : shared.uCyan.value;
    const uniforms = {
      uRadius: { value: def.r },
      uHead: { value: 0 },
      uSweep: { value: 1 },
      uStart: { value: def.phase },
      uTint: { value: tint },
      uDir: { value: Math.sign(def.turns) },
    };
    const mesh = new THREE.Mesh(
      new THREE.TorusGeometry(def.r, 0.0026, 6, 720),
      holoMaterial(THREE, shared, { uniforms, vertexShader: ORBIT_VS, fragmentShader: ORBIT_FS }),
    );
    mesh.rotation.set(def.tilt[0] * deg, def.tilt[1] * deg, def.tilt[2] * deg);
    mesh.frustumCulled = false;
    group.add(mesh);
    return { def, uniforms, mesh };
  });
  return {
    group,
    orbits,
    update(state) {
      orbits.forEach((o, i) => {
        const h = o.def.turns * cfg.particleSpeed * state.u + o.def.phase;
        o.uniforms.uHead.value = h - Math.floor(h);
        o.uniforms.uSweep.value = state.build.orbits[i];
      });
    },
  };
}
