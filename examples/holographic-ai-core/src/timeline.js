// Deterministic timeline. computeState(t) is a pure function of time and
// config: no clocks, no accumulated state, so any frame can be rendered in any
// order (which is what makes parallel, frame-accurate export possible).
//
// Two time bases:
//   tp  = t mod T        periodic time, drives everything in the loop
//   tc  = t * 16 / T     "canonical" story seconds (story beats are authored
//                        against a 16 s timeline and scale with loopDuration)
// In 'story' mode a build-up overlay is applied on top of the periodic system.
// Every build envelope reaches exactly 1 and every camera offset exactly 0
// before t = T, so story(T) === loop(0): the story hands off seamlessly into
// the loop.

export const TAU = Math.PI * 2;
export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const smoothstep = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const smootherstep = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * t * (t * (t * 6 - 15) + 10);
};
export const easeOutCubic = (x) => 1 - Math.pow(1 - clamp01(x), 3);
// Critically damped settle: starts fast, arrives with zero velocity.
export const settle = (x) => {
  const t = clamp01(x);
  const w = 7;
  return (1 - (1 + w * t) * Math.exp(-w * t)) / (1 - (1 + w) * Math.exp(-w));
};
// Smooth window: 0 outside [a,b], sin^2 lobe inside (C1 at both ends).
export const windowBump = (x, a, b) => {
  if (x <= a || x >= b) return 0;
  const s = Math.sin(Math.PI * (x - a) / (b - a));
  return s * s;
};
// Periodic bump (von Mises), equal at u=0 and u=1 by construction.
export const periodicBump = (u, center, kappa) => Math.exp(kappa * (Math.cos(TAU * (u - center)) - 1));

const STORY_END = 16; // canonical seconds

// Canonical (16 s) event times for the periodic system.
export const EVENTS = {
  scans: [6.0, 7.75, 9.5], // start times of sphere scan passes
  scanDuration: 1.5,
  pulseEmit: 10.25, // core releases the energy pulse
  pulseSpeed: 2.4, // world units per canonical second
  pulseWidth: 0.32,
  expandStart: 9.9,
  expandDuration: 3.4,
  lightPeak: 14.6, // lighting reaches its most beautiful state
};

export const RING_LAYOUT = [
  // R: radius, w: axial band width, th: radial thickness, tilt: Euler (deg),
  // turns: base turns per loop, wob: speed-variation amplitude (rad),
  // prec: precession turns per loop around world Y, ticks: etched marks
  { R: 1.24, w: 0.034, th: 0.012, tilt: [72, 0, 18], turns: 1, wob: 0.55, prec: 0, ticks: 0 },
  { R: 1.42, w: 0.05, th: 0.016, tilt: [12, 0, -24], turns: -1, wob: 0.4, prec: 0, ticks: 96 },
  { R: 1.6, w: 0.028, th: 0.011, tilt: [-58, 30, 8], turns: 1, wob: 0.7, prec: 1, ticks: 0 },
  { R: 1.82, w: 0.07, th: 0.014, tilt: [96, 0, -8], turns: -1, wob: 0.3, prec: 0, ticks: 180 },
  { R: 2.05, w: 0.022, th: 0.009, tilt: [28, 50, 34], turns: 1, wob: 0.5, prec: -1, ticks: 0 },
  { R: 2.3, w: 0.016, th: 0.008, tilt: [-30, -20, -40], turns: -1, wob: 0.6, prec: 0, ticks: 360 },
];

export const ORBIT_LAYOUT = [
  // r: radius, tilt: Euler (deg), turns: comet turns per loop (integer)
  { r: 1.13, tilt: [80, 0, -30], turns: 2, phase: 0.1 },
  { r: 1.5, tilt: [22, 0, 40], turns: -1, phase: 0.55 },
  { r: 1.71, tilt: [-40, 10, -12], turns: 1, phase: 0.3 },
  { r: 1.95, tilt: [64, 30, 26], turns: -2, phase: 0.8 },
  { r: 2.18, tilt: [6, 0, -14], turns: 1, phase: 0.05 },
  { r: 2.48, tilt: [-74, -10, 20], turns: -1, phase: 0.42 },
];

function rad(d) {
  return (d * Math.PI) / 180;
}

