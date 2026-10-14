import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import finalFrag from '../shaders/final.frag.glsl?raw';

export function createPost(renderer, scene, camera, { samples }) {
  const size = renderer.getSize(new THREE.Vector2());
  const target = new THREE.WebGLRenderTarget(size.x, size.y, {
    type: THREE.HalfFloatType,
    samples
  });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));

  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.3, 0.45, 0.9);
  composer.addPass(bloom);

  // Tone mapping (ACES, from the renderer) + sRGB conversion.
  composer.addPass(new OutputPass());

  const final = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      uTime: { value: 0 },
      uVignette: { value: 0.32 },
      uGrain: { value: 0.028 },
      uResolution: { value: new THREE.Vector2(size.x, size.y) }
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: finalFrag
  });
  composer.addPass(final);

  return {
    composer,
    bloom,
    setSize(w, h, pixelRatio) {
      composer.setPixelRatio(pixelRatio);
      composer.setSize(w, h);
      final.uniforms.uResolution.value.set(w * pixelRatio, h * pixelRatio);
    },
    update(p, time) {
      bloom.strength = p.bloom;
      final.uniforms.uTime.value = time;
      final.uniforms.uVignette.value = 0.28 + p.fireflies * 0.12;
    },
    render() {
      composer.render();
    }
  };
}
