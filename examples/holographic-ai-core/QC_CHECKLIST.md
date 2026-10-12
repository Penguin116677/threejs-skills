# Quality-Control Checklist — Holographic AI Core

Run `bash scripts/build-all.sh` (or `npm run build:4k`). The automated items are
checked by `scripts/qc.py`, which exits non-zero on any failure and writes a JSON
report to `output/qc/`. Manual items need a person looking at the frames or contact
sheets.

## A. Build and runtime (automated)

- [ ] The page initialises with **no console errors, no page errors and no THREE/WebGL
      warnings**. `render.mjs` aborts on any of these.
- [ ] Every shader program links (`program.diagnostics.runnable !== false`) and
      `gl.getError()` is `NO_ERROR`, both before and after the frame range is rendered.
- [ ] Config warnings are empty, so no speed parameter had to be rounded.

## B. Image sequence (automated: `qc.py`)

| Check | Criterion |
| --- | --- |
| `sequence.count` | 480 frames (16 s × 30 fps), no missing indices |
| `sequence.size` | every frame is exactly the expected size (3840×2160 for masters) |
| `motion.no_duplicates` | no two consecutive frames identical (loop: mean step ≥ 0.02 luma; story: not bit-identical) |
| `motion.no_jumps` | no step larger than 4× the median step (+0.25), i.e. no pops or visual jumps |
| `exposure.stable` | mean-luma change between frames < 1.2 levels (no flicker or exposure pumping) |
| `clipping.highlights` | < 0.3 % pure-white pixels (restrained bloom, highlights not blown) |
| `contrast.negative_space` | > 45 % of the frame below luma 25 (dark, premium contrast) |
| `framing.safe_area` | all structural content (3×3 median, luma > 70) inside the 5 % action-safe margin |
| `framing.copy_space` | 99.9th-percentile luma of the copy-space third < 48 (clean area for titles) |
| `loop.seam_step` | last → first frame step is no larger than the largest normal step |
| `loop.state_periodic` | frame N (t = T) is pixel-identical (≤ 1 level) to frame 0 |
| `handoff.story_to_loop` | story frame 479 → loop frame 0 is a normal motion step |
| `handoff.state_identical` | story frame N (t = T) is pixel-identical to loop frame 0 |

## C. Encoded video (automated: `qc.py --video`)

- [ ] `video.metadata`: H.264 High, expected size, exactly 30 fps, 480 frames
      (counted by decoding), 16.0 s, progressive, yuv420p, BT.709 tags, **no audio
      stream**.
- [ ] `video.decoded_continuity`: all 480 decoded frames differ from their
      neighbours, so the encoder dropped or duplicated nothing.
- [ ] `video.frame_order`: sampled decoded frames match their own source PNG better
      than the neighbouring PNG, which rules out an off-by-one or reordering.

## D. Visual review (manual)

Use `output/qc/*_contact.jpg`, then open the full-resolution PNGs at 100 % for the
beginning, middle and end.

- [ ] **Glass and transparency**: no sorting pops. All holographic layers are
      additive with no depth writes, so draw order cannot matter. Confirm visually
      that nothing flickers where rings cross the sphere.
- [ ] **No z-fighting**: no coplanar surfaces exist by construction. Check the ring
      rims and the interface plane anyway.
- [ ] **Aliasing**: hair-thin orbits, ring ticks, the sphere graticule and scan
      raster are clean at 100 %, with no crawling or moiré in motion. Fine patterns
      fade out via `fwidth` before they alias.
- [ ] **Bloom**: restrained. The nucleus glows, but the rings keep crisp edges and the
      frame is never washed out.
- [ ] **Noise**: no sparkle or flicker on particles. Sub-pixel sprites are clamped to
      ≥ 1.3 px at 1080p-equivalent with energy-conserving alpha.
- [ ] **Composition**: the core sits on the right third, and the left ~40 % stays
      clean for copy at every frame, including the pulse and ring-expansion peak at
      about 11 s.
- [ ] **Story beats**: the brief sets 0–3 s awakening, 3–6 s core formation, 6–10 s
      scans and dolly-in, 10–13 s pulse, 13–16 s hero. Confirm each beat lands in
      its window.
- [ ] **No text, logos, watermarks, UI lookalikes or brand marks** anywhere in frame.
      Tick marks are plain geometric graduations with no numerals.
- [ ] **Loop playback**: play the loop MP4 on repeat in a player and confirm there
      is no visible seam.

## E. Delivery (Adobe Stock)

- [ ] Masters are native renders at 3840×2160 (`render-manifest.json` records the
      render size); nothing is upscaled. The 1080p previews are *downscaled* from the
      4K frames and named as previews.
- [ ] Files are named descriptively with no brand names, and there's no audio.
- [ ] The ProRes 422 HQ mezzanine (`encode.mjs --prores`) is optional and is for
      buyers who want an editing-friendly master.
