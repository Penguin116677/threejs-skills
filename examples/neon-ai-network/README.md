# Neon AI Network — Glowing Digital Connections

An original, fully procedural 15-second neon network loop built with Three.js and custom GLSL. It is designed as a stock-footage motion background, with **native 3840 × 2160 at 30 fps** output, a deterministic frame renderer and an automated QA pass.

> Cyan nodes emerge from darkness, filaments connect them, and the web expands into a layered 3D network. The camera drifts through it while violet and magenta energy flows across a focal cluster. Light trails thicken, then the whole network retracts back to its five seed particles, so the clip loops seamlessly.

There is no text, logo, audio or third-party imagery; everything is generated from code and a seed. The left ~34 % of the frame is kept dark as title / copy space.

## Deliverables

| File | What it is |
|---|---|
| `renders/neon-ai-network_3840x2160_30fps.mp4` | **Final master**: native 4K UHD, H.264 High@5.1, yuv420p, BT.709, 30 fps, 450 frames, 15.000 s, no audio |
| `renders/neon-ai-network_1920x1080_30fps_preview.mp4` | 1080p version (H.264 High@4.2), rendered natively at 1080p, not downscaled |
| `qa/*.md`, `qa/*.json`, `qa/*_sheet.jpg` | QA reports and contact sheets for both renders |
| `index.html` | Interactive preview with transport, scrubbing and look controls |
| `scripts/render.mjs` | Native-resolution offline renderer: PNG sequence, then MP4 |
| `frames/<W>x<H>/frame_0000.png …` | Lossless PNG sequence, produced locally by the renderer (git-ignored: ~5 GB at 4K) |

## Requirements

- Node.js ≥ 18 (developed on 22)
- FFmpeg with `libx264` (`ffmpeg -encoders | grep 264`) for MP4 encoding and QA
- A Chromium for Playwright. `npm install` pulls Playwright; if no browser is present, run `npx playwright install chromium` or pass `--chromium /path/to/chrome`.
- **No GPU is required.** Rendering defaults to SwiftShader (CPU WebGL2). With a GPU, add `--gl gpu` for much faster frames.

```bash
cd examples/neon-ai-network
npm install
```

## Interactive preview

```bash
npm run preview            # -> http://localhost:5173/
```

- **Transport:** play/pause (space), frame step (← →), scrub bar, 0.25–2× speed, and a preview size of 540p, 810p or 1080p.
- **Live look controls:** glow, bloom, bloom radius, exposure, camera-motion amplitude, depth of field, copy-space darkening, and colours.
- **Rebuild controls:** density and seed regenerate the network.
- **Guides:** an overlay showing copy space and the title-safe area. It is HTML on top of the canvas, never in the render.
- **Copy render command:** emits the exact `npm run render -- --params "…"` command for the current look. The URL updates too, so a look can be bookmarked.

Preview playback only chooses *which* time to display. Every frame is drawn by the same `renderAt(t)` function the offline renderer uses, so preview speed or frame drops cannot change the final render.

## Rendering

```bash
# Final master: 3840x2160, 30 fps, 450 frames -> PNGs + MP4
npm run render
#   = node scripts/render.mjs --width 3840 --height 2160 --fps 30 --duration 15

# Faster on multi-core machines (separate browser per worker)
node scripts/render.mjs --workers 2

# 1080p native render
npm run render:preview

# With a custom look (same keys as the preview URL)
node scripts/render.mjs --params "glow=1.15&bloom=0.6&seed=7&cyan=33ddff"

# Resume an interrupted render, then encode
node scripts/render.mjs --skip-existing

# Render only some frames (QA / stills). Frame 450 = t 15 s, must equal frame 0.
node scripts/render.mjs --list 0,225,449,450 --no-encode
```

