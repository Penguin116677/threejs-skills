import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { SimplexNoise } from 'three/addons/math/SimplexNoise.js';
import { shared, fogUniforms, lightUniforms } from './shared.js';
import common from '../shaders/common.glsl?raw';
import leafShade from '../shaders/leafshade.glsl?raw';
import canopyVert from '../shaders/canopy.vert.glsl?raw';
import canopyFrag from '../shaders/canopy.frag.glsl?raw';
import leavesVert from '../shaders/leaves.vert.glsl?raw';
import leavesFrag from '../shaders/leaves.frag.glsl?raw';
import barkFrag from '../shaders/bark.frag.glsl?raw';

// A broad, rounded oak/acacia crown built from overlapping lumps.
const CLUSTERS = [
  [0, 6.5, 0, 2.6],
  [-2.4, 6.0, 0.3, 2.15],
  [2.5, 6.1, -0.2, 2.2],
  [-1.15, 7.35, -0.5, 2.0],
  [1.25, 7.45, 0.45, 2.0],
  [0.2, 5.75, 1.7, 1.9],
  [-0.3, 5.85, -1.7, 1.9],
  [-4.0, 5.45, 0.1, 1.45],
  [4.1, 5.55, 0.3, 1.5],
  [0.0, 8.2, 0.0, 1.55],
  [-2.9, 6.9, -0.9, 1.4],
  [3.0, 7.0, 0.9, 1.4]
];

/** A tube whose radius follows radiusAt(t); ends are left open (hidden). */
function taperedTube(curve, radiusAt, tubular = 24, radial = 10) {
  const frames = curve.computeFrenetFrames(tubular, false);
  const pos = [];
  const index = [];
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i <= tubular; i++) {
    const t = i / tubular;
    curve.getPointAt(t, p);
    const r = radiusAt(t);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      n.copy(frames.normals[i]).multiplyScalar(Math.cos(a)).addScaledVector(frames.binormals[i], Math.sin(a));
      pos.push(p.x + n.x * r, p.y + n.y * r, p.z + n.z * r);
    }
  }
  for (let i = 0; i < tubular; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j;
      const b = a + radial + 1;
      index.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}

function buildWood() {
  const parts = [];
  const trunk = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.4, 0),
    new THREE.Vector3(0.05, 1.2, 0.02),
    new THREE.Vector3(-0.08, 2.6, -0.05),
    new THREE.Vector3(0.06, 4.2, 0)
  ]);
  parts.push(taperedTube(trunk, (t) => 0.2 + 0.12 * (1 - t) + 0.22 * Math.max(0, 0.12 - t) / 0.12, 24, 12));

  const branches = [
    [[0, 3.2, 0], [-1.2, 4.4, 0.2], [-2.6, 5.4, 0.3]],
    [[0, 3.4, 0], [1.3, 4.5, -0.1], [2.8, 5.5, -0.1]],
    [[0, 3.8, 0], [-0.6, 5.2, -0.6], [-1.0, 6.6, -0.5]],
    [[0, 3.9, 0], [0.7, 5.3, 0.5], [1.1, 6.7, 0.4]],
    [[-1.2, 4.4, 0.2], [-2.8, 4.9, 0.1], [-3.8, 5.2, 0.1]],
    [[1.3, 4.5, -0.1], [2.9, 5.0, 0.2], [3.9, 5.3, 0.3]]
  ];
  for (const pts of branches) {
    const curve = new THREE.CatmullRomCurve3(pts.map((v) => new THREE.Vector3(...v)));
    parts.push(taperedTube(curve, (t) => 0.13 * (1 - t) + 0.03, 12, 8));
  }
  for (const g of parts) {
    const ao = new Float32Array(g.attributes.position.count);
    for (let i = 0; i < ao.length; i++) {
      const y = g.attributes.position.getY(i);
      ao[i] = THREE.MathUtils.mapLinear(THREE.MathUtils.clamp(y, 0, 5.5), 0, 5.5, 1, 0.45);
    }
    g.setAttribute('aAo', new THREE.BufferAttribute(ao, 1));
  }
  return mergeGeometries(parts);
}

