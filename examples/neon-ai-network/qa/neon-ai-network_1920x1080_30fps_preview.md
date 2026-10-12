# QA — renders/neon-ai-network_1920x1080_30fps_preview.mp4

Checked 2026-10-12T04:27:46.458Z

| Check | Result | Detail |
|---|---|---|
| codec | PASS | h264 High level 42, yuv420p |
| dimensions | PASS | 1920x1080 |
| frame rate | PASS | 30/1 (avg 30/1) |
| frame count | PASS | 450 decoded frames (expected 450) |
| duration | PASS | 15.0000 s |
| no audio track | PASS | 0 audio streams |
| colour tags | PASS | bt709/bt709/bt709, range tv |
| temporal stability (no difference spikes) | PASS | 0 spikes; median frame diff 1.562, max 3.436 |
| no global brightness flicker | PASS | 0 frames with mean-luma jump > 1.5/255 |
| loop seam (last -> first) | PASS | wrap diff 0.189 vs neighbouring consecutive diffs ≤ 0.161 |
| no harsh clipping | PASS | max 0.005% of pixels ≥ 250/255 in any frame |
| seam frame t=duration reproduces frame 0 | PASS | pixel-identical |
| PNG sequence complete | PASS | 450 PNGs for frames 0..449 |

Mean luma range 2.45–39.23 (first 2.45, last 2.54).

Contact sheet: `qa/neon-ai-network_1920x1080_30fps_preview_sheet.jpg`