| Option | Default | |
|---|---|---|
| `--width` / `--height` | 3840 / 2160 | output size; any 16:9 or other aspect works |
| `--fps` / `--duration` | 30 / 15 | the 15 s story timeline is rescaled to `duration` |
| `--start` / `--end` / `--list` | all | frame selection |
| `--workers` | 1 | parallel headless browsers (2 is optimal on 4 cores) |
| `--frames-dir` | `frames/<W>x<H>` | PNG output folder |
| `--out` | `renders/neon-ai-network_<W>x<H>_<fps>fps.mp4` | MP4 path |
| `--crf` | 14 (4K) / 16 | x264 quality |
| `--gl` | `swiftshader` | `gpu` to use the system GPU |
| `--skip-existing`, `--no-encode`, `--chromium PATH`, `--params QUERY` | | |

How it works: `render.mjs` starts a small local server (`scripts/server.mjs`) and opens `render.html` in headless Chromium at the exact output resolution. For each frame it calls `window.neonRender.frame(i)`, which renders `t = i / fps` and POSTs a lossless PNG back to the server. It never screen-records. When all frames exist, `encode.mjs` runs FFmpeg.

Measured on a 4-vCPU cloud container (SwiftShader, no GPU, `--workers 2`): **~0.7 s/frame at 1080p** (≈ 5.5 min for 451 frames) and **~1.9 s/frame at 4K** (≈ 15 min). Long 4K runs reload each page every 40 frames, because Chromium otherwise exhausts its blob store (`ERR_BLOB_OUT_OF_MEMORY`). A failed frame is retried automatically.

### Encoding (PNG sequence → MP4)

`npm run encode -- --frames-dir frames/3840x2160` runs:

```bash
ffmpeg -framerate 30 -start_number 0 -i frames/3840x2160/frame_%04d.png -frames:v 450 \
  -vf "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p" \
  -c:v libx264 -preset slow -crf 14 -profile:v high -level:v 5.1 \
  -x264-params aq-mode=3:aq-strength=0.9:deblock=-1,-1 \
  -color_primaries bt709 -color_trc bt709 -colorspace bt709 -color_range tv \
  -r 30 -movflags +faststart -an renders/neon-ai-network_3840x2160_30fps.mp4
```

For an editing master instead of a delivery file: `-c:v prores_ks -profile:v 3 -pix_fmt yuv422p10le out.mov`.

## Quality assurance

```bash
npm run qa -- --video renders/neon-ai-network_3840x2160_30fps.mp4 --frames-dir frames/3840x2160
```

The QA script checks the following, and writes `qa/<name>.md|json` plus a contact sheet:

- codec, profile, pixel format, dimensions, frame rate, decoded frame count, duration, BT.709 tags and the absence of audio (ffprobe);
- per-frame mean luma and mean absolute frame-to-frame difference, flagging spikes against the local median as flicker or popping;
- the loop seam: the last→first frame difference compared with ordinary consecutive-frame differences, and frame `t = 15 s` checked pixel-identical to frame 0;
- clipping: the share of pixels ≥ 250/255;
- PNG sequence completeness.

## Design and implementation notes

**Timeline** (`src/timeline.js`, `src/network.js`):

| Story time | What happens |
|---|---|
| 0–3 s | 5 dim seed particles brighten; filaments draw between them, each with a bright leading spark |
| 3–7 s | Growth spreads outward along a shortest-path tree (Dijkstra from the seeds); nodes ignite as filaments arrive; pulses travel with ease-in-out motion |
| 7–11 s | The camera pushes in (C2-smooth envelope); violet/magenta energy bands flow along focal-cluster filaments; violet haze |
| 11–14 s | A detail layer of extra filaments is added; pulse light trails lengthen |
| 13.3–14.9 s | Reverse-order retraction back toward the seeds; the camera eases back to its start pose |

**Loop seamlessness:**

- Every periodic motion (node pulsing, dust drift, flow bands, pulse cycles, camera orbit) uses an integer number of cycles per loop.
- All one-shot events finish before 15 s.
- Envelopes use quintic smoothstep, so position, velocity and acceleration all match at the seam.

**Determinism:**

