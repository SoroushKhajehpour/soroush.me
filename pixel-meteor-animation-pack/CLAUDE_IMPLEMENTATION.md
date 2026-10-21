# Claude Code handoff: Experience meteor

This pack supplies the art and playback metadata. It is **not integrated into the website yet**. The source screenshots are references only. Use the PNG frames and sheets in `sprites/` and `sheets/`.

## What exists in this repository

- The site is Next.js 16.4 with React 19.3. Read the installed guides in `node_modules/next/dist/docs/` before editing its components; this repository's `AGENTS.md` explicitly requires it.
- `components/home/Panorama.tsx` is the client owner of the desktop stage and camera. It writes `--cam` to `.scene-window`, translates zones as the camera pans, and already detects full arrival (`here`) by comparing camera and zone positions. The broader `stage.dataset.zone` changes earlier in a transition, so do **not** use that alone to start the cinematic.
- `lib/coast/camera.ts` defines the Experience world window through `zoneCamera("experience", frameWidth)`. `lib/coast/scene-manifest.ts` exports `readFrame`, `boundsStyle`, and `pano`. The panorama world is 5580 × 992 scene pixels; Experience is centred near world x = 3836 for the designed 1744 px window.
- `components/home/Experience.tsx` renders the four `.tl-item` / `.tl-check` milestones. `app/globals.css` already uses `--warm: #e59056`, navy night colour, and discrete star pixels. Add a temporary pulse class to these existing stars instead of introducing another timeline.
- Desktop uses the panorama. Under `Panorama.STACKED` (phones, portrait tablets, short windows), Experience is a stacked section with a 700 × 440 source strip from y = 200–640 and a flat blue continuation. **That strip does not contain sand.** Before offering a mobile crash, add a responsive Experience beach crop/panel that includes dry sand, then anchor the landing within that panel. Do not land on the blue continuation or the sea.

## Asset loading

Copy `sheets/`, `static/`, and `animations.json` to `public/pixel-meteor-animation-pack/` (keep the paths in the JSON). Use URLs beginning `/pixel-meteor-animation-pack/`. The installed Next.js `public` folder guide confirms root-relative URLs. Preload the four small sheets when the Experience approach begins; the raw `source/` images and previews are for editing/QA and need not be served.

`animations.json` is the source of truth for cell size, frame order, durations, loop policy, anchors, and recommended scale. The logical cells are transparent; do not trim them again at runtime. Use `image-rendering: pixelated`, `background-repeat: no-repeat`, horizontal background offsets, and an integer display scale. The recommended desktop scale is 2; start mobile at 1 and tune against the actual crop. Keep the CSS hit target at least 44 × 44 CSS px even if the visible rock is smaller.

The optional `reference/meteor-runtime.ts` shows the sheet-frame lookup, world-to-stage mapping, and anchor placement. It is reference code, not a drop-in integrated component.

## Placement and timing

The checked `previews/site-fit-preview.png` proposes a landing/contact point at **world `(4740, 852)`**. This is dry sand in the present 5580 × 992 panorama and clear of the sky timeline. Inspect the rendered site at desktop widths and adjust within nearby sand if the beach art or text changes. Store the final coordinate in one constant, not duplicated per state.

Suggested sequence:

1. Detect *settled arrival* in Experience from Panorama's existing `here === "experience"` result. Wait about 350 ms. Do not start during the camera transition.
2. Start the flight head just beyond the visible upper-right sky. Derive its world start from the Experience camera window, e.g. `{ x: frame.x + frame.width + 80, y: frame.y + 70 }`. Keep the flight head at the world path point; the tail in each cell already points upper-right. Move the head to `(4740, 852)` over about 1.3 s with mild acceleration. Keep the three flight frames looping at their metadata durations throughout. Do not fade or shrink them.
3. At the exact end of the flight, stop selecting flight frames. Replace the flight with impact frame 1 at the *same world contact point*. The flight `anchor` and impact `contactPoint` in metadata are the pixel offsets that must coincide there. Play the six impact frames once using their individual durations.
4. Change to idle without moving the world point. Keep the meteorite visible and clickable. Do not replay the crash when leaving and returning to Experience during this page visit.
5. On click or keyboard activation, play the five activation frames once; the first and last are byte-identical to idle frame 1. Pulse the four `.tl-check` stars in order (about 130–180 ms apart), then return to idle. Ignore or coalesce repeated clicks while activation is playing.

State model: `waiting → flying → impact → landed → activated → landed`. A separate `hasLanded` ref should survive Experience visibility changes within the mounted page. If the visitor leaves mid-flight, pause or finish deterministically; returning must not restart a second crash. A reduced-motion visitor should start in `landed` with the static PNG and have a nonmoving orange milestone highlight on activation.

## World anchoring and layers

The panorama's camera moves through world coordinates. In desktop mode, place one meteor sprite element within `.scene-window` above the renderer canvas and below `.zone-content`. This lets it appear in the sky and on the beach while the timeline stays legible. The sprite element should have no opaque background and `pointer-events: none` in flight/impact. For the landed state, use a transparent button aligned to the rock, `pointer-events: auto`, `aria-label="Activate the meteorite"`, and a visible pixel-style focus ring. The button must not overlap timeline links.

Use the same source window as the renderer. For world coordinate `(X,Y)` and scene frame `{x,y,width,height}`, stage CSS position is `((X-x)/width*stageWidth, (Y-y)/height*stageHeight)`. Snap only the final CSS pixel position; avoid repeated layout reads each animation frame. Recalculate on stage resize and on camera updates. `boundsStyle` and `readFrame` in `lib/coast/scene-manifest.ts` show the existing convention. Keep the landing point fixed in world space through resize and camera motion.

For stacked/mobile mode, the existing Experience strip is only sky/water. Make a crop of the panorama that includes the local shoreline and dry sand, then use that crop's own coordinate transform for the sprite. The desktop world point may guide the composition but cannot be blindly projected onto the present 440 px mobile strip. Respect `prefers-reduced-motion` on both layouts.

## Timeline pulse

The current stars are SVG rectangles in `.tl-check`; their CSS uses `--core`, `--inner`, `--ray`, and `--tip`. Add a `.meteor-pulse` class to the existing `.timeline` and stagger `li` animations by `--i`. For each star, briefly set warm cream/orange fills and reveal one extra pixel of rays with `steps(1)`; then remove the class. Keep existing hover, focus, reveal, and link behaviour intact. Avoid a new particle engine or animation dependency.

## Verification before merging

- Check desktop Experience entry from Home, direct `#experience` load, resize during flight, pan away/back, and click/keyboard activation.
- Confirm the flight head lands exactly where impact frame 1 flashes, with no screen-space drift. Confirm the idle rock stays at the same sand point under camera movement.
- Check 700 px and narrower stacked layouts after adding a sand-containing mobile crop. Confirm the crash does not occur over water or a flat colour.
- Confirm all 14 unique source poses and 16 exported playback frames remain transparent, sharp, and uncut. Run `python3 pixel-meteor-animation-pack/source/validate_pack.py` after any asset edit.
- Check reduced motion, screen-reader button label, focus ring, and timeline links.

The four contact sheets and dark-blue GIFs in `previews/` show sequence order and timing. The site-fit preview is a static proposal, not a rendered browser test.
