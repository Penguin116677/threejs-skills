import { createRng, clamp, bezier3, v3 } from './math.js';
import { FOCAL_POINT, cameraState } from './timeline.js';

// Procedural network generation. Produces plain arrays (no Three.js types) so
// the result is easy to inspect, test and reproduce: same seed => same network.
//
// Structure is deliberate rather than uniformly random:
//   - a dense focal cluster (right of centre, where the 7–11 s energy lives),
//   - a handful of sweeping strands that give the composition direction,
//   - sparse ambient nodes for depth, thinned out on the left so that third of
//     the frame stays dark and usable as title space.
//
// Timing (all in story seconds, see timeline.js):
//   - seed nodes are always present (dim at the loop point),
//   - filaments grow outward from the seeds along a shortest-path tree,
//   - a "detail" layer of extra filaments appears around 10–12 s,
//   - from 13 s everything retracts back toward the seeds in reverse order,
//     finishing before 15 s so the last frame flows into the first.

const F = FOCAL_POINT;

// Copy space is enforced in screen space: candidate nodes are projected through
// the camera at several moments of the move and rejected if they would land in
// the left title-safe third (or too close to the lens). Same maths as
// THREE.PerspectiveCamera with fov 36°, 16:9.
const COPY_SPACE_X = 0.34;
const TAN_HALF_FOV = Math.tan((36 * Math.PI) / 360);
function makeViews(motion) {
  return [0, 4, 7, 9, 10.4, 12, 13.5].map((s) => {
    const { position, target } = cameraState(s, motion);
    const f = v3.sub(target, position);
    const fl = Math.hypot(...f);
    const fw = v3.scale(f, 1 / fl);
    const r0 = [-fw[2], 0, fw[0]]; // fw x (0,1,0)
    const rl = Math.hypot(...r0);
    return { position, fw, right: v3.scale(r0, 1 / rl) };
  });
}
function screenX(view, p) {
  const d = v3.sub(p, view.position);
  const z = d[0] * view.fw[0] + d[1] * view.fw[1] + d[2] * view.fw[2];
  const x = d[0] * view.right[0] + d[1] * view.right[1] + d[2] * view.right[2];
  return { z, sx: 0.5 + 0.5 * (x / (z * TAN_HALF_FOV * (16 / 9))) };
}

const STRANDS = [
  [[2, -7.5, -8], [3.5, -3.5, 0], [7, -0.5, 0], [15, 3.5, -6]],
  [[3, 7.5, -10], [5, 3.5, -3], [6.5, -1.5, 1], [10, -6.5, 5]],
  [[17, 6.5, -4], [11, 2.5, 0], [6, 0.5, 4], [3, -2.5, 8]],
  [[4, -8.5, -11], [5.5, -3.5, -5], [7.5, 2, -2], [6, 7.5, 3]],
  [[1, 3.5, -15], [5, 2, -9], [10, 1, -7], [18, -2, -12]],
];

