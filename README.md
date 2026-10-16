# Soroush's coast

A Next.js homepage reconstructed from the approved 1585 × 992 illustration. The original artwork is decomposed into independent lossless layers, extended sideways so it fills any screen, with a Three.js shader animating the sea, the wash on the beach and a few ambient details (glitter, clouds, sun glow). The introduction is semantic HTML; the exact bitmap title and foreground objects retain their source pixels.

## Run

```sh
npm ci
npm run dev
```

Open http://localhost:3000. `npm run build` creates the production build; `npm start` serves it.

The preview prepared during implementation is http://localhost:3001, running from `/Users/soroushkhajehpour/.cache/coast-preview`. This is a local runtime copy because macOS repeatedly offloaded files in the Documents checkout, producing stalled reads and incomplete HTTP responses. The source of truth remains the `website-redesign` checkout. Later source edits need a new preview run or a refreshed runtime copy. There is no hosted deployment.

## Edit

- Profile content, wave parameters, and environment presets: `lib/coast/scene-config.ts`.
- Scene coordinates (in the 2335 px wide extended scene) and shared object anchors: `public/coast/manifest.json` and `lib/coast/scene-manifest.ts`.
- Gallery/music callback contracts: `components/home/SceneObjects.tsx`. Supply real `open-life` and `open-music` callbacks when those features have content; the current objects are decorative.
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

`npm run assets:coast` regenerates all artwork layers and data masks from `assets/reference/homepage_design.png`. The script asserts an exact reconstruction before browser rendering. Ordinary development needs neither Python nor asset regeneration. Generated QA images and recordings are ignored by Git; the numerical verification reports are retained.
