#!/usr/bin/env node
// Fast, GPU-free checks of the animation timeline (run: npm test).
//  - frame 0 and t = duration are identical (seamless loop)
//  - parameters are continuous (no popping), including across the loop point
//  - the liquid stays inside the 16:9 frame with a safety margin
//  - determinism: the same time always yields the same state

import assert from 'node:assert/strict';
import { sceneAt, LOBE_COUNT } from '../src/animation.js';
import { TIMELINE } from '../src/config.js';

const flat = (s) => [...s.lobesA, ...s.lobesB, s.blend, s.wave, s.ripple, s.iri, s.light, ...s.rot, ...s.camPos];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(...a); return [a[0] / l, a[1] / l, a[2] / l]; };
const mat = (m, v) => [ // column-major mat3 * v
  m[0] * v[0] + m[3] * v[1] + m[6] * v[2],
  m[1] * v[0] + m[4] * v[1] + m[7] * v[2],
  m[2] * v[0] + m[5] * v[1] + m[8] * v[2],
];

let failures = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ✔ ${name}`);
  } catch (e) {
    failures++;
    console.log(`  ✖ ${name}\n    ${e.message}`);
  }
}

test('loop closes exactly: state(0) === state(duration)', () => {
  const a = flat(sceneAt(0));
  const b = flat(sceneAt(TIMELINE.duration));
  a.forEach((x, i) => assert.ok(Math.abs(x - b[i]) < 1e-6, `component ${i}: ${x} vs ${b[i]}`));
});

test('deterministic', () => {
  for (const t of [0.37, 7.77, 13.01]) assert.deepEqual(flat(sceneAt(t)), flat(sceneAt(t)));
});

test('continuity: no parameter pops between sub-frame samples (incl. loop seam)', () => {
  const dt = 1 / (TIMELINE.fps * 8);
  let worst = 0, at = 0;
  for (let t = -0.5; t < TIMELINE.duration + 0.5; t += dt) {
    const a = flat(sceneAt(t)), b = flat(sceneAt(t + dt));
    for (let i = 0; i < a.length; i++) {
      const d = Math.abs(a[i] - b[i]) / dt; // rate of change, units / s
      if (d > worst) [worst, at] = [d, t];
    }
  }
  assert.ok(worst < 4, `max rate of change ${worst.toFixed(2)}/s at t=${at.toFixed(3)} suggests a jump`);
  console.log(`    max parameter speed ${worst.toFixed(2)} units/s`);
});

test('liquid stays inside the 16:9 frame (8% safety margin)', () => {
  let worstX = 0, worstY = 0;
  for (let f = 0; f < TIMELINE.frameCount; f++) {
    const s = sceneAt(f / TIMELINE.fps);
    const ro = s.camPos;
    const fw = norm(sub(s.camTarget, ro));
    const rt = norm(cross(fw, [0, 1, 0]));
    const up = cross(rt, fw);
    const focal = 0.5 / Math.tan((s.fov * Math.PI) / 360);
    for (let i = 0; i < LOBE_COUNT; i++) {
      const r = s.lobesA[i * 4 + 3] + s.wave * 2.5 + s.ripple;
      if (r <= 0.002) continue;
      for (const L of [s.lobesA, s.lobesB]) {
        const p = mat(s.rot, [L[i * 4], L[i * 4 + 1], L[i * 4 + 2]]);
        const d = sub(p, ro);
        const z = dot(d, fw);
        const x = (Math.abs(dot(d, rt)) + r) * (focal / z);
        const y = (Math.abs(dot(d, up)) + r) * (focal / z);
        worstX = Math.max(worstX, x / (8 / 9));
        worstY = Math.max(worstY, y / 0.5);
      }
    }
  }
  console.log(`    max extent: ${(worstX * 100).toFixed(0)}% of half-width, ${(worstY * 100).toFixed(0)}% of half-height`);
  assert.ok(worstX < 0.92 && worstY < 0.92, 'liquid comes too close to the frame edge');
});

console.log(failures ? `\n✖ ${failures} test(s) failed` : '\n✔ timeline tests passed');
process.exit(failures ? 1 : 0);
