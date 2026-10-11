# Liquid Morph — procedural liquid-chrome loop for stock video

This project renders a 15-second, seamlessly looping abstract motion graphic: a liquid-chrome mass that emerges from darkness, stretches into tendrils, fuses into a sculptural form, flows with oil-slick iridescence, sheds droplets and re-forms into its opening silhouette.

Everything is procedural (Three.js + GLSL). There are no textures, images, fonts, external APIs or reference footage. The pipeline renders the frames deterministically and encodes a 3840×2160, 30 fps, H.264/yuv420p MP4 with no audio track.

## Quick start

```bash
npm install
npm run dev            # interactive preview → http://localhost:5173
npm test               # timeline tests (loop closure, continuity, framing)
npm run check          # headless smoke test of the preview (console/shader errors + screenshot)

npm run export:preview # 1280×720 render → encode → validate (fast check of motion)
npm run export:final   # 3840×2160 render → encode → validate (delivery file)
```

Outputs are written to `output/`, which is git-ignored:

| File | What it is |
|---|---|
| `output/frames-4k/frame_00000.png … frame_00449.png` | final frames (lossless PNG) |
| `output/liquid-morph-4k.mp4` | the delivery video |
| `output/liquid-morph-4k.qc.json` | validation and QC report |
| `output/frames-preview/`, `output/liquid-morph-preview.mp4` | the 720p preview equivalents |

### Requirements

- Node.js 18+ (tested with Node 22).
- FFmpeg and ffprobe on `PATH`, built with libx264. These are only needed for encoding and validation. If FFmpeg is missing, the frame render still finishes, and the encode step tells you how to install it. Rendered frames are kept.
- A Chromium build for headless rendering. `playwright-core` 1.56.1 expects Playwright's Chromium build 1194. Install it with `npx playwright-core install chromium`, or point at any recent Chrome or Chromium with `--chromium /path/to/chrome` or `CHROMIUM_PATH=...`.

## Interactive preview

`npm run dev` opens a letterboxed 16:9 view that plays the same timeline as the exporter.

| Key | Action |
|---|---|
| Space | play / pause |
| ← / → | step one frame (1/30 s) |
| 1–5 | jump to scene A–E |
| Q | toggle adaptive resolution / full resolution |
| H | toggle the info overlay (preview only; never in exported frames) |

The preview adapts its render scale (0.35–1.0×) to hold its target frame rate on phones and weak GPUs. That adaptation only affects the live view. The export profiles are fixed.

## Rendering the final video

```bash
npm run render:final     # 450 PNG frames at 3840×2160
npm run encode:final     # → output/liquid-morph-4k.mp4
npm run validate:final   # spec + visual QC; exits non-zero on any failure
```

`render-frames.js` options:

| Option | Effect |
|---|---|
| `--gpu` | Use the hardware GPU instead of SwiftShader software rendering. Use it on any machine with a real GPU; it is orders of magnitude faster. |
| `--frames 0,225,449` / `--start 100 --end 200` | Render particular frames or a range (`--end` is exclusive). |
| `--force` | Re-render frames that already exist. |
| `--tile-rows N` | Split each frame into N strips per draw. Raise it if a GPU watchdog resets the context. |
| `--chromium PATH` | Browser executable to use. |

**Resuming.** Each frame is written to disk as soon as it is rendered (atomically, through a `.tmp` file and a rename). Interrupting with Ctrl-C finishes the current frame and exits. Running the same command again renders only the frames that are missing or incomplete. Memory use stays flat, because no more than one frame is held at a time.

**Speed.** Measured in a 4-core cloud container with no GPU (SwiftShader):

| Profile | Time per frame | Full 450 frames |
|---|---|---|
| 720p preview (adaptive AA) | ≈1.5–2 s | ≈13 min |
| 4K final (adaptive AA) | ≈12–18 s | ≈1.5–2 h |

A desktop GPU with `--gpu` should take well under a second per 4K frame.

The final profile never lowers its resolution or frame rate to save time. If a machine is too slow, the render just takes longer, and it can be stopped and resumed. `--aa 1` is available and prints a warning when it is below the final profile.

## How it works