export function computeState(t, cfg) {
  const T = cfg.loopDuration;
  const story = cfg.mode === 'story';
  const tp = ((t % T) + T) % T;
  const u = tp / T; // loop phase 0..1
  const pc = u * 16; // periodic time in canonical seconds
  const tc = story ? (t * 16) / T : Infinity; // story build time (canonical)

  // ---------------------------------------------------------------- builds
  const b = (a, z) => (story ? smootherstep(a, z, tc) : 1);
  const build = {
    background: story ? 0.25 + 0.75 * smoothstep(0, 6, tc) : 1,
    dust: b(0.2, 4.5),
    orbits: ORBIT_LAYOUT.map((_, i) => b(0.6 + 0.3 * i, 2.8 + 0.3 * i)),
    sphere: b(3.0, 5.0),
    nucleusGlow: b(3.2, 5.2),
    interface: b(5.2, 7.4),
    halo: b(2.0, 6.0),
    // per-ring: assemble progress (0 → 1)
    rings: RING_LAYOUT.map((_, i) => (i === 0 ? b(1.1, 3.0) : b(3.0 + 0.42 * (i - 1), 5.4 + 0.42 * (i - 1)))),
    storyTime: story ? tc : 1e4, // shaders use this for per-particle/per-edge delays
  };

  // ------------------------------------------------- pulse (Scene 4, 10-13s)
  const pAge = pc - EVENTS.pulseEmit;
  const pulseR = Math.max(0, pAge) * EVENTS.pulseSpeed;
  const pulseAmp =
    0.7 * cfg.pulseStrength * (pAge > 0 ? smoothstep(0, 0.3, pAge) * (1 - smoothstep(0.5, 1.9, pAge)) : 0);
  // Core charges up just before release and relaxes after.
  const coreCharge = windowBump(pc, 9.6, 11.2);

  // Ring expansion: expand then contract, delayed outward with radius.
  const ringExpand = RING_LAYOUT.map((r) => {
    const s = EVENTS.expandStart + (r.R - 1.2) * 0.42;
    const x = (pc - s) / EVENTS.expandDuration;
    if (x <= 0 || x >= 1) return 0;
    // sin(2πx)·sin(πx): positive lobe (expand) then negative lobe (contract), C1.
    return 0.055 * cfg.pulseStrength * Math.sin(TAU * x) * Math.sin(Math.PI * x) * (r.R / 1.6);
  });

  // ----------------------------------------------- scan waves (Scene 3)
  let scanFront = 2;
  let scanAmp = 0;
  for (const s of EVENTS.scans) {
    const x = (pc - s) / EVENTS.scanDuration;
    if (x > 0 && x < 1) {
      scanFront = 1.12 - 2.24 * smootherstep(0, 1, x);
      scanAmp = windowBump(x, 0, 1) ** 0.35;
    }
  }

  // ------------------------------------------------------------- lighting
  const light = 0.82 + 0.18 * periodicBump(u, EVENTS.lightPeak / 16, 2.2);

  // --------------------------------------------------------------- rings
  const ringXforms = RING_LAYOUT.map((r, i) => {
    const turns = r.turns * cfg.ringSpeed;
    const spin = TAU * turns * u + cfg.ringEasing * r.wob * Math.sin(TAU * u + i * 1.7);
    const prec = TAU * r.prec * u + 0.06 * cfg.ringEasing * Math.sin(TAU * u + i);
    const p = build.rings[i];
    const assemble = i === 0 ? 1 : settle(p);
    return {
      spin: spin + (1 - assemble) * (i % 2 ? -1.6 : 1.6),
      precession: prec,
      tiltOffset: (1 - assemble) * (0.9 + 0.2 * i),
      scale: (1 + ringExpand[i]) * (1 + 0.38 * (1 - assemble)),
      opacity: i === 0 ? 1 : smoothstep(0, 0.35, p),
      sweep: i === 0 ? p : 1, // angular draw-on (ring 0 materialises around its circumference)
    };
  });

  // ------------------------------------------------------------- nucleus
  const coreAngle = TAU * cfg.coreRotation * u + 0.35 * Math.sin(TAU * u + 0.6);
  const innerAngle = -TAU * cfg.coreRotation * u + 0.25 * Math.sin(TAU * u + 2.1);

  // -------------------------------------------------------------- camera
  const m = cfg.cameraMotion;
  let az = rad(cfg.cameraAzimuth) + m * rad(2.4) * Math.sin(TAU * u);
  let el = rad(cfg.cameraElevation) + m * rad(0.9) * Math.sin(2 * TAU * u);
  // Gentle periodic dolly: closest around the energy-field beat.
  let dist = 1 - m * 0.035 * (0.5 - 0.5 * Math.cos(TAU * u));
  let roll = m * rad(0.35) * Math.sin(TAU * u + 1.1);
  if (story) {
    // Story camera: wide and low-energy at the start, slow controlled dolly-in
    // through Scene 3, settling exactly onto the hero/loop camera by 13 s.
    const e = smootherstep(0.8, 13.0, tc);
    dist *= 1 + m * 0.34 * (1 - e);
    az += m * rad(-15) * (1 - e);
    el += m * rad(6) * (1 - e);
  }

  return {
    t,
    u,
    pc,
    story,
    storyDone: !story || tc >= STORY_END,
    build,
    pulse: { radius: pulseR, amp: pulseAmp, width: EVENTS.pulseWidth, charge: coreCharge },
    scan: { front: scanFront, amp: scanAmp },
    light,
    rings: ringXforms,
    core: { angle: coreAngle, innerAngle },
    camera: { az, el, dist, roll },
  };
}
