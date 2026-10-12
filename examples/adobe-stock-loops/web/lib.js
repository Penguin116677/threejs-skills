import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

export const FPS = 30;
export const LOOP = 20; // seconds; every periodic motion uses a period that divides this
export const TAU = Math.PI * 2;

// Smooth periodic bump in [0,1], peaking at phase `center`; exactly 0 slope at the loop seam.
export const pulse = (p, center = 0.5, sharp = 8) => Math.pow(0.5 - 0.5 * Math.cos(TAU * (p - center + 0.5)), sharp);
export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const easeOutCubic = (x) => 1 - Math.pow(1 - clamp01(x), 3);
export const easeInOut = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };

export function rng(seed = 1) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Screen-space fat lines (Line2). width is in pixels at 1080p and scaled with ctx.px.
export function lines(ctx, positions, opt = {}) {
  const g = new LineSegmentsGeometry();
  g.setPositions(positions);
  if (opt.colors) g.setColors(opt.colors);
  const m = new LineMaterial({
    color: opt.colors ? 0xffffff : (opt.color ?? 0xffffff),
    linewidth: (opt.width ?? 2) * ctx.px,
    vertexColors: !!opt.colors,
    transparent: opt.opacity !== undefined && opt.opacity < 1 || !!opt.additive,
    opacity: opt.opacity ?? 1,
    depthWrite: !opt.additive && (opt.opacity ?? 1) >= 1,
    blending: opt.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    depthTest: opt.depthTest ?? true,
  });
  m.fog = opt.fog ?? true;
  m.resolution.set(ctx.W, ctx.H);
  const l = new LineSegments2(g, m);
  l.frustumCulled = false;
  return l;
}

// Overwrite segment positions/colors in place (same segment count).
export function setLinePositions(l, positions, colors) {
  const g = l.geometry;
  const pa = g.attributes.instanceStart.data;
  pa.array.set(positions); pa.needsUpdate = true;
  if (colors) { const ca = g.attributes.instanceColorStart.data; ca.array.set(colors); ca.needsUpdate = true; }
}

export function edgePositions(geo, threshold = 1) {
  return Array.from(new THREE.EdgesGeometry(geo, threshold).attributes.position.array);
}

export function circle(r, n, y = 0, out = [], cx = 0, cz = 0) {
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * TAU, a1 = ((i + 1) / n) * TAU;
    out.push(cx + Math.cos(a0) * r, y, cz + Math.sin(a0) * r, cx + Math.cos(a1) * r, y, cz + Math.sin(a1) * r);
  }
  return out;
}

// Analytic, anti-aliased infinite grid on the XZ plane (fwidth-based, fades out before moiré appears).
export function gridPlane(opt = {}) {
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, extensions: { derivatives: true },
    uniforms: {
      uColor: { value: new THREE.Color(opt.color ?? 0x66ccff) },
      uMajorColor: { value: new THREE.Color(opt.majorColor ?? opt.color ?? 0x66ccff) },
      uIntensity: { value: opt.intensity ?? 0.5 },
      uMajorIntensity: { value: opt.majorIntensity ?? 1.0 },
      uCell: { value: opt.cell ?? 1 },
      uMajor: { value: opt.major ?? 5 },
      uWidth: { value: (opt.width ?? 1.5) },
      uMajorWidth: { value: (opt.majorWidth ?? 2.2) },
      uOffset: { value: new THREE.Vector2() },
      uFade: { value: new THREE.Vector2(opt.fadeNear ?? 10, opt.fadeFar ?? 40) },
      uCam: { value: new THREE.Vector3() },
      uWave: { value: new THREE.Vector3(0, 0, 3) }, // radius, amplitude, width
      uWaveColor: { value: new THREE.Color(opt.waveColor ?? 0xffffff) },
      uPx: { value: 1 },
    },
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `
      uniform vec3 uColor,uMajorColor,uCam,uWave,uWaveColor; uniform float uIntensity,uMajorIntensity,uCell,uMajor,uWidth,uMajorWidth,uPx;
      uniform vec2 uOffset,uFade; varying vec3 vW;
      float gridLine(vec2 c, float w){
        vec2 fw = fwidth(c);
        vec2 d = abs(fract(c-0.5)-0.5)/max(fw,1e-5);
        float l = max(clamp(w*0.5+0.5-d.x,0.,1.), clamp(w*0.5+0.5-d.y,0.,1.));
        // fade when cells get smaller than ~6px to kill moire/flicker
        float cellPx = 1.0/max(max(fw.x,fw.y),1e-5);
        return l*smoothstep(4.0,10.0,cellPx);
      }
      void main(){
        vec2 p = vW.xz + uOffset;
        float minor = gridLine(p/uCell, uWidth*uPx);
        float major = gridLine(p/(uCell*uMajor), uMajorWidth*uPx);
        float dist = length(vW.xz - uCam.xz);
        float fade = 1.0 - smoothstep(uFade.x, uFade.y, dist);
        float wr = length(vW.xz);
        float wave = uWave.y * exp(-pow((wr-uWave.x)/uWave.z,2.0));
        vec3 col = uColor*minor*uIntensity + uMajorColor*major*uMajorIntensity;
        col *= (1.0 + wave*2.5);
        col += uWaveColor*wave*0.10*fade;
        gl_FragColor = vec4(col*fade, 1.0);
      }`,
  });
  const size = opt.size ?? 400;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.y = opt.y ?? 0;
  m.frustumCulled = false;
  m.renderOrder = -1;
  return m;
}

// Soft round additive points (sizes in px at 1080p, perspective-attenuated).
export function softPoints(ctx, count, opt = {}) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  g.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(count).fill(1), 1));
  g.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(count * 3).fill(1), 3));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uSize: { value: (opt.size ?? 6) * ctx.px }, uColor: { value: new THREE.Color(opt.color ?? 0xffffff) },
      uAtten: { value: opt.atten ?? 10 } },
    vertexShader: `attribute float aAlpha; attribute vec3 aColor; varying float vA; varying vec3 vC; uniform float uSize,uAtten;
      void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv;
        float s = uSize*(uAtten>0. ? uAtten/max(-mv.z,0.1) : 1.0); gl_PointSize=max(s,2.0); vA=aAlpha*min(1.0,s/2.0); vC=aColor; }`,
    fragmentShader: `uniform vec3 uColor; varying float vA; varying vec3 vC;
      void main(){ float d=length(gl_PointCoord-0.5)*2.0; float a=smoothstep(1.0,0.0,d); a*=a; gl_FragColor=vec4(uColor*vC*a*vA,1.0);} `,
  });
  const p = new THREE.Points(g, mat);
  p.frustumCulled = false;
  return p;
}

export function perspective(ctx, fov, near = 0.1, far = 1000) {
  return new THREE.PerspectiveCamera(fov, ctx.aspect, near, far);
}
