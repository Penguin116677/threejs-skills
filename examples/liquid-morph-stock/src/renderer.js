// Thin wrapper around THREE.WebGLRenderer for both the live preview and the
// deterministic exporter. Exports render in horizontal tiles (scissor strips)
// so that no single draw call runs long enough to trip a GPU watchdog.

import * as THREE from 'three';
import { createLiquid } from './liquid.js';
import { sceneAt } from './animation.js';

export function createLiquidRenderer(canvas, { preserveDrawingBuffer = false } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      preserveDrawingBuffer,
      powerPreference: 'high-performance',
    });
  } catch (err) {
    throw new Error(
      `WebGL2 could not be initialised (${err.message}). ` +
        'Use a browser with WebGL2 enabled; for headless export, Chromium needs ' +
        '--use-angle=swiftshader or a working GPU.',
    );
  }
  renderer.setPixelRatio(1);
  renderer.autoClear = false;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1); // unused by the raw shader
  const liquid = createLiquid();
  scene.add(liquid.mesh);

  // Capture compile/link logs so shader failures surface as clear errors.
  let shaderError = null;
  renderer.debug.onShaderError = (gl, program, vs, fs) => {
    const log = [gl.getProgramInfoLog(program), gl.getShaderInfoLog(vs), gl.getShaderInfoLog(fs)]
      .filter((l) => l && l.trim())
      .join('\n');
    shaderError = new Error(`Shader compilation failed:\n${log}`);
  };

  // Compile and draw once up front (Three.js validates lazily on first use).
  function checkShader() {
    renderer.setSize(8, 8, false);
    liquid.uniforms.uResolution.value.set(8, 8);
    liquid.update(sceneAt(0));
    renderer.render(scene, camera);
    if (shaderError) throw shaderError;
    const gl = renderer.getContext();
    if (gl.isContextLost()) throw new Error('WebGL context lost during shader compilation.');
  }

  function setSize(width, height) {
    renderer.setSize(width, height, false);
    liquid.uniforms.uResolution.value.set(width, height);
  }

  function renderTime(t, { tileRows = 1 } = {}) {
    liquid.update(sceneAt(t));
    const { x: w, y: h } = liquid.uniforms.uResolution.value;
    if (tileRows <= 1) {
      renderer.setScissorTest(false);
      renderer.render(scene, camera);
      return;
    }
    const gl = renderer.getContext();
    renderer.setScissorTest(true);
    const rowH = Math.ceil(h / tileRows);
    for (let r = 0; r < tileRows; r++) {
      const y = r * rowH;
      renderer.setScissor(0, y, w, Math.min(rowH, h - y));
      renderer.render(scene, camera);
      gl.finish();
    }
    renderer.setScissorTest(false);
  }

  return { renderer, liquid, checkShader, setSize, renderTime };
}
