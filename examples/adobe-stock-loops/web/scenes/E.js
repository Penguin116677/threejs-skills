// E — Morph sphere: geodesic wireframe sphere whose surface flows with layered periodic waves
// (integer cycles per loop), gradient-coloured by displacement; spikes into a bloom pulse at 10 s.
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { TAU, pulse, lines, setLinePositions, perspective, softPoints } from '../lib.js';

export function create(ctx) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x040209);
  const camera = perspective(ctx, 34);

  // radial backdrop glow
  const bgMat = new THREE.ShaderMaterial({ depthWrite: false, uniforms: { uGlow: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.999,1.); }`,
    fragmentShader: `uniform float uGlow; varying vec2 vUv; void main(){ vec2 p=(vUv-0.5)*vec2(${ctx.aspect.toFixed(4)},1.);
      float r=length(p); vec3 c=mix(vec3(0.030,0.008,0.060),vec3(0.003,0.001,0.007),smoothstep(0.0,0.75,r));
      gl_FragColor=vec4(c*(1.0+0.8*uGlow),1.);} ` });
  const bgQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat);
  bgQuad.frustumCulled = false; bgQuad.renderOrder = -10;
  scene.add(bgQuad);

  const geo = mergeVertices(new THREE.IcosahedronGeometry(1, 10).deleteAttribute('normal').deleteAttribute('uv'));
  const base = geo.attributes.position.array.slice();
  const nV = base.length / 3;
  for (let i = 0; i < nV; i++) { const v = new THREE.Vector3().fromArray(base, i * 3).normalize(); v.toArray(base, i * 3); }
  const edges = new Set(), idx = geo.index.array, E = [];
  for (let f = 0; f < idx.length; f += 3) for (const [a, b] of [[idx[f], idx[f + 1]], [idx[f + 1], idx[f + 2]], [idx[f + 2], idx[f]]]) {
    const k = a < b ? a * 1e6 + b : b * 1e6 + a; if (!edges.has(k)) { edges.add(k); E.push(a, b); } }
  const ePos = new Float32Array(E.length * 3), eCol = new Float32Array(E.length * 3);
  const wire = lines(ctx, ePos, { colors: eCol, width: 1.5 });
  // dark core occludes the back half of the wireframe
  const core = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x07030f, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2 }));
  const sphere = new THREE.Group();
  sphere.add(core, wire);
  scene.add(sphere);

  // waves: direction, spatial freq, temporal cycles per loop (integer), phase, amplitude
  const W = [
    [new THREE.Vector3(1, 0.3, 0.2).normalize(), 3.0, 1, 0.0, 1.0],
    [new THREE.Vector3(-0.4, 1, 0.5).normalize(), 4.5, 2, 1.7, 0.7],
    [new THREE.Vector3(0.2, -0.6, 1).normalize(), 6.5, 3, 4.1, 0.45],
    [new THREE.Vector3(0.8, 0.8, -0.3).normalize(), 9.0, 2, 2.3, 0.25],
  ];
  const cLow = new THREE.Color(0x3a1cff), cMid = new THREE.Color(0xff2fb8), cHigh = new THREE.Color(0x5ffcff), tmp = new THREE.Color();
  const cols = new Float32Array(nV * 3);

  // orbit rings + dust
  const rings = [];
  for (const [r, tilt, w, o] of [[1.75, 1.2, 1.3, 0.55], [2.05, 1.9, 1.1, 0.35]]) {
    const g = new THREE.Group(), seg = [];
    for (let i = 0; i < 180; i++) if (i % 15 < 11) { const a0 = i / 180 * TAU, a1 = (i + 1) / 180 * TAU;
      seg.push(Math.cos(a0) * r, 0, Math.sin(a0) * r, Math.cos(a1) * r, 0, Math.sin(a1) * r); }
    g.add(lines(ctx, seg, { color: 0xb59bff, width: w, opacity: o, additive: true }));
    g.rotation.x = tilt; const outer = new THREE.Group(); outer.add(g); scene.add(outer); rings.push([outer, g]);
  }
  const ND = 220, dust = softPoints(ctx, ND, { size: 4, color: 0xd8c8ff, atten: 7 });
  const ds = Array.from({ length: ND }, (_, i) => { const h = (n) => { const x = Math.sin(i * 51.3 + n * 17.9) * 43758.5453; return x - Math.floor(x); };
    return [h(1) * TAU, (h(2) - 0.5) * 2.4, 2.2 + h(3) * 3.5, h(4) < 0.5 ? 1 : -1, h(5) * TAU]; });
  scene.add(dust);

  const v = new THREE.Vector3();
  function update(t, p, bloom) {
    const glow = pulse(p, 0.5, 8);
    const amp = 0.13 + 0.05 * Math.cos(TAU * 2 * p) + 0.17 * glow;
    const P = geo.attributes.position.array;
    for (let i = 0; i < nV; i++) {
      v.fromArray(base, i * 3);
      let d = 0;
      for (const [dir, f, m, ph, a] of W) d += a * Math.sin(f * v.dot(dir) + TAU * m * p + ph);
      d = d / 2.4;
      const s = 1 + amp * d;
      const x = (d + 1) * 0.5;
      tmp.copy(cLow).lerp(cMid, Math.min(1, x * 1.6));
      if (x > 0.6) tmp.lerp(cHigh, (x - 0.6) / 0.4);
      tmp.multiplyScalar(0.6 + 0.5 * x + 0.4 * glow);
      cols[i * 3] = tmp.r; cols[i * 3 + 1] = tmp.g; cols[i * 3 + 2] = tmp.b;
      P[i * 3] = v.x * s; P[i * 3 + 1] = v.y * s; P[i * 3 + 2] = v.z * s;
    }
    for (let e = 0; e < E.length; e++) {
      const i = E[e];
      ePos[e * 3] = P[i * 3]; ePos[e * 3 + 1] = P[i * 3 + 1]; ePos[e * 3 + 2] = P[i * 3 + 2];
      eCol[e * 3] = cols[i * 3]; eCol[e * 3 + 1] = cols[i * 3 + 1]; eCol[e * 3 + 2] = cols[i * 3 + 2];
    }
    for (let i = 0; i < P.length; i++) P[i] *= 0.992; // core sits just inside the wire
    geo.attributes.position.needsUpdate = true;
    setLinePositions(wire, ePos, eCol);
    sphere.rotation.set(0.3 * Math.sin(TAU * p), TAU * p, 0);
    rings.forEach(([o, g], i) => { o.rotation.y = (i ? -1 : 1) * TAU * p; g.rotation.z = 0.2 * Math.sin(TAU * (p + i * 0.3)); });
    const a = dust.geometry.attributes.position.array, al = dust.geometry.attributes.aAlpha.array;
    ds.forEach(([a0, y, r, dir, ph], i) => { const ang = a0 + dir * TAU * p;
      a[i * 3] = Math.cos(ang) * r; a[i * 3 + 1] = y + 0.15 * Math.sin(TAU * p + ph); a[i * 3 + 2] = Math.sin(ang) * r;
      al[i] = 0.45 + 0.3 * Math.sin(TAU * 2 * p + ph) + 0.3 * glow; });
    dust.geometry.attributes.position.needsUpdate = true; dust.geometry.attributes.aAlpha.needsUpdate = true;
    bgMat.uniforms.uGlow.value = glow;
    bloom.strength = 0.45 + 0.2 * glow;
    // camera: slow lateral drift + push-in, easing to a near-stop at the climax
    const az = 0.35 * Math.cos(TAU * p);
    const r = 5.6 - 0.4 * glow;
    camera.position.set(Math.sin(az) * r, 0.4 + 0.45 * Math.cos(TAU * p), Math.cos(az) * r);
    camera.lookAt(0, 0, 0);
  }
  return { scene, camera, update, bloom: { strength: 0.5, radius: 0.4, threshold: 0.2 } };
}
