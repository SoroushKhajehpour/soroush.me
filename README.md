# Soroush's coast

A Next.js portfolio set in one continuous pixel-art beach. Home is the approved 1585 × 992 illustration, decomposed into lossless layers; scrolling, swiping or the nav moves a camera between three resting points along a 5580 px panorama (`assets/reference/coast-v2`) to a dusk stretch of beach for Projects and a night cove for Experience. One Three.js shader animates the sea, the wash and a few ambient details across the whole panorama. All text is semantic HTML; the bitmap title and foreground objects retain their source pixels. Phones get the Home scene with the zones stacked below it.

## Run

```sh
npm ci
npm run dev
```

Open http://localhost:3000. `npm run build` creates the production build; `npm start` serves it.

The preview prepared during implementation is http://localhost:3001, running from `/Users/soroushkhajehpour/.cache/coast-preview`. This is a local runtime copy because macOS repeatedly offloaded files in the Documents checkout, producing stalled reads and incomplete HTTP responses. The source of truth remains the `website-redesign` checkout. Later source edits need a new preview run or a refreshed runtime copy. There is no hosted deployment.

## Edit

- Navigation, projects, experience, links and the resume path: `lib/content.ts` (`blurb` is the short text shown in the panorama). Project previews are 720 × 480 images in `public/projects/`; the resume is `public/resume.pdf`.
- Zone camera positions: `lib/coast/camera.ts`; camera motion, timings and wheel-gesture recognition (one section per swipe): `lib/coast/navigation.ts`; the navigation controller (wheel, touch, keys, links, history, the stage): `components/home/Panorama.tsx`, with a development overlay at `?nav-debug`; zone layouts: `components/home/Projects.tsx`, `Experience.tsx` and `app/globals.css`.
- Intro bullets, wave parameters, and environment presets: `lib/coast/scene-config.ts`.
- Scene coordinates (in the 2335 px wide extended scene) and shared object anchors: `public/coast/manifest.json` and `lib/coast/scene-manifest.ts`.
- The camera pickup and its LCD gallery: `components/home/CameraGallery.tsx` and `lib/coast/pickup.ts`; photos (and optional Cloudinary hosting): `lib/photography/` (see its README). Music (Spotify embed, playlist, the playable speaker): `lib/music/` (see its README).
- Rendering and resource lifecycle: `lib/coast/renderer.ts`; wave/shoreline behavior: `lib/coast/shaders.ts`.
- Responsive layout, the visible window of the scene and bio typography: `app/globals.css`.

See [the scene notes](docs/coastal-scene.md) for deterministic controls, asset derivation, fidelity measurements, and limitations.

## Verify

```sh
npm run lint
npx tsc --noEmit
npm run build
npm test
```

Browser tests use installed Google Chrome and a server at http://localhost:3001. Override the target with `COAST_URL`. For visual captures, install Playwright's small recording dependency with `npx playwright install ffmpeg`, then run:

```sh
python3 -m pip install -r scripts/requirements.txt
npm run test:visual
```

`npm run assets:coast` regenerates the Home layers and data masks from `assets/reference/homepage_design.png`; `npm run assets:panorama` then derives the panorama layers (`public/coast/pano/`) from those and `assets/reference/coast-v2/continuous-master.png`, writing QA overlays to `docs/verification/panorama/`. Run them in that order, then `python3 scripts/extract-camera-front.py` and `python3 scripts/extract-speaker.py`. The script asserts an exact reconstruction before browser rendering. Ordinary development needs neither Python nor asset regeneration. Generated QA images and recordings are ignored by Git; the numerical verification reports are retained.
