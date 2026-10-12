# Adobe Stock wireframe loops (Three.js, headless)

Six clean 20-second motion backgrounds (no text, logos or watermarks), rendered deterministically
frame by frame in headless Chromium and piped straight into ffmpeg.

| File | Type | What happens |
|---|---|---|
| `A-blueprint-grid-loop` | seamless loop | Cyan icosahedron with a nested dodecahedron and an octahedron core, orbit rings with tick marks and ground construction marks over a scrolling blueprint grid. At 10 s a light wave spreads across the grid, the lines brighten and the camera slows and pushes in. |
| `B-hologram-knot-loop` | seamless loop | Upright fresnel-hologram torus knot with helical wire strands, scan bands and a projector base with spinning dashed rings and rising particles. At 10 s a bright scan band sweeps up the knot. |
| `C-synthwave-horizon-loop` | seamless loop | Neon grid road toward a striped retro sun, with wireframe mountain ranges and twinkling stars. Travel slows to 40 % at 10 s while the sun pulses and a glow wave runs down the road. |
| `D-wireframe-city-buildup` | build-up (non-loop) | Footprints on the grid at 0 s; blocks rise outward from the centre so the city reads clearly by 5 s (the thumbnail frame); landmark towers top out around 12 s; a light pulse sweeps the skyline at 13–16.5 s; the camera eases into a slow drift. |
| `E-morph-sphere-loop` | seamless loop | Geodesic wireframe sphere flowing with layered waves, coloured by displacement (violet → pink → cyan). At 10 s it morphs hardest and pulses. |
| `F-tunnel-warp-loop` | seamless loop | Flight through a curving, twisting tunnel of neon rings with speed streaks. Speed runs from 0.55× at the seam to 1.45× at 10 s (the warp surge), and the FOV widens. |

## Spec compliance

- **Output**: 1920×1080 and DCI 4K 4096×2160, 600 frames @ 30 fps (20 s), no audio.
  Master: ProRes 422 HQ (`prores_ks -profile:v 3`, 10-bit 4:2:2, BT.709). Backup: H.264 High, CRF 12, yuv420p.
- **Seamless loops (A, B, C, E, F)**: every motion is a function of the loop phase `p = t / 20`, using
  integer cycles or turns per loop, spatial periods that divide the travel distance, and periodic easing
  (`p + a·sin(2πp)`). Frames 0–599 are rendered, so frame 600 equals frame 0. Verified: frame 600
  matches frame 0 to the pixel (max diff 0) for all five loops. There is no "draw-on" intro.
- **No black frames**: every frame has content. D opens on the grid and the building footprints.
- **Thumbnail (frame 150 / 5 s)**: the hero object is fully visible in every clip, and D is already a recognisable city.
- **Anti-aliasing / flicker**: 4× MSAA HDR render target; screen-space fat lines (≥1.3 px at 1080p,
  scaled ×2 at 4K); analytic grids anti-aliased with `fwidth` and faded out before cells drop below
  ~6 px (no moiré); bloom runs its first mip at full resolution so thin lines are blurred before
  decimation (at the default half resolution, the glow of the lines breaks into crawling dashes).
- **Bloom**: strength 0.45–0.6 and threshold 0.12–0.2, with only a small boost at the climax, so lines stay crisp.

## Render

```bash
npm install                      # three 0.170.0 + playwright 1.56.1 (uses the system Chromium)
node render.mjs --scene A --res 1080p        # → out/A-blueprint-grid-loop-1080p.{mov,mp4}
node render.mjs --scene A --res 4k           # → out/A-blueprint-grid-loop-4k.{mov,mp4}
node render.mjs --scene A --still 150        # thumbnail check → out/previews/*.png
setsid nohup bash render-queue.sh > out/render.log 2>&1 &   # everything, 2 parallel jobs, resumable
python3 make-metadata.py                     # → out/metadata.csv
```

On CPU (SwiftShader) one frame takes about 2 s at 1080p and about 8 s at 4K. With a GPU it is much faster.

## Metadata

`out/metadata.csv` follows the Adobe Stock contributor CSV (`Filename, Title, Keywords, Category`).
Titles are ≤ 70 characters. Each clip has 40 keywords with the 10 most important first. Category
uses Adobe's numeric IDs, which the importer expects: **19 = Technology**, **8 = Graphic Resources**.
