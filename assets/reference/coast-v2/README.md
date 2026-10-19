# Coast v2 — two main backgrounds and continuous transitions

Artwork-only delivery, 2026-10-19. No website source changes.

## Main backgrounds

There are exactly two new main backgrounds, both **1744 × 992 PNG**:

- `main/projects.png`: late sunset / dusk, no towel, board, furniture, camera or speaker.
- `main/experience.png`: nighttime cove, no chair, umbrella, poles, shadows or other props.

The framing approximates the supplied 2940 × 1672 desktop screenshot at the existing scene's 992px native height. It uses the current scene's viewport rule: Home is the source `public/coast/still.png` crop (236,0)-(1980,992). This retains the current sun/horizon placement. The screenshot's HTML text and animated water phase are not baked into these assets.

## Transition states

- `transitions/home-to-projects/00.png` through `25.png`: clean Home to Projects. Includes 24 intermediate states plus endpoints.
- `transitions/projects-to-experience/00.png` through `25.png`: Projects to Experience. Includes 24 intermediate states plus endpoints.
- `transitions/home-exit/00.png` through `12.png`: whole Home foreground objects fade away in place before panning. The sky is identical in every exit frame.

Every panning state is an exact native-resolution crop of **one shared 5344 × 992 image**, `continuous-master.png`. They are not independently regenerated scenes. Adjacent frames' shared world pixels were compared exactly: **zero channel differences in all 50 overlap checks**, including the sky. Exported keyframes represent evenly spaced camera positions; the implementation can move continuously between them.

World-camera positions for a 1744 × 992 window:

| View | Left x | Right x, exclusive | Horizon y |
|---|---:|---:|---:|
| Home | 0 | 1744 | 422 |
| Projects | 1914 | 3658 | 422 |
| Experience | 3600 | 5344 | 422 |

The master has an additional 64px on the left compared with the first panorama, aligning the wider current Home viewport. Its preserved Home sky is pixel-identical to the current clean source crop. The continuation uses the existing Home source's right margin as a shared blend area to avoid a hard sky splice. Fine shoreline registration and local blending join it to the dusk art.

## Whole objects, no cutout fragments

`work/home-current-reference.png` retains the existing camera, speaker and Life inscription. `work/home-clean-bridge.png` is a fully inpainted opaque beach plate used only for transitions. It contains no black object fragments, straps, logos, inscription or cutout holes. The actual existing Home assets are untouched.

The exit sequence fades the complete objects and their shadows at a stationary camera. Panning begins only after they are gone; returning to Home can reverse this sequence. Do not pan the original object-bearing background into the new pages or crop through its props.

## Smooth implementation handoff

For the smoothest future implementation, render the shared master as one texture and animate camera x continuously. Use the PNG states for review, checkpoints or a constrained fallback. Simply switching between the 26 files would show discrete motion; using the continuous texture permits any intermediate position and frame rate. Avoid crossfading unrelated main backgrounds, which would ghost the sun, waves and shoreline.

No wave motion or shooting stars are baked into these stills. Keep future shooting stars local to the active nighttime sky, and respect reduced motion. Water animation will need fresh masks for the revised continuous master and spatially varying lighting.

## Readable content areas

Separate `projects-content-guide.png` and `experience-content-guide.png` show possible content bounds. Guides are review aids only; their labels and tinted shapes are absent from all final backgrounds and transition frames.

Projects supports dark text (#171c26) in the left-center sky and a lower sand area for entries/screenshots. Experience supports warm-white text (#fff5e8) in its left-center sky. Clouds/stars were selectively quieted while retaining environmental detail. See `verification.json` for sampled contrast distributions. Bright isolated stars and texture points still require checking when actual glyphs are placed; the ocean foam is deliberately outside the suggested body-copy areas.

## Review and provenance

- `transition-preview.webp`: looping visual preview at 872 × 496; includes whole-object exit, both pans, and a return. This preview is compressed; use the PNGs/master for production.
- `transition-contact-sheet.jpg`: 12-state visual overview.
- `continuous-preview.png`: reduced full-panorama overview.
- `manifest.json`: exact source coordinates, frame order and content areas.
- `verification.json`: measured pixel continuity, dimensions and contrast samples.
- `prompt-set.md`: exact prompts used with the built-in image generation tool.

The generated edits were natively 1536 × 1024. Selected removal/texture regions were composited into the existing artwork, preserving surrounding coordinates and the original Home sky. Final backgrounds are assembled native-size crops; no low-resolution panorama was enlarged. Source generation intermediates remain in `work/` but are not additional main backgrounds.

