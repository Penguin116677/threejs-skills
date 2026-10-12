# QA — renders/neon-ai-network_3840x2160_30fps.mp4

Checked 2026-10-12T04:51:21.276Z

| Check | Result | Detail |
|---|---|---|
| codec | PASS | h264 High level 51, yuv420p |
| dimensions | PASS | 3840x2160 |
| frame rate | PASS | 30/1 (avg 30/1) |
| frame count | PASS | 450 decoded frames (expected 450) |
| duration | PASS | 15.0000 s |
| no audio track | PASS | 0 audio streams |
| colour tags | PASS | bt709/bt709/bt709, range tv |
| temporal stability (no difference spikes) | PASS | 0 spikes; median frame diff 1.580, max 3.384 |
| no global brightness flicker | PASS | 0 frames with mean-luma jump > 1.5/255 |
| loop seam (last -> first) | PASS | wrap diff 0.225 vs neighbouring consecutive diffs ≤ 0.195 |
| no harsh clipping | PASS | max 0.005% of pixels ≥ 250/255 in any frame |
| seam frame t=duration reproduces frame 0 | PASS | pixel-identical |
| PNG sequence complete | PASS | 450 PNGs for frames 0..449 |

Mean luma range 2.55–40.36 (first 2.55, last 2.63).

Contact sheet: `qa/neon-ai-network_3840x2160_30fps_sheet.jpg`
