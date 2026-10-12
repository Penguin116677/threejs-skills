import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

import { generateNetwork } from './network.js';
import { STORY, envelopes, cameraState } from './timeline.js';
import { backgroundShader, edgeShader, nodeShader, pulseShader, dustShader, hazeShader, finalShader } from './shaders.js';

const BLOOM_REFERENCE_HEIGHT = 1080;

// Reusable scene + animation system.
//
//   const net = new NeonNetwork(canvas, config);
//   net.setSize(1920, 1080);
//   net.renderAt(seconds);          // deterministic: same seconds => same pixels
//
// The class never reads the clock. Callers (preview UI or offline renderer)
// decide which time to show, so playback speed can never affect the render.
export class NeonNetwork {
  constructor(canvas, config, { preserveDrawingBuffer = false } = {}) {
    this.canvas = canvas;
    this.config = config;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false, // geometry is self-antialiased by soft shader profiles
      alpha: false,
      preserveDrawingBuffer,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(1);
    this.renderer.autoClear = true;
    this.renderer.setClearColor(0x000000, 1);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(36, 16 / 9, 0.1, 200);
    this.uniforms = this._createUniforms();

    this.width = 0;
    this.height = 0;
    this._buildComposer();
    this.build();
  }

  _createUniforms() {
    const c = this.config.colors;
    return {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1920, 1080) },
      uResScale: { value: 1 },
      uGlow: { value: this.config.glow },
      uEnergy: { value: 0 },
      uFocalWin: { value: 0 },
      uTrail: { value: 0 },
      uSeedLevel: { value: 0 },
      uFocus: { value: 25 },
      uDof: { value: this.config.dof },
      uNear: { value: this.camera.near },
      uCyan: { value: new THREE.Color(c.cyan) },
      uViolet: { value: new THREE.Color(c.violet) },
      uMagenta: { value: new THREE.Color(c.magenta) },
      uNavy: { value: new THREE.Color(c.navy) },
      uBlack: { value: new THREE.Color(c.black) },
      uGlowCenter: { value: new THREE.Vector2(0.64, 0.52) },
    };
  }

  _material(shader, extra = {}) {
    return new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: shader.vertex,
      fragmentShader: shader.fragment,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide, // screen-space ribbons have view-dependent winding
      ...extra,
    });
  }

  // (Re)generate the network and GPU buffers from the current config.
  build() {
    this._disposeContent();
    this.network = generateNetwork(this.config);
    const { nodes, edges, pulses, dust, haze } = this.network;
    const group = new THREE.Group();
    this.content = group;

    // Background (full-screen, drawn first).
    {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
      const mesh = new THREE.Mesh(geo, this._material(backgroundShader, { blending: THREE.NoBlending, transparent: false }));
      mesh.frustumCulled = false;
      mesh.renderOrder = -10;
      group.add(mesh);
    }

    const quad = (positions, index) => {
      const g = new THREE.InstancedBufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      g.setIndex(index);
      return g;
    };
    const billboard = () => quad([-1, -1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0], [0, 1, 2, 2, 1, 3]);
    const inst = (g, name, data, size) => g.setAttribute(name, new THREE.InstancedBufferAttribute(new Float32Array(data), size));
    const addMesh = (geo, count, shader, order) => {
      geo.instanceCount = count;
      const mesh = new THREE.Mesh(geo, this._material(shader));
      mesh.frustumCulled = false;
      mesh.renderOrder = order;
      group.add(mesh);
      return mesh;
    };

    // Haze (volumetric light).
    {
      const g = billboard();
      const colorFor = { navy: this.uniforms.uNavy.value, cyan: this.uniforms.uCyan.value, violet: this.uniforms.uViolet.value, magenta: this.uniforms.uMagenta.value };
      inst(g, 'iPos', haze.flatMap((h) => h.p), 3);
      inst(g, 'iInfo', haze.flatMap((h) => [h.size, h.amount, h.focal ? 1 : 0, 0]), 4);
      inst(g, 'iColor', haze.flatMap((h) => colorFor[h.tint].toArray()), 3);
      addMesh(g, haze.length, hazeShader, 0);
    }

    // Dust.
    {
      const g = billboard();
      inst(g, 'iPos', dust.flatMap((d) => d.p), 3);
      inst(g, 'iInfo', dust.flatMap((d) => [d.size, d.bright, d.freq, d.phase]), 4);
      inst(g, 'iAmp', dust.flatMap((d) => [...d.amp, d.hue]), 4);
      addMesh(g, dust.length, dustShader, 1);
    }

    // Edges.
    {
      const g = quad([-1, 0, 0, 1, 0, 0, -1, 1, 0, 1, 1, 0], [0, 1, 2, 2, 1, 3]);
      inst(g, 'iA', edges.flatMap((e) => nodes[e.a].p), 3);
      inst(g, 'iB', edges.flatMap((e) => nodes[e.b].p), 3);
      inst(g, 'iTiming', edges.flatMap((e) => [e.growStart, e.growDur, e.retractStart, e.retractDur]), 4);
      inst(g, 'iInfo', edges.flatMap((e) => [e.focal, e.detail ? 1 : 0, e.hue, e.flowCycles]), 4);
      inst(g, 'iLen', edges.map((e) => e.len), 1);
      addMesh(g, edges.length, edgeShader, 2);
    }

    // Pulses (head + streak trail, one instance each).
    {
      const g = quad([0, -1, 0, 1, -1, 0, 0, 1, 0, 1, 1, 0], [0, 1, 2, 2, 1, 3]);
      const edgeOf = (p) => edges[p.edge];
      inst(g, 'iA', pulses.flatMap((p) => nodes[edgeOf(p).a].p), 3);
      inst(g, 'iB', pulses.flatMap((p) => nodes[edgeOf(p).b].p), 3);
      inst(g, 'iTiming', pulses.flatMap((p) => { const e = edgeOf(p); return [e.growStart, e.growDur, e.retractStart, e.retractDur]; }), 4);
      inst(g, 'iMotion', pulses.flatMap((p) => [p.cycles, p.offset, p.travel, p.dir]), 4);
      inst(g, 'iInfo', pulses.flatMap((p) => [0, p.hue, edgeOf(p).focal, p.size]), 4);
      addMesh(g, pulses.length, pulseShader, 3);
    }

    // Nodes.
    {
      const g = billboard();
      inst(g, 'iPos', nodes.flatMap((n) => n.p), 3);
      inst(g, 'iTiming', nodes.flatMap((n) => [n.appear, n.vanish, n.kind === 'seed' ? 1 : 0, n.hub ? 1 : 0]), 4);
      inst(g, 'iInfo', nodes.flatMap((n) => [n.size, n.freq, n.phase, n.focal]), 4);
      inst(g, 'iExtra', nodes.flatMap((n) => [n.pulseAmp, n.hue]), 2);
      addMesh(g, nodes.length, nodeShader, 4);
    }

    this.scene.add(group);
  }

  _buildComposer() {
    const rt = new THREE.WebGLRenderTarget(16, 16, { type: THREE.HalfFloatType, depthBuffer: false });
    this.composer = new EffectComposer(this.renderer, rt);
    this.composer.setPixelRatio(1);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), this.config.bloom, this.config.bloomRadius, 0.1);
    // Bloom is computed at a fixed 1080-line internal resolution so the halo
    // size relative to the frame is identical in a 1080p preview and a 4K render.
    const bloomSetSize = this.bloom.setSize.bind(this.bloom);
    this.bloom.setSize = (w, h) => {
      const scale = BLOOM_REFERENCE_HEIGHT / h;
      bloomSetSize(Math.round(w * scale), BLOOM_REFERENCE_HEIGHT);
    };
    this.composer.addPass(this.bloom);

    this.finalPass = new ShaderPass(finalShader);
    this.finalPass.uniforms.uResolution.value = this.uniforms.uResolution.value;
    this.composer.addPass(this.finalPass);
  }

  setSize(width, height) {
    if (width === this.width && height === this.height) return;
    this.width = width;
    this.height = height;
    this.renderer.setSize(width, height, false);
    this.composer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.uniforms.uResolution.value.set(width, height);
    this.uniforms.uResScale.value = height / 1080;
  }

  // Live-tunable parameters that don't require a rebuild.
  applyLook() {
    const c = this.config;
    this.uniforms.uGlow.value = c.glow;
    this.uniforms.uDof.value = c.dof;
    this.uniforms.uCyan.value.set(c.colors.cyan);
    this.uniforms.uViolet.value.set(c.colors.violet);
    this.uniforms.uMagenta.value.set(c.colors.magenta);
    this.uniforms.uNavy.value.set(c.colors.navy);
    this.uniforms.uBlack.value.set(c.colors.black);
    this.bloom.strength = c.bloom;
    this.bloom.radius = c.bloomRadius;
    this.finalPass.uniforms.uExposure.value = c.exposure;
    this.finalPass.uniforms.uCopySpace.value = c.copySpace;
  }

  // Story time (0..15) for a real time in seconds; wraps so t = duration == 0.
  storyTime(seconds) {
    const d = this.config.duration;
    const wrapped = ((seconds % d) + d) % d;
    return (wrapped / d) * STORY;
  }

  update(seconds) {
    const s = this.storyTime(seconds);
    const env = envelopes(s);
    const u = this.uniforms;
    u.uTime.value = s;
    u.uEnergy.value = env.energy;
    u.uFocalWin.value = env.focal;
    u.uTrail.value = env.trail;
    u.uSeedLevel.value = env.seed;

    const cam = cameraState(s, this.config.camera);
    this.camera.position.set(...cam.position);
    this.camera.up.set(Math.sin(cam.roll), Math.cos(cam.roll), 0);
    this.camera.lookAt(...cam.target);
    this.camera.updateMatrixWorld();
    u.uFocus.value = cam.focus;
    return { story: s, ...env, push: cam.push };
  }

  renderAt(seconds, frameIndex = Math.round(seconds * this.config.fps)) {
    this.applyLook();
    const state = this.update(seconds);
    this.finalPass.uniforms.uFrame.value = frameIndex % totalFramesOf(this.config);
    this.composer.render();
    return state;
  }

  _disposeContent() {
    if (!this.content) return;
    this.content.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
    this.scene.remove(this.content);
    this.content = null;
  }

  dispose() {
    this._disposeContent();
    this.composer.dispose?.();
    this.renderer.dispose();
  }
}

function totalFramesOf(cfg) {
  return Math.max(1, Math.round(cfg.duration * cfg.fps));
}
