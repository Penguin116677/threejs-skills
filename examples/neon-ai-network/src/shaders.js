// GLSL for every layer. All per-element animation is evaluated on the GPU from
// a single story-time uniform plus static per-instance attributes, so a frame
// is a pure function of time — no state is carried from frame to frame.
//
// Resolution independence: sizes in pixels are authored for 1080p and scaled by
// uResScale (= output height / 1080), so the 1080p preview and the native 4K
// render have the same look.

export const COMMON = /* glsl */ `
  #define TAU 6.28318530718
  #define PI 3.14159265359
  uniform float uTime;        // story seconds, 0..15
  uniform vec2  uResolution;  // output pixels
  uniform float uResScale;    // height / 1080
  uniform float uGlow;
  uniform float uEnergy;
  uniform float uFocalWin;
  uniform float uTrail;
  uniform float uSeedLevel;
  uniform float uFocus;       // focus distance (world units)
  uniform float uDof;
  uniform vec3  uCyan;
  uniform vec3  uViolet;
  uniform vec3  uMagenta;
  uniform vec3  uNavy;

  float sstep(float a, float b, float x) {
    float t = clamp((x - a) / (b - a), 0.0, 1.0);
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
  }
  float easeInOutCubic(float x) {
    return x < 0.5 ? 4.0 * x * x * x : 1.0 - pow(-2.0 * x + 2.0, 3.0) * 0.5;
  }
  // Circle of confusion proxy: 0 in focus, grows in front of / behind focus.
  float coc(float dist) {
    return min(uDof * abs(dist - uFocus) / max(dist, 0.001) * 1.6, 3.5);
  }
  // Atmospheric falloff toward black with distance, and a soft fade for
  // anything very close to the lens (prevents near-plane popping).
  float depthFade(float dist) {
    float fog = exp(-max(dist - 20.0, 0.0) * 0.05);
    float nearF = smoothstep(1.2, 4.0, dist);
    return fog * nearF;
  }
  vec3 accentColor(float hue) {
    return hue < 0.62 ? uViolet : uMagenta;
  }
  // Growth state of an edge: visible span [0, head] along a->b.
  float edgeHead(vec4 timing) {
    float grow = easeInOutCubic(clamp((uTime - timing.x) / timing.y, 0.0, 1.0));
    float retract = easeInOutCubic(clamp((uTime - timing.z) / timing.w, 0.0, 1.0));
    return grow * (1.0 - retract);
  }
  // Pixels per world unit at a given view distance.
  float pxPerUnit(float dist) {
    return projectionMatrix[1][1] * uResolution.y * 0.5 / max(dist, 0.001);
  }
`;

