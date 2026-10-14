# touch grass — motion

A 20-second looping motion piece: a soft hill, one tree, a lot of grass,
and the light running from day to dusk to night. Built with Three.js and
Vite. Watch it live in the browser, or render it to MP4.

```bash
npm install
npm run dev       # watch it play (real time, 16:9, loops)
npm run render    # render renders/touch-grass.mp4 (1920×1080, 30fps)
```

`npm run render` needs `ffmpeg` on your PATH and a Playwright Chromium
(`npx playwright install chromium`). Options:

```bash
npm run render -- --width 1280 --fps 24 --out renders/preview.mp4
npm run render -- --from 12 --to 17      # only render a slice (seconds)
npm run render -- --blades 80000         # faster draft
```

Frames are rendered one at a time on a fixed clock, so a slow machine only
takes longer. The output never drops frames.

While it plays in the browser, Space or a click pauses, ← / → scrub by two
seconds, `?t=12` starts at 12 s, and `?debug` shows fps.

## The film

Personality: **calm / premium**. Entrances decelerate
(`cubic-bezier(.05,.7,.1,1)`), exits accelerate (`(.3,0,1,1)`) and are shorter
than entrances. On-screen moves use `(.4,0,.2,1)`, and the light and camera
changes use sine in-out.

| Time | Act | What happens |
| --- | --- | --- |
| 0 – 4.6 s | Setup | Fades up from black while the camera rises out of the grass. "touch grass" arrives letter by letter: 35 ms stagger, 0.95 s rise with blur. The subtitle follows word by word. |
| 3.6 – 7 s | Action → reaction | An unseen hand brushes through the foreground and the blades bend away. A gust rolls across the hill in answer, and the title steps out (reverse stagger, 0.5 s). |
| 6.8 – 16.4 s | Transition | One continuous move of the light, slowing near dusk but never stopping. Day melts into dusk: pink-orange sky, a dark reddish silhouette, flowers opening. Dusk then becomes night: moon, stars, fireflies, and a second brush that leaves a glowing trail. A small clock ticks along with the light. |
| 16.2 – 20 s | Resolution | End card in white, a breath of stillness, then a fade to black, so the loop is seamless. |

Under all of it, the camera makes one long, slow push toward the tree with
a slight left-to-right drift, so the tree parallaxes against the sky.

## Structure

```
src/
  main.js              stage, playback loop, deterministic capture API
  motion/
    timeline.js        every beat of the film; sampleTimeline(t)
    titles.js          typography choreography (letters / words / clock)
    easing.js          cubic-bezier solver + the easing family
  scene/               the 3D world (grass, sky, clouds, tree, fireflies, post)
  shaders/*.glsl
scripts/render.mjs     Vite + Playwright + ffmpeg → MP4
```

- **Grass.** 160k instanced blades bent along a constant-length arc by noise
  wind, gust waves, and a "brush" trail. The trail is a ping-pong render
  target fed by the scripted screen-space strokes, which are ray-marched onto
  the hill.
- **Light.** Five palette keyframes (day, golden, dusk, blue hour, night)
  drive every uniform and the type color.
- **Post.** Bloom, then ACES tone mapping, then a light vignette and grain.
