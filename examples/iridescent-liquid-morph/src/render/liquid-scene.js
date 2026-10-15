// Assembles background + ribbons + camera, and maps a timeline sample onto them.
import { Scene, Mesh } from 'three';
import { ASPECT } from '../config/render-config.js';
import { RIBBONS } from '../config/look.js';
import { createRibbonGeometry, createFullscreenTriangle } from '../geometry/ribbon-geometry.js';
import { createSharedUniforms, createChromeMaterial, createBackgroundMaterial } from '../materials/chrome-material.js';
import { updateLighting } from '../lighting/studio-lighting.js';
import { createCamera, updateCamera } from '../camera/camera-rig.js';

export class LiquidScene {
  constructor(renderer, preset) {
    this.renderer = renderer;
    this.scene = new Scene();
    this.camera = createCamera(ASPECT);
    this.shared = createSharedUniforms();

    this.background = createBackgroundMaterial(this.shared);
    const bg = new Mesh(createFullscreenTriangle(), this.background);
    bg.frustumCulled = false;
    bg.renderOrder = -1;
    this.scene.add(bg);

    this.ribbons = RIBBONS.slice(0, preset.ribbons).map((look, i) => {
      const segU = Math.max(32, Math.round(preset.segU * look.detail));
      const segV = Math.max(12, Math.round(preset.segV * look.detail));
      const mesh = new Mesh(createRibbonGeometry(segU, segV), createChromeMaterial(this.shared, look, preset));
      mesh.name = look.name;
      mesh.frustumCulled = false; // shape lives in the vertex shader
      mesh.position.fromArray(look.position);
      mesh.rotation.set(...look.rotation);
      mesh.renderOrder = i;
      this.scene.add(mesh);
      return mesh;
    });
    this.vertexCount = this.ribbons.reduce((a, m) => a + m.geometry.attributes.position.count, 0);
  }

  // Background shader works in pixels: tell it the size of the buffer we draw into.
  setTargetSize(width, height) {
    this.background.uniforms.uResolution.value.set(width, height);
  }

  update(sample) {
    this.shared.uPhase.value = sample.phase;
    this.shared.uLoop.value.set(sample.loopCos, sample.loopSin);
    this.shared.uFrameSeed.value = sample.frameIndex;
    updateLighting(this.shared, this.background, sample);
    updateCamera(this.camera, sample);
  }

  render(target = null) {
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null);
  }

  compile() {
    this.renderer.compile(this.scene, this.camera);
  }
}