```
src/config.js      timeline (15 s × 30 fps = 450 frames), render profiles, look constants
src/animation.js   deterministic timeline: keyframed liquid states → periodic Hermite spline
src/shaders.js     GLSL raymarcher: SDF liquid, studio environment, chrome + iridescence
src/liquid.js      Three.js RawShaderMaterial on a full-screen quad; timeline → uniforms
src/renderer.js    WebGLRenderer wrapper: shader error capture, tiled (scissor) rendering
src/main.js        interactive preview (adaptive resolution, keyboard scrubbing)
src/export.js      headless export entry: renderFrame(i) → PNG
render.html        page loaded by the exporter
scripts/render-frames.js   Vite + headless Chromium → PNG frames (resumable, progress/ETA)
scripts/encode-video.js    FFmpeg → H.264 High, yuv420p, BT.709, 30 fps CFR, no audio
scripts/validate-video.js  ffprobe spec checks + luma QC (black frames, flicker, jumps, loop seam)
scripts/test-timeline.js   GPU-free tests of the timeline
scripts/check-preview.js   dev-server + browser smoke test
```

### Liquid geometry

The liquid is a signed distance field built from eight capsule "lobes" that are combined with a polynomial smooth-minimum. Because it is a distance field rather than a mesh, lobes really merge, form necks and pinch off into separate droplets. That change of topology is what sells the liquid. Displaced spheres can't do it.

The surface gets three further layers:

- a domain warp,
- three large flowing sine waves,
- fine ripples.

All of them use integer harmonics of the loop phase.

### Timeline

`animation.js` defines seven art-directed keyframe states:

| Time | State |
|---|---|
| 0.0 s | seed drop |
| 2.8 s | expanding mass |
| 5.4 s | two tendrils |
| 7.1 s | four gathering lobes |
| 8.7 s | fused sculpture |
| 11.0 s | iridescent ring-mass |
| 13.3 s | droplets |

Each state also carries five look parameters:

- surface tension (the blend radius)
- wave amplitude
- ripple amplitude
- iridescence strength
- key-light level

The states are joined by a periodic cubic Hermite spline that takes timing into account, so motion is C¹-continuous everywhere, including across the loop point. Small per-lobe secondary motion, the object's sway and the camera's orbit and dolly are all periodic in the loop phase. As a result, `sceneAt(15) === sceneAt(0)` exactly, and the cut from frame 449 back to frame 0 is just another frame step. `npm test` asserts this.

### Material and lighting

The chrome uses Schlick Fresnel with a silver F0. It reflects a procedural studio made of:

- a warm key softbox
- a cool fill strip
- a back panel
- cyan and violet rim strips
- a champagne top strip
- a cyclorama horizon band and floor bounce

Other shading features:

- **Inter-reflections.** One bounce of self-reflection gives chrome reflecting chrome.
- **Cavity occlusion.** This darkens the folds.
- **Oil-slick iridescence.** A restrained palette (cyan → electric blue → violet → magenta → champagne) travels across the surface over the loop.

During the emergence the key and fill lights are low while the rim strips stay on, so thin highlights reveal the form out of the dark.

### Image quality

- **Anti-aliasing.** Each pixel takes one sample. Four more rotated-grid samples are added wherever the 2×2 pixel quad shows contrast, such as at silhouettes and highlight edges. Rays that graze the silhouette are blended by their estimated pixel coverage.
- **Tone and output.** ACES filmic tone mapping prevents clipped highlights. The output is converted to sRGB.
- **Banding.** A static (non-animated, so flicker-free) ±0.5/255 dither prevents banding in the near-black background.
- **Encoding.** The encoder converts explicitly to BT.709 limited range and tags the stream accordingly. It uses `aq-mode=3` to preserve dark gradients and puts a keyframe every second.

## Delivery checklist (as validated by `validate-video.js`)

- MP4 / H.264 High profile (level 5.1 at 4K), `yuv420p`, progressive
- 3840×2160 (16:9), 30/1 fps constant frame rate
- exactly 450 frames = 15.000 s
- no audio, subtitle or data streams, and no container metadata
- no black frames, no brightness flicker, no abrupt frame jumps
- loop seam (frame 449 → frame 0) within normal frame-to-frame motion

Nothing but the shader output is drawn, so there is no text, logo, watermark or UI in the frames. The preview overlay exists only in the interactive page.

Meeting these technical specs does not guarantee acceptance. Adobe Stock reviews every submission.
