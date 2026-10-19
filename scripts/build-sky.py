"""Derive the backdrop that continues the hero below the fold.

Two lossless PNGs come out, both in scene pixels so CSS can scale them exactly like
the hero:

* public/coast/sand-dissolve.png: the last rows of the beach (2335 wide), breaking up
  into the sky in clumped 4 px blocks, so the scene ends in its own pixel language
  rather than with a gradient or a hard edge.
* public/coast/sky-field.png: a seamless tile of the cloud streaks actually painted
  in the sky (grey dashes and a few peach ones), lifted off their background and
  softened, on the sky's own base colour.

Run: python3 scripts/build-sky.py
"""
import json
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = "public/coast"
manifest = json.load(open(f"{ROOT}/manifest.json"))
still = np.asarray(Image.open(f"{ROOT}/still.png").convert("RGB")).astype(np.float64)
ground = np.asarray(Image.open(f"{ROOT}/ground.png").convert("RGB")).astype(np.float64)  # no objects
H, W = still.shape[:2]
SKY = np.array([254.0, 254.0, 254.0])  # measured mean of the open sky is 253.7
BLOCK = 4
rng = np.random.default_rng(7)

# ---- sand dissolve ---------------------------------------------------------------
BAND = 168  # scene px
# Mirror the bottom of the beach downward so the grain continues without a seam.
src = ground[H - BAND:H][::-1]
GH, GW = BAND // BLOCK, W // BLOCK + 1
gy = (np.arange(GH)[:, None] + 0.5) / GH              # 0 at the hero, 1 at the sky
# Sand thins out in loose clumps along a softly wandering edge, like grain scattered by
# the wind, rather than in a regular halftone.
grain = ndi.gaussian_filter(rng.random((GH, GW)), 0.9)
grain = (grain - grain.min()) / (grain.max() - grain.min())
edge = ndi.gaussian_filter1d(rng.random(GW), 18, mode="wrap")
edge = (edge - edge.mean()) / (edge.std() + 1e-9) * 0.07
coverage = 1 - np.clip((gy + edge[None, :]) * 1.1, 0, 1) ** 0.75
# Where the sea itself reaches the bottom of the frame it clears within a few blocks,
# so the mirror never shows a second shoreline.
ocean = np.asarray(Image.open(f"{ROOT}/ocean-mask.png"))[H - 1] > 127
wet = np.zeros(GW, bool); wet[:len(ocean[::BLOCK])] = ocean[::BLOCK]
wet = np.clip(ndi.gaussian_filter1d(wet.astype(float), 10) * 1.6, 0, 1)
coverage = coverage * (1 - wet[None, :] * np.clip(gy * 7, 0, 1))
keep_blocks = (grain * 0.75 + rng.random((GH, GW)) * 0.25) < coverage
keep = np.kron(keep_blocks, np.ones((BLOCK, BLOCK), bool))[:BAND, :W]
t = np.repeat(gy[:, 0], BLOCK)[:BAND, None, None]
# Kept blocks fade a touch toward the sky as they thin out, so the last specks are faint.
sand = src * (1 - t * 0.55) + SKY * (t * 0.55)
band = np.where(keep[..., None], sand, SKY)
band[:BLOCK] = src[:BLOCK]                              # exact continuity on the seam
Image.fromarray(band.round().astype(np.uint8)).save(f"{ROOT}/sand-dissolve.png", optimize=True)

# ---- sky field -------------------------------------------------------------------
sky = still[:400]
# Measure against the local background, so the sunset glow behind a streak is not lifted with it.
local = np.stack([ndi.median_filter(sky[..., c], size=(9, 61)) for c in range(3)], axis=2)
diff = np.abs(sky - local).max(axis=2)
mask = diff > 9
sun = manifest["sun"]
cx, cy = sun["x"] + sun["width"] / 2, sun["y"] + sun["height"] / 2
yy, xx = np.mgrid[0:sky.shape[0], 0:W]
mask &= np.hypot(xx - cx, (yy - cy) * 1.6) > 430          # leave the sun and its glow behind
mask &= yy < 330                                           # and the hazy horizon hills
labels, n = ndi.label(ndi.binary_dilation(mask, np.ones((5, 23))))
clusters = []
for i, sl in enumerate(ndi.find_objects(labels), 1):
    h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
    if w < 60 or h < 4 or (mask[sl] & (labels[sl] == i)).sum() < 60:
        continue
    piece = sky[sl]
    dash = ndi.binary_dilation(mask[sl] & (labels[sl] == i))
    # Only the dashes themselves carry over, in their painted colours; the glow stays behind.
    alpha = np.clip((np.abs(piece - local[sl]).max(axis=2) - 4) / 16, 0, 1) * dash
    clusters.append((piece, alpha))
print(f"harvested {len(clusters)} cloud streaks")

TW, TH = 1400, 1100
canvas = np.tile(SKY, (TH, TW, 1))
placed = []
order = rng.permutation(len(clusters))
for k in range(24):
    piece, alpha = clusters[order[k % len(clusters)]]
    if rng.random() < 0.5:
        piece, alpha = piece[:, ::-1], alpha[:, ::-1]
    h, w = alpha.shape
    for _ in range(200):
        x, y = int(rng.integers(0, TW)), int(rng.integers(0, TH))
        # Streaks keep their distance, so the sky stays quiet behind text.
        if all(abs(((y - py + TH / 2) % TH) - TH / 2) > 120 or abs(((x - px + TW / 2) % TW) - TW / 2) > 520 for px, py in placed):
            break
    placed.append((x, y))
    strength = 0.62  # quieter than the hero's own sky
    for dy in range(h):
        row = (y + dy) % TH
        cols = (x + np.arange(w)) % TW
        a = (alpha[dy] * strength)[:, None]
        canvas[row, cols] = canvas[row, cols] * (1 - a) + piece[dy] * a
Image.fromarray(canvas.round().astype(np.uint8)).save(f"{ROOT}/sky-field.png", optimize=True)
print("wrote sand-dissolve.png", band.shape, "and sky-field.png", canvas.shape)