- A seeded PRNG (mulberry32) drives all generation, and there is no `Math.random` or wall-clock time anywhere in the frame path.
- Frame `i` is a pure function of `i / fps`: the GPU evaluates every element from one time uniform plus static per-instance attributes.
- Additive blending without depth testing makes draw results order-independent.
- In testing, frames rendered in separate runs and by different workers were byte-identical.

**Rendering:**

- Each layer is a single instanced draw:
  - **Background gradient:** a full-screen triangle.
  - **Volumetric haze:** billboards.
  - **Micro-particles:** 1,500 dust particles.
  - **Filaments:** screen-space ribbons with a Gaussian cross-section, which antialias themselves and are clipped at the near plane.
  - **Pulses:** streaks from tail to head along the edge.
  - **Nodes:** billboards with a core, halo and hub ring.
- Pixel widths are authored at 1080p and scaled by `height / 1080`. The bloom chain runs at a fixed 1080-line internal resolution, so 1080p and 4K look the same.
- Depth comes from fake depth of field (size grows and energy is conserved as elements leave focus, giving bokeh), exponential fog, and near-lens fading that prevents popping.
- Final pass: copy-space darkening, vignette, ACES tone mapping, sRGB, and ±1 LSB triangular dither against 8-bit banding.

**Copy space:** during generation each node is projected through the camera at seven moments of the move, and any node that would land in the left 34 % of the frame is rejected. The final pass adds a soft darkening ramp.

### Configuration

`src/config.js` holds the defaults; every key can be overridden by URL (preview) or `--params` (render):

`seed`, `width`/`w`, `height`/`h`, `fps`, `duration`, `density`, `glow`, `bloom`, `bloomRadius`, `exposure`, `camera`, `dof`, `copySpace`, and the colours `cyan`, `violet`, `magenta`, `navy`, `black` (hex without `#`).

### Project layout

```
index.html / render.html     preview UI / headless render page
src/NeonNetwork.js           reusable scene + animation system (renderAt(t))
src/network.js               procedural graph, reveal/retract choreography, pulses, dust, haze
src/timeline.js              story envelopes and camera path
src/shaders.js               all GLSL (edges, nodes, pulses, dust, haze, background, final pass)
src/config.js, src/math.js   config parsing, seeded RNG, easing
src/preview.js, preview.css  preview controls
src/render-entry.js          frame API used by the renderer
scripts/server.mjs           static server + PNG upload endpoint
scripts/render.mjs           offline renderer (Playwright)
scripts/encode.mjs           PNG -> H.264 MP4
scripts/qa.mjs               media + temporal + seam QA
```

## Troubleshooting

- **`browserType.launch: Executable doesn't exist`:** run `npx playwright install chromium`, or point to an installed Chrome/Chromium with `--chromium /path` or `CHROMIUM_PATH=…`.
- **WebGL context fails or the page throws in headless mode:** keep the default `--gl swiftshader`, which needs no GPU. Some sandboxes also need `--no-sandbox`; add it to `LAUNCH_ARGS` in `scripts/render.mjs`.
- **4K is slow:** this is expected with CPU rendering. Use `--workers 2` (or more on bigger machines) or `--gl gpu`. If interrupted, rerun with `--skip-existing`.
- **Out of memory / context lost at 4K:** use `--workers 1`. Each 4K worker uses about 1 GB of RAM (measured).
- **`ffmpeg not available` / `Unknown encoder 'libx264'`:** install a full FFmpeg build. The PNG sequence is still complete and can be encoded later with `npm run encode`.
- **Disk:** the 4K PNG sequence is about 5 GB. Delete `frames/` after encoding if space is tight.
- **Colours look washed out or shifted in a player:** the file is tagged BT.709 limited range. Use a colour-managed player such as QuickTime, VLC or Resolve, not a browser preview with a mismatched colour space.
- **Preview runs slowly:** pick a smaller preview size. Preview speed never affects renders.
- **Preview and render differ:** make sure the render uses the same `--params` as the preview URL; use the **Copy render command** button.