function buildCanopy(detail) {
  const noise = new SimplexNoise({ random: mulberry(7) });
  const v = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const parts = [];
  CLUSTERS.forEach(([cx, cy, cz, r], ci) => {
    let g = new THREE.IcosahedronGeometry(1, detail);
    g.deleteAttribute('normal');
    g.deleteAttribute('uv');
    g = mergeVertices(g);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      dir.fromBufferAttribute(pos, i).normalize();
      const s = ci * 11.3;
      const lump =
        0.2 * noise.noise3d(dir.x * 1.6 + s, dir.y * 1.6, dir.z * 1.6) +
        0.09 * noise.noise3d(dir.x * 3.6, dir.y * 3.6 + s, dir.z * 3.6) +
        0.035 * noise.noise3d(dir.x * 8, dir.y * 8, dir.z * 8 + s);
      v.copy(dir).multiplyScalar(r * (1 + lump));
      if (v.y < 0) v.y *= 0.62; // flatter underside
      pos.setXYZ(i, v.x + cx, v.y + cy, v.z + cz);
    }
    g.computeVertexNormals();
    parts.push(g);
  });
  const geo = mergeGeometries(parts);

  // Ambient occlusion: buried in other lumps, low in the crown, near the core.
  const pos = geo.attributes.position;
  const ao = new Float32Array(pos.count);
  const centre = new THREE.Vector3(0, 6.4, 0);
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    let occ = 1;
    for (const [cx, cy, cz, r] of CLUSTERS) {
      const d = Math.hypot(v.x - cx, v.y - cy, v.z - cz);
      if (d < r * 1.05) occ *= THREE.MathUtils.lerp(0.55, 1, THREE.MathUtils.smoothstep(d / (r * 1.05), 0.7, 1));
    }
    const height = THREE.MathUtils.smoothstep(v.y, 4.2, 8.8);
    const outer = THREE.MathUtils.smoothstep(v.distanceTo(centre), 1.5, 4.5);
    ao[i] = occ * (0.45 + 0.35 * height + 0.2 * outer);
  }
  geo.setAttribute('aAo', new THREE.BufferAttribute(ao, 1));
  return geo;
}

function buildLeafCards(canopy, count) {
  const pos = canopy.attributes.position;
  const nor = canopy.attributes.normal;
  const ao = canopy.attributes.aAo;
  const quad = new THREE.PlaneGeometry(1, 1);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = quad.index;
  geo.setAttribute('position', quad.attributes.position);
  const aPos = new Float32Array(count * 3);
  const aNormal = new Float32Array(count * 3);
  const aParams = new Float32Array(count * 3);
  const rand = mulberry(3);
  for (let i = 0; i < count; i++) {
    const k = Math.floor(rand() * pos.count);
    const nx = nor.getX(k);
    const ny = nor.getY(k);
    const nz = nor.getZ(k);
    // Skip most points buried inside the crown.
    if (ao.getX(k) < 0.42 && rand() < 0.8) {
      i--;
      continue;
    }
    const out = (rand() - 0.25) * 0.35;
    aPos[i * 3] = pos.getX(k) + nx * out;
    aPos[i * 3 + 1] = pos.getY(k) + ny * out;
    aPos[i * 3 + 2] = pos.getZ(k) + nz * out;
    // Jitter normals so neighbouring clumps catch the light differently.
    const jn = new THREE.Vector3(nx + (rand() - 0.5) * 0.7, ny + (rand() - 0.5) * 0.7, nz + (rand() - 0.5) * 0.7).normalize();
    aNormal[i * 3] = jn.x;
    aNormal[i * 3 + 1] = jn.y;
    aNormal[i * 3 + 2] = jn.z;
    aParams[i * 3] = 0.32 + rand() * 0.4;
    aParams[i * 3 + 1] = rand() * Math.PI * 2;
    aParams[i * 3 + 2] = ao.getX(k);
  }
  geo.setAttribute('aPos', new THREE.InstancedBufferAttribute(aPos, 3));
  geo.setAttribute('aNormal', new THREE.InstancedBufferAttribute(aNormal, 3));
  geo.setAttribute('aParams', new THREE.InstancedBufferAttribute(aParams, 3));
  geo.instanceCount = count;
  return geo;
}

function mulberry(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createTree({ position, leafCards = 5000, detail = 10 }) {
  const group = new THREE.Group();
  group.name = 'tree';
  group.position.copy(position);
  group.scale.setScalar(0.85);

  const leafUniforms = {
    ...fogUniforms(),
    ...lightUniforms(),
    uTime: shared.uTime,
    uWind: shared.uWind,
    uLeaf: { value: new THREE.Color() },
    uLeafShade: { value: new THREE.Color() }
  };

  const canopyGeo = buildCanopy(detail);
  const canopy = new THREE.Mesh(
    canopyGeo,
    new THREE.ShaderMaterial({
      uniforms: leafUniforms,
      vertexShader: canopyVert,
      fragmentShader: common + leafShade + canopyFrag
    })
  );

  const cards = new THREE.Mesh(
    buildLeafCards(canopyGeo, leafCards),
    new THREE.ShaderMaterial({
      uniforms: leafUniforms,
      vertexShader: leavesVert,
      fragmentShader: common + leafShade + leavesFrag,
      side: THREE.DoubleSide,
      alphaToCoverage: true
    })
  );
  cards.frustumCulled = false;

  const barkUniforms = {
    ...fogUniforms(),
    ...lightUniforms(),
    uTime: shared.uTime,
    uWind: shared.uWind,
    uBark: { value: new THREE.Color() }
  };
  const wood = new THREE.Mesh(
    buildWood(),
    new THREE.ShaderMaterial({
      uniforms: barkUniforms,
      vertexShader: canopyVert,
      fragmentShader: common + barkFrag
    })
  );

  group.add(wood, canopy, cards);

  return {
    group,
    update(p) {
      leafUniforms.uLeaf.value.copy(p.leaf);
      leafUniforms.uLeafShade.value.copy(p.leafShade);
      barkUniforms.uBark.value.copy(p.bark);
    }
  };
}