// ------------------------------------------------------------- background --
export const backgroundShader = {
  vertex: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = position.xy * 0.5 + 0.5;
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `,
  fragment: /* glsl */ `
    uniform vec3 uNavy;
    uniform vec3 uBlack;
    uniform vec3 uViolet;
    uniform float uEnergy;
    uniform float uFocalWin;
    uniform vec2 uResolution;
    uniform vec2 uGlowCenter;
    varying vec2 vUv;
    void main() {
      vec2 p = vUv - uGlowCenter;
      p.x *= uResolution.x / uResolution.y;
      float r = length(p);
      float navyGlow = exp(-r * r * 2.2);
      float lower = smoothstep(0.9, 0.0, vUv.y) * 0.25;
      vec3 col = uBlack;
      col += uNavy * (navyGlow * (0.3 + 0.14 * uEnergy) + lower * 0.15);
      col += uViolet * exp(-r * r * 6.0) * 0.035 * uFocalWin;
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

// ------------------------------------------------------------------ edges --
// Screen-space expanded ribbons: constant pixel width (scaled for resolution),
// soft Gaussian cross-section (self-antialiased), clipped to the near plane.
export const edgeShader = {
  vertex: /* glsl */ `
    ${COMMON}
    uniform float uNear;
    attribute vec3 iA;
    attribute vec3 iB;
    attribute vec4 iTiming;   // growStart, growDur, retractStart, retractDur
    attribute vec4 iInfo;     // focal, detail, hue, flowCycles
    attribute float iLen;
    varying float vSide;
    varying float vAlong;
    varying float vLenPx;
    varying float vHalfW;
    varying float vCoreW;
    varying float vIntensity;
    varying float vHead;
    varying float vGrowing;
    varying vec3 vColor;
    varying float vAccent;
    varying float vFlowPhase;
    varying float vLenWorld;

    void main() {
      float head = edgeHead(iTiming);
      if (head <= 0.0005) { gl_Position = vec4(0.0, 0.0, 2.0, 1.0); return; }

      vec4 va = viewMatrix * vec4(iA, 1.0);
      vec4 vb = viewMatrix * vec4(mix(iA, iB, head), 1.0);
      float tA = 0.0, tB = 1.0;
      float zLim = -uNear * 1.5;
      if (va.z > zLim && vb.z > zLim) { gl_Position = vec4(0.0, 0.0, 2.0, 1.0); return; }
      if (va.z > zLim) { float k = (va.z - zLim) / (va.z - vb.z); va = mix(va, vb, k); tA = k; }
      if (vb.z > zLim) { float k = (vb.z - zLim) / (vb.z - va.z); vb = mix(vb, va, k); tB = 1.0 - k; }

      vec4 ca = projectionMatrix * va;
      vec4 cb = projectionMatrix * vb;
      vec2 sa = ca.xy / ca.w * uResolution * 0.5;
      vec2 sb = cb.xy / cb.w * uResolution * 0.5;
      vec2 d = sb - sa;
      float L = length(d);
      vec2 dir = L > 1e-4 ? d / L : vec2(1.0, 0.0);
      vec2 nrm = vec2(-dir.y, dir.x);

      float along = position.y;
      vec4 v = mix(va, vb, along);
      vec4 c = along < 0.5 ? ca : cb;
      float dist = -v.z;
      float blur = coc(dist);

      float coreW = 0.55 * uResScale * (1.0 + blur * 1.8);  // core half-width (px)
      float minW = 0.7 * uResScale;
      float energy = 1.0 / (1.0 + blur * 1.8);
      if (coreW < minW) { energy *= coreW / minW; coreW = minW; }
      float halfW = coreW * 5.0;                            // quad half-width incl. halo

      c.xy += nrm * position.x * halfW / (uResolution * 0.5) * c.w;
      gl_Position = c;

      float focal = iInfo.x;
      float detail = iInfo.y;
      float accent = focal * uFocalWin;
      vColor = mix(uCyan, accentColor(iInfo.z), clamp(accent * 1.15, 0.0, 0.9));
      float variety = 0.45 + 0.9 * fract(iInfo.z * 7.31);
      float base = mix(0.34, 0.2, detail) * variety * (0.6 + 0.4 * uEnergy);
      // Fade in/out as the visible length approaches zero (no tip popping).
      vIntensity = base * energy * depthFade(dist) * uGlow * smoothstep(0.0, 0.12, head);
      vSide = position.x;
      vAlong = mix(tA, tB, along);
      vLenPx = L / max(tB - tA, 1e-4);
      vHalfW = halfW;
      vCoreW = coreW;
      vHead = head;
      vGrowing = 1.0 - step(iTiming.x + iTiming.y, uTime) * (1.0 - step(iTiming.z, uTime));
      // Energy flow bands travelling along focal edges (integer cycles/loop).
      vAccent = accent;
      vFlowPhase = iInfo.w * uTime / 15.0;
      vLenWorld = iLen * head;
    }
  `,
  fragment: /* glsl */ `
    uniform float uResScale;
    uniform float uFocalWin;
    varying float vSide;
    varying float vAlong;
    varying float vLenPx;
    varying float vHalfW;
    varying float vCoreW;
    varying float vIntensity;
    varying float vHead;
    varying float vGrowing;
    varying vec3 vColor;
    varying float vAccent;
    varying float vFlowPhase;
    varying float vLenWorld;
    #define TAU 6.28318530718

    void main() {
      float px = abs(vSide) * vHalfW;
      float core = exp(-px * px / (vCoreW * vCoreW));
      float halo = 0.09 * exp(-pow(abs(vSide) * 2.3, 2.0));
      float profile = core + halo;

      // Distance (px) to the growing tip; soft taper + bright leading spark.
      float toTip = (1.0 - vAlong) * vLenPx;
      float taper = smoothstep(0.0, 6.0 * uResScale, toTip);
      float spark = vGrowing * exp(-pow(toTip / (10.0 * uResScale), 2.0)) * 2.2;

      float flow = 0.0;
      if (vAccent > 0.002) {
        float ph = vAlong * vLenWorld / 2.4 - vFlowPhase;
        flow = pow(0.5 + 0.5 * sin(TAU * ph), 8.0) * 2.2 * vAccent;
      }

      float I = vIntensity * (profile * taper * (1.0 + flow) + spark * core);
      vec3 col = mix(vColor, vec3(1.0), clamp(core * 0.25 + spark * 0.3, 0.0, 0.6));
      gl_FragColor = vec4(col * I, 1.0);
    }
  `,
};

// ------------------------------------------------------------------ nodes --
export const nodeShader = {
  vertex: /* glsl */ `
    ${COMMON}
    attribute vec3 iPos;
    attribute vec4 iTiming;  // appear, vanish, isSeed, hub
    attribute vec4 iInfo;    // size, freq, phase, focal
    attribute vec2 iExtra;   // pulseAmp, hue
    varying vec2 vUv;
    varying float vIntensity;
    varying float vBlur;
    varying float vHub;
    varying vec3 vColor;

    void main() {
      float appear = iTiming.x;
      float vanish = iTiming.y;
      float vis;
      if (iTiming.z > 0.5) {
        vis = uSeedLevel;
      } else {
        float fadeIn = sstep(appear - 0.2, appear + 0.45, uTime);
        float ignite = exp(-pow((uTime - appear - 0.25) / 0.32, 2.0)) * 0.55;
        float fadeOut = 1.0 - sstep(vanish, vanish + 0.5, uTime);
        vis = fadeIn * fadeOut * (1.0 + ignite);
      }
      if (vis <= 0.0005) { gl_Position = vec4(0.0, 0.0, 2.0, 1.0); return; }

      float pulse = 1.0 + iExtra.x * sin(TAU * (iInfo.y * uTime / 15.0 + iInfo.z));

      vec4 mv = viewMatrix * vec4(iPos, 1.0);
      float dist = -mv.z;
      if (dist < 0.3) { gl_Position = vec4(0.0, 0.0, 2.0, 1.0); return; }
      float blur = coc(dist);
      float size = iInfo.x * (1.0 + blur * 1.4);
      float energy = 1.0 / pow(1.0 + blur * 1.4, 2.0);
      float rPx = size * pxPerUnit(dist);
      float minPx = 1.6 * uResScale;
      if (rPx < minPx) { float k = minPx / rPx; size *= k; energy /= k * k; }

      float quad = size * 4.0;
      mv.xy += position.xy * quad;
      gl_Position = projectionMatrix * mv;

      float accent = iInfo.w * uFocalWin;
      vColor = mix(uCyan, accentColor(iExtra.y), clamp(accent * 1.1, 0.0, 0.85));
      vIntensity = vis * pulse * energy * depthFade(dist) * uGlow * (iTiming.w > 0.5 ? 0.95 : 0.7);
      vUv = position.xy;
      vBlur = clamp(blur / 1.5, 0.0, 1.0);
      vHub = iTiming.w;
    }
  `,
  fragment: /* glsl */ `
    varying vec2 vUv;
    varying float vIntensity;
    varying float vBlur;
    varying float vHub;
    varying vec3 vColor;

    void main() {
      float r = length(vUv);
      if (r > 1.0) discard;
      // Core radius is 0.25 of the quad (quad = 4 x node size).
      float coreR = mix(0.2, 0.26, vBlur);
      float sharp = exp(-pow(r / (coreR * 0.55), 2.0));
      float disc = smoothstep(coreR, coreR * 0.75, r) * 0.55;  // bokeh disc when defocused
      float core = mix(sharp * 2.0, disc * 0.6, vBlur);
      float halo = exp(-pow(r / 0.36, 2.0)) * 0.09;
      float ring = vHub * (1.0 - vBlur) * exp(-pow((r - 0.5) / 0.02, 2.0)) * 0.08;
      float edgeFade = smoothstep(1.0, 0.7, r);
      vec3 col = mix(vColor, vec3(1.0), exp(-pow(r / 0.07, 2.0)) * 0.65 * (1.0 - vBlur));
      gl_FragColor = vec4(col * vIntensity * (core + halo + ring) * edgeFade, 1.0);
    }
  `,
};

// ----------------------------------------------------------------- pulses --
// Particles travelling along filaments with ease-in-out motion. Because each
// pulse moves along a straight edge, its light trail is exactly the segment
// between where it is now and where it was `lag` seconds ago — drawn as one
// screen-space streak with a round glowing head (stretches when fast, shrinks
// to a dot as it eases in/out).
export const pulseShader = {
  vertex: /* glsl */ `
    ${COMMON}
    uniform float uNear;
    attribute vec3 iA;
    attribute vec3 iB;
    attribute vec4 iTiming;   // edge timing (growth mask)
    attribute vec4 iMotion;   // cycles, offset, travel fraction, direction
    attribute vec4 iInfo;     // unused, hue, focal, size
    varying vec2 vPx;         // fragment position relative to the head (px): x along, y across
    varying float vTailPx;
    varying float vRadius;
    varying float vCoreW;
    varying float vIntensity;
    varying vec3 vColor;

    float pathAt(float u, float dir) {
      float e = easeInOutCubic(clamp(u, 0.0, 1.0));
      return dir < 0.0 ? 1.0 - e : e;
    }

    void main() {
      float travel = iMotion.z;
      float ph = fract(iMotion.x * uTime / 15.0 + iMotion.y);
      if (ph > travel) { gl_Position = vec4(0.0, 0.0, 2.0, 1.0); return; }
      float u = ph / travel;
      float lag = (0.07 + 0.32 * uTrail) * iMotion.x / 15.0;  // trail length in phase units
      float uTail = max(ph - lag, 0.0) / travel;
      float eHead = pathAt(u, iMotion.w);
      float eTail = pathAt(uTail, iMotion.w);

      // Only where the filament currently exists.
      float head = edgeHead(iTiming);
      float mask = smoothstep(head + 0.001, head - 0.04, max(eHead, eTail));
      float alpha = pow(sin(PI * u), 0.7) * mask;
      if (alpha <= 0.0005) { gl_Position = vec4(0.0, 0.0, 2.0, 1.0); return; }

      vec4 vh = viewMatrix * vec4(mix(iA, iB, eHead), 1.0);
      vec4 vt = viewMatrix * vec4(mix(iA, iB, eTail), 1.0);
      float dist = -vh.z;
      if (dist < 0.4 || -vt.z < uNear * 2.0) { gl_Position = vec4(0.0, 0.0, 2.0, 1.0); return; }

      float blur = coc(dist);
      float energy = 1.0 / pow(1.0 + blur * 1.4, 2.0);
      float rPx = iInfo.w * (1.0 + blur * 1.4) * pxPerUnit(dist);
      float minPx = 1.3 * uResScale;
      if (rPx < minPx) { energy *= (rPx / minPx) * (rPx / minPx); rPx = minPx; }
      float quadR = rPx * 3.0;

      vec4 ch = projectionMatrix * vh;
      vec4 ct = projectionMatrix * vt;
      vec2 sh = ch.xy / ch.w * uResolution * 0.5;
      vec2 st = ct.xy / ct.w * uResolution * 0.5;
      vec2 d = sh - st;
      float L = length(d);
      vec2 dir = L > 1e-3 ? d / L : vec2(1.0, 0.0);
      vec2 nrm = vec2(-dir.y, dir.x);

      // position.x: 0 = tail end, 1 = head end; position.y: -1..1 across.
      bool atHead = position.x > 0.5;
      vec4 c = atHead ? ch : ct;
      float alongPx = atHead ? quadR : -(L + quadR);
      vec2 off = dir * (atHead ? quadR : -quadR) + nrm * position.y * quadR;
      c.xy += off / (uResolution * 0.5) * c.w;
      gl_Position = c;

      vPx = vec2(alongPx, position.y * quadR);
      vTailPx = L;
      vRadius = rPx;
      vCoreW = max(0.6 * uResScale, rPx * 0.35);
      float accent = iInfo.z * uFocalWin;
      vColor = mix(uCyan, accentColor(iInfo.y), clamp(accent * 1.4, 0.0, 1.0));
      vIntensity = alpha * energy * depthFade(dist) * uGlow * (0.7 + 0.3 * uEnergy);
    }
  `,
  fragment: /* glsl */ `
    uniform float uTrail;
    varying vec2 vPx;
    varying float vTailPx;
    varying float vRadius;
    varying float vCoreW;
    varying float vIntensity;
    varying vec3 vColor;
    void main() {
      float r = length(vPx) / vRadius;
      float headCore = exp(-r * r / (0.55 * 0.55)) * 3.2;
      float headHalo = exp(-r * r / (1.6 * 1.6)) * 0.4;
      float streak = 0.0;
      if (vTailPx > 0.5 && vPx.x < 0.0) {
        float k = clamp(1.0 + vPx.x / vTailPx, 0.0, 1.0);     // 0 at tail, 1 at head
        float across = exp(-vPx.y * vPx.y / (vCoreW * vCoreW));
        streak = across * k * k * smoothstep(0.0, 0.15, k) * (1.2 + 1.0 * uTrail);
      }
      vec3 col = mix(vColor, vec3(1.0), clamp(exp(-r * r / 0.12) * 0.6, 0.0, 0.6));
      gl_FragColor = vec4(col * vIntensity * (headCore + headHalo + streak), 1.0);
    }
  `,
};

// ------------------------------------------------------------------- dust --
export const dustShader = {
  vertex: /* glsl */ `
    ${COMMON}
    attribute vec3 iPos;
    attribute vec4 iInfo;   // size, brightness, freq, phase
    attribute vec4 iAmp;    // drift amplitude xyz, hue
    varying vec2 vUv;
    varying float vIntensity;
    varying float vBlur;
    varying vec3 vColor;

    void main() {
      float ph = TAU * (iInfo.z * uTime / 15.0 + iInfo.w);
      vec3 p = iPos + iAmp.xyz * vec3(sin(ph), sin(ph * 1.0 + 1.7 + iInfo.w * 3.0), cos(ph + 0.6));
      vec4 mv = viewMatrix * vec4(p, 1.0);
      float dist = -mv.z;
      if (dist < 0.3) { gl_Position = vec4(0.0, 0.0, 2.0, 1.0); return; }
      float blur = coc(dist);
      float size = iInfo.x * (1.0 + blur * 1.6);
      float energy = 1.0 / pow(1.0 + blur * 1.6, 2.0);
      float rPx = size * pxPerUnit(dist);
      float minPx = 1.1 * uResScale;
      if (rPx < minPx) { float s = minPx / rPx; size *= s; energy /= s * s; }
      float maxPx = 70.0 * uResScale;
      if (rPx > maxPx) { size *= maxPx / rPx; }

      mv.xy += position.xy * size * 2.0;
      gl_Position = projectionMatrix * mv;

      float twinkle = 0.8 + 0.2 * sin(TAU * (2.0 * uTime / 15.0 + iInfo.w * 5.0));
      vColor = iAmp.w < 0.78 ? uCyan : (iAmp.w < 0.93 ? uViolet : uMagenta);
      vIntensity = iInfo.y * twinkle * energy * depthFade(dist) * uGlow * (0.55 + 0.45 * uEnergy) * 0.6;
      vUv = position.xy;
      vBlur = clamp(blur / 1.2, 0.0, 1.0);
    }
  `,
  fragment: /* glsl */ `
    varying vec2 vUv;
    varying float vIntensity;
    varying float vBlur;
    varying vec3 vColor;
    void main() {
      float r = length(vUv);
      if (r > 1.0) discard;
      float sharp = exp(-pow(r / 0.28, 2.0)) * 1.6;
      float disc = smoothstep(0.5, 0.4, r) * (0.55 + 0.45 * smoothstep(0.25, 0.48, r)) * 0.3;
      float v = mix(sharp, disc, vBlur);
      gl_FragColor = vec4(vColor * vIntensity * v, 1.0);
    }
  `,
};

// ------------------------------------------------------------------- haze --
export const hazeShader = {
  vertex: /* glsl */ `
    ${COMMON}
    attribute vec3 iPos;
    attribute vec4 iInfo;   // size, amount, focalOnly, unused
    attribute vec3 iColor;
    varying vec2 vUv;
    varying float vIntensity;
    varying vec3 vColor;
    void main() {
      float th = TAU * uTime / 15.0;
      vec3 p = iPos + vec3(sin(th + iPos.x), cos(th + iPos.y) * 0.6, 0.0) * 0.8;
      vec4 mv = viewMatrix * vec4(p, 1.0);
      mv.xy += position.xy * iInfo.x;
      gl_Position = projectionMatrix * mv;
      float focalGate = mix(1.0, uFocalWin, iInfo.z);
      vIntensity = iInfo.y * focalGate * (0.25 + 0.75 * uEnergy) * smoothstep(0.5, 6.0, -mv.z);
      vColor = iColor;
      vUv = position.xy;
    }
  `,
  fragment: /* glsl */ `
    varying vec2 vUv;
    varying float vIntensity;
    varying vec3 vColor;
    void main() {
      float r2 = dot(vUv, vUv);
      if (r2 > 1.0) discard;
      float v = exp(-r2 * 4.0) * (1.0 - r2);
      gl_FragColor = vec4(vColor * vIntensity * v * 0.06, 1.0);
    }
  `,
};

// ------------------------------------------------------------- final pass --
export const finalShader = {
  uniforms: {
    tDiffuse: { value: null },
    uExposure: { value: 1.0 },
    uCopySpace: { value: 0.55 },
    uVignette: { value: 0.45 },
    uFrame: { value: 0 },
    uResolution: { value: null },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uExposure;
    uniform float uCopySpace;
    uniform float uVignette;
    uniform float uFrame;
    uniform vec2 uResolution;
    varying vec2 vUv;

    // ACES filmic approximation (Narkowicz) — gentle highlight roll-off keeps
    // neon cores from clipping harshly.
    vec3 aces(vec3 x) {
      return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
    }
    vec3 toSRGB(vec3 c) {
      return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
    }
    float hash(vec2 p) {
      p = fract(p * vec2(443.897, 441.423));
      p += dot(p, p.yx + 19.19);
      return fract((p.x + p.y) * p.x);
    }

    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb * uExposure;
      // Title-safe darkening of the left third.
      float copyMask = mix(1.0 - uCopySpace, 1.0, smoothstep(0.06, 0.46, vUv.x));
      c *= copyMask;
      vec2 q = vUv - 0.5;
      q.x *= uResolution.x / uResolution.y;
      c *= 1.0 - uVignette * smoothstep(0.45, 1.15, length(q));
      c = toSRGB(aces(c));
      // Triangular dither (±1 LSB) — prevents 8-bit banding in the dark gradients.
      vec2 fc = gl_FragCoord.xy + vec2(mod(uFrame, 64.0) * 17.0, mod(uFrame, 64.0) * 29.0);
      c += (hash(fc) + hash(fc + 71.3) - 1.0) / 255.0;
      gl_FragColor = vec4(c, 1.0);
    }
  `,
};
