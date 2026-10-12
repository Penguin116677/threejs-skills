// Seeded PRNG (mulberry32). Every random placement in the project goes through
// this so a given seed always produces bit-identical geometry and particles.
export function createRng(seed = 1) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (lo, hi) => lo + (hi - lo) * next(),
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    sign: () => (next() < 0.5 ? -1 : 1),
    // Uniformly distributed unit vector.
    unitVector: () => {
      const z = 2 * next() - 1;
      const phi = 2 * Math.PI * next();
      const s = Math.sqrt(1 - z * z);
      return [s * Math.cos(phi), z, s * Math.sin(phi)];
    },
    gaussian: () => {
      const u = Math.max(next(), 1e-9);
      const v = next();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
  };
}
