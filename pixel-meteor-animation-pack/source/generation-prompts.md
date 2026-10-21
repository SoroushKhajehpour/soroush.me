# Generation record

Mode: built-in `image_gen`, with `transparent_background: true`. Each named source in `generated/` came from its own tool call and its own prompt. No sprite sheet was generated and cut into frames.

References: `style-reference.png` was a visual palette/pose reference; `site-reference.png` established the existing navy beach. The later resting poses also referenced the independently generated `impact-06.png` to stabilize the rock silhouette. The references were not production extraction targets.

Common prompt constraints for every final source: **one independent transparent pixel-art frame**, deep navy/indigo and slate-blue sand/rock, restrained orange heat, cream-white meteor/flash, hard square pixel clusters, generous transparent margins on every side, no clipped pixels, no checkerboard, no scenery or text, and no sprite sheet. Each prompt asked for a single pose:

| Source | Pose instruction |
| --- | --- |
| `flight-01` | Compact bright head toward lower-left, slender navy/indigo and orange fragmented tail toward upper-right, sparse blue/orange sparks. |
| `flight-02` | Same-size bright head at the same logical position; split navy tail streaks and a new medium orange flicker/spark pattern. |
| `flight-03` | Same-size bright head at the same logical position; slightly shorter segmented blue tail and a third spark pattern. |
| `impact-01` | Complete meteor arriving at the fixed lower-center sand contact, with small blue-sand contact sparks. |
| `impact-02` | First compact cream-white/orange collision flash from the fixed sand contact, with first dark-blue grains lifting. |
| `impact-03` | Peak blue-rock/sand eruption and cream-white/orange flash, all debris contained. |
| `impact-04` | Flash receding while dark-blue debris descends around the fixed contact. |
| `impact-05` | Low settling mound, sparse warm sparks, tiny emerging navy rock. |
| `impact-06` | Dark navy cracked meteorite becoming visible, embedded in a narrow slate-blue mound. |
| `idle-01` | Same navy rock and sand base, dim restrained orange cracks, calm state. |
| `idle-02` | Same rock/base silhouette, gently brighter cracks and a tiny glint. |
| `activation-01` | Same rock/base, cracks warming to amber with a couple close sparks. |
| `activation-02` | Same rock/base, cream-orange cracks and compact short gold pixel rays at peak. |
| `activation-03` | Same rock/base, rays receding and cracks returning toward resting intensity. |

The source images retain the built-in generator's original soft alpha halo. `build_pack.py` removes that halo and produces hard-alpha, nearest-neighbor production frames. This processing does not extract any frame from the style screenshot.
