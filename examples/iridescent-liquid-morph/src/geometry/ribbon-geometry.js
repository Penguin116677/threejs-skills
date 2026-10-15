// Parametric grid for a liquid ribbon.
// The geometry only stores the (u, v) parameters; the real 3D shape is
// computed every frame in the vertex shader (see shaders/ribbon.glsl.js).
//   u ∈ [0,1] : along the ribbon length
//   v ∈ [0,1] : around the flattened cross-section (v=0 and v=1 coincide)
// The parameters are stored in `position.xy` so three.js treats it as a normal mesh.

import { BufferGeometry, Float32BufferAttribute, Sphere, Vector3 } from 'three';

export function createRibbonGeometry(segU, segV) {
  const cols = segU + 1;
  const rows = segV + 1;
  const pos = new Float32Array(cols * rows * 3);
  let k = 0;
  for (let j = 0; j < rows; j++) {
    const v = j / segV;
    for (let i = 0; i < cols; i++) {
      pos[k++] = i / segU;
      pos[k++] = v;
      pos[k++] = 0;
    }
  }
  const index = [];
  for (let j = 0; j < segV; j++) {
    for (let i = 0; i < segU; i++) {
      const a = j * cols + i;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      index.push(a, c, b, b, c, d);
    }
  }
  const g = new BufferGeometry();
  g.setIndex(index); // three.js picks Uint32 automatically when needed (WebGL2 core feature)
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  // The real shape is generated on the GPU: give a generous fixed bound
  // and disable frustum culling on the mesh.
  g.boundingSphere = new Sphere(new Vector3(0, 0, 0), 8);
  return g;
}

// Fullscreen triangle (cheaper than a quad, no diagonal seam).
export function createFullscreenTriangle() {
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  g.boundingSphere = new Sphere(new Vector3(), 1e6);
  return g;
}