export function generateNetwork(config) {
  const rng = createRng(config.seed);
  const density = config.density;
  const nodes = [];

  const views = makeViews(config.camera);
  const tooClose = (p, minD) => nodes.some((n) => v3.dist(n.p, p) < minD);
  const inBounds = (p) =>
    p[2] < 9.5 && p[2] > -22 && Math.abs(p[1]) < 11 &&
    views.every((v) => {
      const { z, sx } = screenX(v, p);
      return z > 4.5 && sx > COPY_SPACE_X;
    });
  const addNode = (p, kind, minD = 0.95) => {
    if (!inBounds(p) || tooClose(p, minD)) return false;
    nodes.push({ p, kind });
    return true;
  };

  // Seeds: the "few tiny cyan particles" present at frame 0.
  const seedCount = 5;
  for (let tries = 0; nodes.length < seedCount && tries < 500; tries++) {
    const p = [F[0] + rng.gauss() * 1.6, F[1] + rng.gauss() * 1.1, F[2] + rng.gauss() * 1.4];
    addNode(p, 'seed', 1.3);
  }

  const focalCount = Math.round(22 * density);
  for (let i = 0, tries = 0; i < focalCount && tries < 4000; tries++) {
    const p = [F[0] + rng.gauss() * 3.0, F[1] + rng.gauss() * 2.2, F[2] + rng.gauss() * 2.8];
    if (addNode(p, 'focal')) i++;
  }

  const perStrand = Math.round(17 * density);
  STRANDS.forEach((ctrl, si) => {
    for (let i = 0; i < perStrand; i++) {
      const t = clamp((i + 0.5 + rng.range(-0.35, 0.35)) / perStrand, 0, 1);
      const base = bezier3(ctrl[0], ctrl[1], ctrl[2], ctrl[3], t);
      const p = [base[0] + rng.gauss() * 0.55, base[1] + rng.gauss() * 0.55, base[2] + rng.gauss() * 0.55];
      if (addNode(p, 'strand')) {
        nodes[nodes.length - 1].strand = si;
        nodes[nodes.length - 1].strandT = t;
      }
    }
  });

  const ambientCount = Math.round(70 * density);
  for (let i = 0, tries = 0; i < ambientCount && tries < 8000; tries++) {
    const p = [6 + rng.gauss() * 7.5, rng.gauss() * 5.5, -3 + rng.gauss() * 7];
    // Keep the left third (title space) sparse.
    if (p[0] < 1.5 && (p[2] > -8 || rng.next() < 0.7)) continue;
    if (addNode(p, 'ambient', 1.2)) i++;
  }

  // ---------------------------------------------------------------- edges --
  const N = nodes.length;
  const dist = (i, j) => v3.dist(nodes[i].p, nodes[j].p);
  const edgeKey = (i, j) => (i < j ? `${i}:${j}` : `${j}:${i}`);
  const edges = [];
  const edgeSet = new Set();
  const degree = new Array(N).fill(0);
  const adjacency = Array.from({ length: N }, () => []);

  const addEdge = (i, j, detail = false) => {
    if (i === j || edgeSet.has(edgeKey(i, j))) return false;
    edgeSet.add(edgeKey(i, j));
    const e = { a: i, b: j, len: dist(i, j), detail };
    edges.push(e);
    degree[i]++;
    degree[j]++;
    if (!detail) {
      adjacency[i].push({ to: j, edge: e });
      adjacency[j].push({ to: i, edge: e });
    }
    return true;
  };

  const sortedNeighbours = nodes.map((_, i) =>
    nodes
      .map((__, j) => ({ j, d: dist(i, j) }))
      .filter((x) => x.j !== i)
      .sort((x, y) => x.d - y.d),
  );

  // Strand continuity.
  for (let si = 0; si < STRANDS.length; si++) {
    const members = nodes
      .map((n, i) => ({ i, t: n.strandT }))
      .filter((x) => nodes[x.i].strand === si)
      .sort((a, b) => a.t - b.t);
    for (let k = 1; k < members.length; k++) {
      if (dist(members[k - 1].i, members[k].i) < 6.5) addEdge(members[k - 1].i, members[k].i);
    }
  }

  // Primary k-nearest links.
  for (let i = 0; i < N; i++) {
    let made = 0;
    for (const { j, d } of sortedNeighbours[i]) {
      if (made >= 2 || d > 4.6) break;
      if (degree[i] >= 5 || degree[j] >= 6) continue;
      if (addEdge(i, j)) made++;
    }
  }

  // Seeds connect among themselves first (the 0–3 s beat).
  const seeds = nodes.map((n, i) => (n.kind === 'seed' ? i : -1)).filter((i) => i >= 0);
  for (let k = 0; k < seeds.length; k++) {
    const others = seeds.filter((s) => s !== seeds[k]).sort((x, y) => dist(seeds[k], x) - dist(seeds[k], y));
    addEdge(seeds[k], others[0]);
    if (k % 2 === 0 && others[1] !== undefined) addEdge(seeds[k], others[1]);
  }

  // Guarantee connectivity to the seeds (Prim-style: link unreached nodes to
  // their nearest reached neighbour), so every node gets a reveal time.
  const reached = new Set();
  const flood = () => {
    const stack = [...seeds];
    reached.clear();
    while (stack.length) {
      const i = stack.pop();
      if (reached.has(i)) continue;
      reached.add(i);
      for (const { to } of adjacency[i]) if (!reached.has(to)) stack.push(to);
    }
  };
  flood();
  while (reached.size < N) {
    let best = null;
    for (let i = 0; i < N; i++) {
      if (reached.has(i)) continue;
      for (const r of reached) {
        const d = dist(i, r);
        if (!best || d < best.d) best = { i, r, d };
      }
    }
    addEdge(best.i, best.r);
    flood();
  }

  // Detail layer: extra short links that make the 11–14 s web more intricate.
  for (let i = 0; i < N; i++) {
    for (const { j, d } of sortedNeighbours[i].slice(2, 7)) {
      if (d > 3.5 || degree[i] >= 7 || degree[j] >= 7) continue;
      if (rng.next() < 0.38) addEdge(i, j, true);
    }
  }

  // --------------------------------------------------------------- timing --
  // Dijkstra over primary links from the seeds; edge cost ~ travel time.
  const arrival = new Array(N).fill(Infinity);
  const parentEdge = new Array(N).fill(null);
  seeds.forEach((s) => (arrival[s] = 0));
  const done = new Array(N).fill(false);
  for (let iter = 0; iter < N; iter++) {
    let u = -1;
    for (let i = 0; i < N; i++) if (!done[i] && (u < 0 || arrival[i] < arrival[u])) u = i;
    if (u < 0 || arrival[u] === Infinity) break;
    done[u] = true;
    for (const { to, edge } of adjacency[u]) {
      const c = arrival[u] + 0.35 + edge.len * 0.16;
      if (c < arrival[to]) {
        arrival[to] = c;
        parentEdge[to] = edge;
      }
    }
  }
  const maxArrival = Math.max(...arrival.filter((a) => Number.isFinite(a)));

  // Map arrival order onto the 2.0–10.4 s window (non-seeds).
  nodes.forEach((n, i) => {
    if (n.kind === 'seed') {
      n.appear = 0;
      n.vanish = 99;
      return;
    }
    const a = arrival[i] / maxArrival;
    n.appear = 2.0 + 8.4 * Math.pow(a, 0.9) + rng.range(-0.08, 0.08);
  });
  const nonSeedAppear = nodes.filter((n) => n.kind !== 'seed').map((n) => n.appear);
  const minA = Math.min(...nonSeedAppear);
  const maxA = Math.max(...nonSeedAppear);
  nodes.forEach((n) => {
    if (n.kind === 'seed') return;
    const order = (n.appear - minA) / Math.max(1e-6, maxA - minA); // 0 = earliest
    // Reverse order: last to appear is first to go. 13.3 s → 14.45 s start.
    n.vanish = 13.3 + 1.15 * (1 - order) + rng.range(-0.04, 0.04);
  });

  edges.forEach((e, idx) => {
    let { a, b } = e;
    // Orient each edge from the earlier node to the later one.
    if (nodes[a].appear > nodes[b].appear) [a, b] = [b, a];
    e.a = a;
    e.b = b;
    const A = nodes[a], B = nodes[b];
    const seedSeed = A.kind === 'seed' && B.kind === 'seed';

    if (seedSeed) {
      e.growStart = 0.35 + (idx % 5) * 0.28;
      e.growDur = 1.5;
      e.retractStart = 14.0 + (idx % 3) * 0.1;
      e.retractDur = 0.65;
    } else if (e.detail) {
      e.growStart = rng.range(9.9, 11.7);
      e.growDur = clamp(0.45 + e.len * 0.12, 0.6, 1.1);
      const latest = Math.min(A.vanish, B.vanish) - 0.45;
      e.retractStart = Math.min(rng.range(12.8, 13.5), latest);
      e.retractDur = 0.5;
    } else {
      const span = B.appear - A.appear;
      e.growDur = clamp(span, 0.55, 1.5);
      e.growStart = Math.max(A.appear + 0.05, B.appear - e.growDur);
      // Retract from B back toward A as B fades out.
      e.retractStart = B.vanish - 0.05;
      const untilA = A.kind === 'seed' ? 14.9 - e.retractStart : A.vanish - e.retractStart + 0.25;
      e.retractDur = clamp(untilA, 0.35, 0.8);
    }
    // Everything must be fully gone before the loop point.
    if (e.retractStart + e.retractDur > 14.92) e.retractStart = 14.92 - e.retractDur;
    e.tree = parentEdge[b] === e;
  });

  // Node visual attributes.
  nodes.forEach((n, i) => {
    const focal = Math.exp(-Math.pow(v3.dist(n.p, F), 2) / (2 * 3.4 * 3.4));
    n.focal = focal;
    n.hub = n.kind === 'seed' || (degree[i] >= 5 && rng.next() < 0.6) || rng.next() < 0.06;
    n.size = n.kind === 'seed' ? 0.13 : n.hub ? rng.range(0.1, 0.14) : rng.range(0.045, 0.075);
    n.freq = rng.int(1, 3); // integer cycles per loop => periodic
    n.phase = rng.next();
    n.pulseAmp = rng.range(0.15, 0.5);
    n.hue = rng.next();
  });

  edges.forEach((e) => {
    e.focal = Math.exp(-Math.pow(v3.dist(v3.lerp(nodes[e.a].p, nodes[e.b].p, 0.5), F), 2) / (2 * 3.2 * 3.2));
    e.hue = rng.next();
    e.flowCycles = rng.int(3, 6);
  });

  // --------------------------------------------------------------- pulses --
  const pulses = [];
  edges.forEach((e, ei) => {
    const count = e.detail ? (rng.next() < 0.35 ? 1 : 0) : rng.next() < 0.22 ? 2 : rng.next() < 0.75 ? 1 : 0;
    for (let k = 0; k < Math.round(count * Math.min(density, 1.6)); k++) {
      const cycles = rng.int(2, 5);
      const cycleSec = 15 / cycles;
      const travelSec = clamp(0.55 + e.len * 0.22, 0.7, 2.2);
      pulses.push({
        edge: ei,
        cycles,
        offset: rng.next(),
        travel: clamp(travelSec / cycleSec, 0.1, 0.8),
        dir: rng.next() < 0.5 ? 1 : -1,
        hue: rng.next(),
        size: rng.range(0.04, 0.065),
      });
    }
  });

  // ----------------------------------------------------------------- dust --
  const dust = [];
  const dustCount = Math.round(1500 * density);
  for (let i = 0; i < dustCount; i++) {
    const p = [rng.range(-34, 38), rng.range(-20, 20), rng.range(-48, 20)];
    dust.push({
      p,
      size: rng.range(0.018, 0.05),
      bright: Math.pow(rng.next(), 2.2) * 0.9 + 0.1,
      freq: rng.int(1, 2),
      phase: rng.next(),
      amp: [rng.range(0.2, 1.1), rng.range(0.2, 0.9), rng.range(0.2, 1.1)],
      hue: rng.next(),
    });
  }

  // ----------------------------------------------------------------- haze --
  const haze = [
    { p: [F[0] + 0.5, F[1], F[2] - 4], size: 16, tint: 'navy', amount: 1.0 },
    { p: [F[0] + 3, F[1] + 2, F[2] - 9], size: 22, tint: 'navy', amount: 0.8 },
    { p: [F[0] - 1, F[1] - 1, F[2] - 1], size: 9, tint: 'cyan', amount: 0.35 },
    { p: [F[0] + 1.5, F[1] + 0.5, F[2]], size: 8, tint: 'violet', amount: 0.55, focal: 1 },
    { p: [F[0] - 2, F[1] - 1.5, F[2] + 1], size: 6, tint: 'magenta', amount: 0.3, focal: 1 },
    { p: [F[0] + 8, F[1] - 3, F[2] - 12], size: 20, tint: 'violet', amount: 0.35 },
  ];

  return { nodes, edges, pulses, dust, haze, stats: { nodes: N, edges: edges.length, pulses: pulses.length, dust: dust.length } };
}
