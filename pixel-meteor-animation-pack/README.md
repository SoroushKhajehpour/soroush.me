# Pixel meteor animation pack

Production sprites for the Experience beach scene. The 14 source poses in `source/generated/` were **generated individually from the start**. The user-provided style screenshot in `source/style-reference.png` was used only as a palette and pixel-art reference; no cell was cut from it. The site screenshot in `source/site-reference.png` was used for environmental fit. The output sheets were assembled only after individual frames had been created and normalized.

## Contents

| Sequence | Exported frames | Logical cell | Playback |
| --- | ---: | ---: | --- |
| Flight | 3 unique | 192 × 128 | loop, 85 ms each |
| Impact | 6 unique | 224 × 160 | once, 75–130 ms |
| Idle | 2 unique | 128 × 96 | loop, 850 ms each |
| Activation | 5 frames, 3 unique active poses | 128 × 96 | once, 90–120 ms |

Activation's first and final frames are byte-identical to the first idle frame, so it returns cleanly to rest. `static/meteorite-resting.png` is the same resting frame.

`sprites/` contains RGBA PNGs. `sheets/` contains equal-cell transparent horizontal strips assembled from those PNGs. `animations.json` gives frame dimensions, order, durations, anchor and contact points. `previews/` has contact sheets, dark-blue GIF previews, and a site-fit preview at a proposed landing point. Preview backgrounds are **not** in production assets.

## Build and verify

From the website repository root, with Pillow installed:

```sh
python3 pixel-meteor-animation-pack/source/build_pack.py
python3 pixel-meteor-animation-pack/source/validate_pack.py
```

The builder cuts the faint generated alpha halo at 128/255, reduces each independent source by a fixed 1:8 nearest-neighbor scale, and aligns the meteor head or ground-contact point on transparent canvases. It never extracts from a sprite sheet. The validator checks PNG loading, transparency, equal dimensions, sheet/frame identity, transparent edge margins, and exact resting endpoints.

## Visual notes

- Palette: dark navy/indigo, slate-blue sand/debris, cream-white meteor head, restrained orange heat. This is keyed to the supplied sheet screenshot and the existing night beach.
- Pixel edges are hard with binary alpha. The production PNGs have no checkerboard, labels, or opaque background.
- The separately generated impact poses vary in individual rock and debris shapes. Anchors keep the physical contact fixed; minor frame-to-frame texture changes remain an artistic limitation of separately generated artwork.
- The source files keep the original high-resolution generation for future manual pixel editing. They intentionally include a soft generated halo that the production builder removes.
- The site-fit preview uses a proposed world landing point `(4740, 852)`. Confirm it in the browser before implementation.

See `CLAUDE_IMPLEMENTATION.md` for repository-specific integration guidance. The package does not modify the live website.
