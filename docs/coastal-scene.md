# Coastal scene engineering notes

## Reference and reconstruction

The source is `assets/reference/homepage_design.png`, unchanged at 1585 × 992. SHA-256: `3b6af9e148f48c58428839c2c05007d6ec14854ff03ede996f9b558777bed185`.

`extract-coast.py` preserves actual source pixels. It derives a ground plate, ocean texture, atmospheric light layer, sun, title segments, camera with strap and contact shadow, speaker, and Life lettering. It also derives a shoreline distance field, flow normals, foam/reflection data, ocean and protected-land masks, and a static fallback. Foreground extraction includes the sand visible through the camera strap and speaker handle. A sand tile is cut from clean sand for padding.

Hidden sky and sand behind removed content are reconstructed from nearby pixels. They are approximations; default visible pixels are restored by the original layers. Camera and speaker masks retain contact shadows and some nearby sand. Substantial movement or new lighting directions would need additional artwork and refined transparent shadows.

**Wide-screen extension.** The scene is 2335 × 992: the 1585 px illustration sits at x = 300 with 300 px of extra sea on its left and 450 px of extra sea and beach on its right, so it can fill any desktop window edge to edge. The sky is mirrored. The left sea is a mirror of the left edge. On the right, the strip of sea along the shoreline is slid up the shore by the distance that best matches the seam (the search is in the script), and the sand is tiled from clean sand so no sprite fragments are copied. These pixels are invented, not recovered, and are only visible on windows wider than about 1.6 : 1. `manifest.json` stores every coordinate in this wider space. All masks, the shoreline field and the flow field are derived from the extended picture. The flow normals are derived from a smoothed distance field so the wash slides along clean normals.

The extraction script recomposes every layer and asserts zero channel difference against the source. The name uses two extracted bitmap assets with a single semantic h1. Changing the name requires updating both the content and those appearance assets. Bio text is normal, selectable HTML using Helvetica Neue with Arial/Helvetica fallbacks. Its font metrics and antialiasing differ from the flattened reference.

## Rendering and motion

One orthographic Three.js draw composites the visible part of the scene. Color textures are sRGB, masks are linear data, sampling is nearest, and tone mapping and antialiasing are off. The drawing buffer is the visible window in scene pixels (for example 1831 × 992 on a 1440 × 780 browser window) and the browser scales it to the window. Downscaled art is smoothed; art scaled up 1.75× or more is pixelated. HTML stays at browser resolution. All foreground positions and future hit targets use the same scene-coordinate manifest.

**Swells.** Four directional components (wavelengths 310, 170, 92 and 50 px, periods 9.6, 6.4, 4.3 and 2.9 s) travel toward the beach. They displace the sampled sea by up to roughly 8 px at the front, shrinking toward the horizon, and crests bunch together with distance. The combined strain stays near 1 in the worst case, so crests slide and compress without folding over. Deformation is `W(p,t) - W(p,0)`, so t = 0 is an identity mapping. Rows of dashes also slide sideways like chop. The source water, including its crests and reflected light, is resampled once; there is no frozen water layer under the displaced surface. Visible displacement is quantized to scene pixels.

**Wash.** Two wash trains (8.8 s and 13.3 s) push the foam line up to 22 px onto the beach and pull it back the same distance, faster coming in than going out. Positions along the shore are phase shifted, so the wash travels along the beach. Sand the wash leaves is darkened slightly. Each water contribution uses the shoreline distance field and may only go as far as `maxRunup` (at most 30 px, the width of the reconstructed hidden sand).

**Ambient life**, faded in over the first 1.5 s so t = 0 stays exact: foam dashes blink, sparkles catch in the sun's glitter path, the glitter path wobbles row by row, bands of light roll shoreward, rows of cloud streaks drift at different paces (away from the sun's disc), and the sun's glow breathes by about 5 %. Dry sand and the foreground objects never change.

This is art-directed 2.5D water motion, not a fluid solver or a reconstructed 3D ocean. It cannot reproduce physically exact wave breaking, depth, or new viewing angles from a single flattened image.

## Deterministic controls

The default page animates. `/?scene=reference` pauses at the exact reference phase. After textures and the first render are ready, the browser exposes:

```js
window.__coast.ready
window.__coast.reference()
window.__coast.set({ time: 12, paused: true, seed: 17, motion: 1, maxRunup: 4 })
window.__coast.set({ paused: false })
window.__coast.get()
window.__coast.environment(0.5) // optional noon study
window.__coast.environment(0.78) // original sunset
```

