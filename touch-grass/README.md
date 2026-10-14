# touch grass

A cozy, cinematic 3D landing page: a soft hill, one tree, a lot of grass, and a
sky you can drag from day to dusk to night. Built with Vite + Three.js (vanilla
JS, no framework).

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static build in dist/
```

## Interactions

| Input | What happens |
| --- | --- |
| Press and drag sideways (mouse or touch) | Moves `timeOfDay` 0 → 1 (day → dusk → night), eased |
| Move the cursor over the hill | Blades bend away from it and leave a trail that glows faintly and fades |
| ← / → keys | Step the time of day |
| **try a break** | UI fades out, the camera slowly dollies in, a 60s timer starts (`Esc` or **end** to stop) |

URL parameters for tinkering: `?t=0.5` (start time), `?blades=80000`, `?samples=0`
(MSAA off), `?debug` (fps overlay). `window.touchGrass.setTime(0.8)` works from
the console.

## How it is put together

```
src/
  main.js              renderer, camera, input, time-of-day loop, adaptive DPR
  ui.js                overlay colors from the palette, break flow, popover/toast
  style.css
  scene/
    palette.js         time-of-day keyframes (day, golden, dusk, blue hour, night)
    shared.js          uniforms shared by reference across materials
    terrain.js         analytic hill height function, mesh, ray-march picking
    trail.js           ping-pong render target storing cursor push + glow
    grass.js           InstancedMesh blades + dusk flowers
    sky.js             gradient dome with sun, moon and stars
    clouds.js          baked soft cloud textures on drifting planes
    tree.js            tapered trunk/branches, displaced canopy, leaf cards
    fireflies.js       CPU-steered points that react to the cursor
    post.js            EffectComposer: bloom → ACES output → vignette + grain
  shaders/*.glsl       every shader, imported with Vite's ?raw
```

- **Time of day.** `palette.js` holds five keyframes. Each frame the eased
  `timeOfDay` samples them (smoothstep per segment, linear-space color lerp)
  into one live palette that drives every uniform and the CSS variables.
- **Grass.** One tapered 5-segment blade, instanced 160k times on desktop and
  60k on touch devices. The vertex shader bends each blade along a
  constant-length arc. The bend comes from rolling value noise plus traveling
  gust waves, plus the cursor trail. Distant blades get wider so the far field
  stays dense on screen.
- **Cursor trail.** The cursor is ray-marched against the analytic height
  function, which is cheaper than raycasting the mesh. The hit is stamped as a
  swept segment into a 512² half-float texture: RG holds the push direction
  and B the strength. The texture decays with a frame-rate-independent half
  life of about 0.9 s.
- **Post.** UnrealBloomPass (strength follows the palette: subtle by day,
  stronger for the moon and fireflies), OutputPass for ACES Filmic + sRGB,
  then a small vignette and grain pass.
- **Performance.** MSAA lives in the composer's render target (4× on desktop,
  off on mobile). Pixel ratio is capped at 2 on desktop and 1.5 on mobile. If
  the first seconds run under ~50 fps, the pixel ratio steps down
  automatically, never below 1.
