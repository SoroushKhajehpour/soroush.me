# Reference code only

`meteor-runtime.ts` contains small framework-independent helpers for metadata, frame selection, world-to-stage positioning, the flight path, and a timeline pulse hook. It has **not** been added to or executed by the website. Adapt it in a client component after choosing the landing point and responsive scale in the actual scene.

The helper's `packUrl` should be `/pixel-meteor-animation-pack` after copying `sheets/` and `animations.json` beneath `public/pixel-meteor-animation-pack/`.