Motion is clamped to 0–1 and run-up to 0–30 scene pixels (22 by default). The page has no visible pause control; `paused` exists for tests and tooling. Time-of-day is separate from the animation clock and never advances automatically. The optional continuous environment curve coordinates sun position, atmosphere position/strength, region palettes, and reflection. It passes through the original sunset. This is a foundation for a future day cycle: foreground sprite relighting and mobile extension tinting still need authored treatment. It is not advertised as a complete photorealistic lighting system.

`SceneObjects` accepts action IDs `open-life` and `open-music`; controls are created only if callers supply meaningful handlers. No fake gallery, playlist, project content, audio autoplay, or dead links are included.

## Responsiveness and accessibility

The page is exactly one viewport tall and the scene fills it edge to edge. CSS (`app/globals.css`) computes the visible window of the 2335 px scene from the viewport's aspect ratio (`tan(atan2(100vw, 100svh))` is the ratio) and publishes it as registered custom properties `--x0 --y0 --ww --wh`. The canvas, the fallback still and the objects place themselves inside that window with percentages, and `readFrame` in `lib/coast/scene-manifest.ts` reads the same values to size the WebGL buffer, so the very first paint already has the right layout.

- Wider than 1585 : 992 (almost every desktop window): the window grows to as much as the whole 2335 px scene, splitting the extra width roughly 40 : 60 between left and right.
- Beyond 2335 : 992: the window stops growing and the sky is cropped from the top instead.
- Narrower than 1585 : 992, down to 4 : 5: the window crops the left (sea) and keeps the sun, camera and speaker.
- Phones and portrait tablets (narrower than 4 : 5, or 700 px wide at most): the name and bio stack above a 700 × 832 window that keeps the sun and both complete objects.

The name and bio are scaled by `--u`, scene pixels per CSS pixel for type, with minimum sizes. The h1 and real list render on the server. The canvas is decorative. A static fallback shows the same window of the extended still. Texture failure, unavailable WebGL, and context loss keep that fallback visible. There is deliberately no pause button. Reduced-motion preferences, including live changes, reset the reference still and stop the loop. Hidden/offscreen scenes suspend their clock; resumed frames do not integrate the hidden interval. Disposal covers textures, material, geometry, renderer, animation frames, and listeners/observers.

## Verification

Canonical comparisons use Google Chrome at 1585 × 992 CSS pixels, DPR 1, time 0, seed 17, reference environment: this window shows exactly the original illustration. See `verification/comparison.json` and `verification/browser.json` for exact measured values.

- Whole frame: 95.1 % of pixels exactly equal; mean absolute channel error 2.29/255. Outside the bio region the largest channel difference is 3/255, caused by sub-pixel placement of the camera and speaker sprites; the title, water and sun regions are 100 % exact.
- The bio accounts for most of the remaining differences; no region is silently excluded from the whole-frame score.
- Ten phases at 0, 1, 3, 5, 8, 13, 30, 60, 180 and 600 seconds, with the default 22 px run-up: zero changed pixels on dry sand and the objects (the sky is excluded because clouds and glow now drift) and roughly 600,000 changed sea pixels per phase. This samples an extended cycle; it is not a ten-minute real-time performance recording.
- A ten-second capture averaged about 16.7 ms between frames (60 fps) in local headless Chrome at 1585 × 992. This is one machine/browser measurement, not a mobile performance guarantee.
- Browser tests cover semantics, the absence of any button, running and reduced-motion clocks, edge-to-edge fit and no scrolling at 1440 × 780, 1920 × 1080, 1024 × 768, 3440 × 1300, 1585 × 992 and 1280 × 560, the sea visibly changing within a few seconds, 320/390/700/701/1280/1920 px layouts, missing textures, unavailable WebGL, context loss, and visibility event handling. Clock and coordinate tests check pause/resume and transformed object anchors; environment tests check continuity through the reference sunset.

Generated visual artifacts: `canonical.png`, `overlay.png`, `difference.png`, `mask-overlay.png`, `phase-3.png`, `mobile.png`, `wide.png`, `reduced-motion.png`, and `waves.webm`, all in `docs/verification/`. Regenerate them with the scripts documented in README. Fractional scaling, browser font rasterization, and other DPRs are not claimed to be pixel-identical.

## Implementation references

- [Three.js ShaderMaterial](https://threejs.org/docs/pages/ShaderMaterial.html)
- [GPU Gems: Effective Water Simulation from Physical Models](https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-1-effective-water-simulation-physical-models)
