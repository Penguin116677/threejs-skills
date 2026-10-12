// The centrepiece: an optical-glass sphere with a luminous geometric nucleus.
//   - glass shell (inner + outer surfaces): Fresnel, thin-film iridescence,
//     softbox reflections, latitude graticule, scan waves, materialise sweep
//   - nucleus: icosahedron + its dual dodecahedron as instanced light tubes,
//     vertex nodes, a hot centre and camera-facing halos
import { holoMaterial } from './shaders/common.js';

const SHELL_VS = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec3 vNormalW;
  varying vec3 vLocal;
  void main() {
    vLocal = position;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;

const SHELL_FS = /* glsl */ `
  uniform float uFace;      // +1 outer surface, -1 inner surface
  uniform float uMat;       // materialise progress 0..1
  uniform float uScanFront;
  uniform float uScanAmp;
  uniform vec3 uScanAxis;
  uniform float uCharge;
  varying vec3 vWorldPos;
  varying vec3 vNormalW;
  varying vec3 vLocal;
  void main() {
    vec3 N = normalize(vNormalW) * uFace;
    vec3 V = normalize(cameraPosition - vWorldPos);
    float ndv = clamp(dot(N, V), 0.0, 1.0);
    float fres = pow(1.0 - ndv, 3.0);
    vec3 R = reflect(-V, N);

    // Film thickness flows slowly over the surface (integer periods per loop).
    vec3 lp = vLocal / uSphereR;
    float flow = 0.5 * sin(dot(lp, vec3(1.7, 2.3, -1.1)) + TAU * uPhase)
               + 0.25 * sin(dot(lp, vec3(-2.9, 0.7, 2.1)) - 2.0 * TAU * uPhase + 1.3);
    vec3 film = thinFilm(ndv, 0.62 + 0.32 * flow);

    vec3 col = film * fres * 0.5;
    col += uCyan * pow(1.0 - ndv, 6.0) * 0.55;            // crisp rim
    col += envReflect(R) * (0.035 + 0.965 * fres) * 0.85;  // Fresnel-weighted reflections
    col += uIce * 0.003;                                   // faint body tint

    // Latitude graticule (15 deg), anti-aliased, fades toward the rim.
    float lat = asin(clamp(lp.y, -1.0, 1.0)) / (TAU / 24.0);
    float dl = abs(fract(lat + 0.5) - 0.5);
    float line = 1.0 - smoothstep(0.0, fwidth(lat) * 1.2, dl);
    col += uIce * line * 0.02 * (0.3 + 0.7 * ndv);

    // Scan wave: a fine bright front with a decaying raster trail above it.
    float s = dot(lp, uScanAxis);
    float ds = s - uScanFront;
    float front = exp(-pow(ds / 0.008, 2.0));
    float rasterCoord = s * 42.0;
    float raster = pow(0.5 + 0.5 * cos(TAU * rasterCoord), 6.0);
    raster *= 1.0 - smoothstep(0.2, 0.45, fwidth(rasterCoord));
    float trail = step(0.0, ds) * exp(-ds / 0.2) * raster;
    col += uCyan * (front * 1.1 + trail * 0.22) * uScanAmp * (0.4 + 0.6 * ndv);

    // Energy pulse crossing the shell, and the core charging behind it.
    col += uIce * pulseAt(uSphereR) * (0.06 + fres * 0.6);
    col += uCyan * uCharge * 0.05 * ndv;

    if (uFace < 0.0) col *= vec3(0.32, 0.34, 0.46);          // inner surface: dimmer, cooler

    // Materialise: a sweep rises through the shell leaving a glowing edge.
    float my = dot(lp, normalize(vec3(0.18, 1.0, 0.1)));
    float fy = mix(-1.15, 1.15, uMat);
    float vis = 1.0 - smoothstep(fy - 0.14, fy, my);
    float edge = exp(-pow((my - fy) / 0.018, 2.0)) * (1.0 - step(0.999, uMat));
    col = col * vis + mix(uCyan, uIce, 0.6) * edge * 0.28;

    gl_FragColor = vec4(col, 1.0);
  }`;

// Instanced tube along a segment A->B (cylinder geometry spans y in [0,1]).
const EDGE_VS = /* glsl */ `
  attribute vec3 aA;
  attribute vec3 aB;
  attribute vec4 aInfo; // delay, group (0 outer / 1 inner), radius, seed
  uniform mat3 uRotOuter;
  uniform mat3 uRotInner;
  uniform mat4 uCoreMatrix;
  varying vec3 vWorldPos;
  varying vec3 vNormalW;
  varying float vAlong;
  varying float vSeed;
  varying float vTip;
  void main() {
    mat3 R = aInfo.y < 0.5 ? uRotOuter : uRotInner;
    vec3 A = R * aA;
    vec3 B = R * aB;
    float prog = clamp((uStoryTime - aInfo.x) / 0.85, 0.0, 1.0);
    prog = prog * prog * (3.0 - 2.0 * prog);
    vec3 dir = B - A;
    float len = length(dir);
    vec3 d = dir / len;
    vec3 up = abs(d.y) < 0.95 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
    vec3 xa = normalize(cross(up, d));
    vec3 za = cross(d, xa);
    vec3 radial = xa * position.x + za * position.z;
    vec3 p = A + d * (position.y * len * prog) + radial * aInfo.z * (prog > 0.0 ? 1.0 : 0.0);
    vec4 wp = uCoreMatrix * vec4(p, 1.0);
    vWorldPos = wp.xyz;
    vNormalW = normalize(mat3(uCoreMatrix) * radial);
    vAlong = position.y;
    vSeed = aInfo.w;
    vTip = prog < 1.0 ? exp(-pow((1.0 - position.y) / 0.08, 2.0)) : 0.0;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;

const EDGE_FS = /* glsl */ `
  uniform float uCharge;
  uniform float uBright;
  varying vec3 vWorldPos;
  varying vec3 vNormalW;
  varying float vAlong;
  varying float vSeed;
  varying float vTip;
  void main() {
    vec3 V = normalize(cameraPosition - vWorldPos);
    float ndv = abs(dot(normalize(vNormalW), V));
    float tube = pow(ndv, 0.7);
    // Energy packets travelling along the edges: 3 per loop, phase-offset per edge.
    float packet = pow(0.5 + 0.5 * sin(TAU * (vAlong - 3.0 * uPhase + vSeed)), 14.0);
    vec3 col = mix(uIce, uCyan, 0.55) * (0.55 + 1.6 * packet) * tube;
    col *= 1.0 + 1.3 * uCharge + 2.0 * pulseAt(length(vWorldPos));
    col += uSilver * vTip * 2.5;
    gl_FragColor = vec4(col * uBright * uLight, 1.0);
  }`;

const NODE_VS = /* glsl */ `
  attribute vec3 aPos;
  attribute vec4 aInfo; // delay, group, size, seed
  uniform mat3 uRotOuter;
  uniform mat3 uRotInner;
  uniform mat4 uCoreMatrix;
  varying vec3 vWorldPos;
  varying vec3 vNormalW;
  void main() {
    mat3 R = aInfo.y < 0.5 ? uRotOuter : uRotInner;
    float prog = clamp((uStoryTime - aInfo.x) / 0.5, 0.0, 1.0);
    float pop = prog * prog * (3.0 - 2.0 * prog);
    vec3 p = R * aPos + position * aInfo.z * pop;
    vec4 wp = uCoreMatrix * vec4(p, 1.0);
    vWorldPos = wp.xyz;
    vNormalW = normalize(mat3(uCoreMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;

const NODE_FS = /* glsl */ `
  uniform float uCharge;
  varying vec3 vWorldPos;
  varying vec3 vNormalW;
  void main() {
    vec3 V = normalize(cameraPosition - vWorldPos);
    float ndv = abs(dot(normalize(vNormalW), V));
    vec3 col = mix(uCyan, uSilver, ndv * ndv) * (0.6 + 1.4 * ndv);
    col *= 1.2 + 1.2 * uCharge + 2.5 * pulseAt(length(vWorldPos));
    gl_FragColor = vec4(col * uLight, 1.0);
  }`;

const HALO_VS = /* glsl */ `
  uniform float uSize;
  varying vec2 vUv;
  void main() {
    vUv = position.xy;
    vec4 mv = viewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    mv.xy += position.xy * uSize;
    gl_Position = projectionMatrix * mv;
  }`;

const HALO_FS = /* glsl */ `
  uniform float uIntensity;
  uniform float uTight;
  uniform float uCharge;
  uniform vec3 uTint;
  varying vec2 vUv;
  void main() {
    float r = length(vUv);
    float g = exp(-r * r * uTight) * 0.75 + exp(-r * uTight * 0.45) * 0.25;
    g *= 1.0 - smoothstep(0.75, 1.0, r);
    float k = uIntensity * uGlow * (1.0 + 1.6 * uCharge + 0.8 * uPulseAmp * exp(-uPulseR * 1.5));
    gl_FragColor = vec4(uTint * g * k, 1.0);
  }`;

function polyEdges(verts, faces) {
  const key = (a, b) => (a < b ? `${a}_${b}` : `${b}_${a}`);
  const edges = new Map();
  faces.forEach((f) => {
    for (let i = 0; i < f.length; i++) {
      const a = f[i];
      const b = f[(i + 1) % f.length];
      edges.set(key(a, b), [a, b]);
    }
  });
  return [...edges.values()];
}

function icosahedron(THREE, radius) {
  const geo = new THREE.IcosahedronGeometry(1, 0);
  const pos = geo.attributes.position;
  const verts = [];
  const index = [];
  const find = (v) => {
    for (let i = 0; i < verts.length; i++) if (verts[i].distanceTo(v) < 1e-4) return i;
    verts.push(v.clone());
    return verts.length - 1;
  };
  for (let i = 0; i < pos.count; i++) index.push(find(new THREE.Vector3().fromBufferAttribute(pos, i)));
  const faces = [];
  for (let i = 0; i < index.length; i += 3) faces.push([index[i], index[i + 1], index[i + 2]]);
  geo.dispose();
  return { verts: verts.map((v) => v.normalize().multiplyScalar(radius)), faces };
}

// Dual of the icosahedron: a dodecahedron whose vertices are the face centres.
function dualDodecahedron(THREE, ico, radius) {
  const verts = ico.faces.map((f) =>
    new THREE.Vector3().add(ico.verts[f[0]]).add(ico.verts[f[1]]).add(ico.verts[f[2]]).normalize().multiplyScalar(radius),
  );
  const edges = [];
  for (let i = 0; i < ico.faces.length; i++) {
    for (let j = i + 1; j < ico.faces.length; j++) {
      const shared = ico.faces[i].filter((v) => ico.faces[j].includes(v)).length;
      if (shared === 2) edges.push([i, j]);
    }
  }
  return { verts, edges };
}

export function createGlassCore(THREE, shared, rng) {
  const group = new THREE.Group();
  const R = 1.0;

  // ---------------------------------------------------------- glass shell
  const shellGeo = new THREE.SphereGeometry(R, 160, 112);
  const shellUniforms = (face) => ({
    uFace: { value: face },
    uMat: { value: 1 },
    uScanFront: { value: 2 },
    uScanAmp: { value: 0 },
    uScanAxis: { value: new THREE.Vector3(0.12, 1, 0.08).normalize() },
    uCharge: { value: 0 },
  });
  const inner = new THREE.Mesh(
    shellGeo,
    holoMaterial(THREE, shared, { uniforms: shellUniforms(-1), vertexShader: SHELL_VS, fragmentShader: SHELL_FS, side: THREE.BackSide }),
  );
  const outer = new THREE.Mesh(
    shellGeo,
    holoMaterial(THREE, shared, { uniforms: shellUniforms(1), vertexShader: SHELL_VS, fragmentShader: SHELL_FS, side: THREE.FrontSide }),
  );
  group.add(inner, outer);

  // -------------------------------------------------------------- nucleus
  const ico = icosahedron(THREE, 0.44);
  const icoEdges = polyEdges(ico.verts, ico.faces);
  const dod = dualDodecahedron(THREE, ico, 0.27);

  const coreUniforms = {
    uRotOuter: { value: new THREE.Matrix3() },
    uRotInner: { value: new THREE.Matrix3() },
    uCoreMatrix: { value: new THREE.Matrix4() },
    uCharge: { value: 0 },
    uBright: { value: 1 },
  };

  const edgeA = [];
  const edgeB = [];
  const edgeInfo = [];
  const pushEdge = (a, b, delay, grp, radius) => {
    edgeA.push(a.x, a.y, a.z);
    edgeB.push(b.x, b.y, b.z);
    edgeInfo.push(delay, grp, radius, rng.next());
  };
  // Draw-on order: inner structure first, then the outer cage sweeping upward.
  dod.edges.forEach(([a, b]) => {
    const pa = dod.verts[a];
    const pb = dod.verts[b];
    const h = (pa.y + pb.y) / (2 * 0.27);
    pushEdge(pa, pb, 3.35 + 0.55 * (h * 0.5 + 0.5) + 0.15 * rng.next(), 1, 0.0042);
  });
  icoEdges.forEach(([a, b]) => {
    const pa = ico.verts[a];
    const pb = ico.verts[b];
    const h = (pa.y + pb.y) / (2 * 0.44);
    pushEdge(pa, pb, 4.0 + 1.0 * (h * 0.5 + 0.5) + 0.2 * rng.next(), 0, 0.0055);
  });
  const cyl = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true).translate(0, 0.5, 0);
  const edgeGeo = new THREE.InstancedBufferGeometry().copy(cyl);
  edgeGeo.instanceCount = edgeInfo.length / 4;
  edgeGeo.setAttribute('aA', new THREE.InstancedBufferAttribute(new Float32Array(edgeA), 3));
  edgeGeo.setAttribute('aB', new THREE.InstancedBufferAttribute(new Float32Array(edgeB), 3));
  edgeGeo.setAttribute('aInfo', new THREE.InstancedBufferAttribute(new Float32Array(edgeInfo), 4));
  const edges = new THREE.Mesh(
    edgeGeo,
    holoMaterial(THREE, shared, { uniforms: coreUniforms, vertexShader: EDGE_VS, fragmentShader: EDGE_FS, side: THREE.DoubleSide }),
  );
  edges.frustumCulled = false;

  const nodePos = [];
  const nodeInfo = [];
  ico.verts.forEach((v) => {
    nodePos.push(v.x, v.y, v.z);
    nodeInfo.push(4.3 + 1.0 * (v.y / 0.44 * 0.5 + 0.5), 0, 0.017, rng.next());
  });
  dod.verts.forEach((v) => {
    nodePos.push(v.x, v.y, v.z);
    nodeInfo.push(3.6 + 0.55 * (v.y / 0.27 * 0.5 + 0.5), 1, 0.011, rng.next());
  });
  const nodeBase = new THREE.IcosahedronGeometry(1, 2);
  const nodeGeo = new THREE.InstancedBufferGeometry().copy(nodeBase);
  nodeGeo.instanceCount = nodeInfo.length / 4;
  nodeGeo.setAttribute('aPos', new THREE.InstancedBufferAttribute(new Float32Array(nodePos), 3));
  nodeGeo.setAttribute('aInfo', new THREE.InstancedBufferAttribute(new Float32Array(nodeInfo), 4));
  const nodes = new THREE.Mesh(nodeGeo, holoMaterial(THREE, shared, { uniforms: coreUniforms, vertexShader: NODE_VS, fragmentShader: NODE_FS }));
  nodes.frustumCulled = false;

  // Hot centre + layered halos (the "volumetric" light of the core).
  const quad = new THREE.PlaneGeometry(2, 2);
  const halo = (size, intensity, tight, tint) => {
    const m = new THREE.Mesh(
      quad,
      holoMaterial(THREE, shared, {
        uniforms: {
          uSize: { value: size },
          uIntensity: { value: intensity },
          uBase: { value: intensity },
          uTight: { value: tight },
          uTint: { value: tint },
          uCharge: coreUniforms.uCharge,
        },
        vertexShader: HALO_VS,
        fragmentShader: HALO_FS,
      }),
    );
    m.frustumCulled = false;
    return m;
  };
  const haloCore = halo(0.16, 3.2, 9.0, shared.uSilver.value);
  const haloMid = halo(0.62, 0.55, 7.0, shared.uCyan.value);
  const haloWide = halo(2.6, 0.05, 5.0, shared.uIce.value);

  group.add(edges, nodes, haloCore, haloMid, haloWide);

  const rotOuter = new THREE.Matrix4();
  const rotInner = new THREE.Matrix4();
  const axisOuter = new THREE.Vector3(0.25, 1, 0.1).normalize();
  const axisInner = new THREE.Vector3(-0.4, 1, 0.3).normalize();
  const coreTilt = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0.35, 0.2, -0.15));

  return {
    group,
    update(state) {
      const { build, scan, pulse } = state;
      for (const m of [inner, outer]) {
        const u = m.material.uniforms;
        u.uMat.value = build.sphere;
        u.uScanFront.value = scan.front;
        u.uScanAmp.value = scan.amp;
        u.uCharge.value = pulse.charge;
      }
      coreUniforms.uCharge.value = pulse.charge;
      rotOuter.makeRotationAxis(axisOuter, state.core.angle);
      rotInner.makeRotationAxis(axisInner, state.core.innerAngle);
      coreUniforms.uRotOuter.value.setFromMatrix4(rotOuter);
      coreUniforms.uRotInner.value.setFromMatrix4(rotInner);
      coreUniforms.uCoreMatrix.value.copy(coreTilt);
      const g = build.nucleusGlow;
      haloCore.material.uniforms.uIntensity.value = 3.2 * g;
      haloMid.material.uniforms.uIntensity.value = 0.55 * g;
      haloWide.material.uniforms.uIntensity.value = 0.05 * build.halo;
    },
  };
}
