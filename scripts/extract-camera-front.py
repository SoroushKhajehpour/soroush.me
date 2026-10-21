"""The beach camera exactly as the Home art shows it, for the moment it is picked up.

public/coast/camera.png is only part of what you see on the beach: the extraction left the
top edge of the camera's body in the ground plate under it. When the camera is lifted the
shader swaps that patch for clean sand (pano/camera-sand.png), so the lifted sprite must
carry everything that differs from the clean sand: the reference pixels (still.png) where
they differ from it, as one piece (the strap loop's inside and the "Life" lettering stay).
Written 4× enlarged with hard edges, so the browser can show it crisp at any size.

Run after scripts/extract-panorama.py:  python3 scripts/extract-camera-front.py
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parents[1]
COAST = ROOT / "public/coast"
r = json.loads((COAST / "pano/manifest.json").read_text())["cameraSand"]
o = json.loads((COAST / "manifest.json").read_text())["objects"]["camera"]
x, y, w, h = r["x"], r["y"], r["width"], r["height"]
still = np.asarray(Image.open(COAST / "still.png").convert("RGB")).astype(int)[y:y + h, x:x + w]
clean = np.asarray(Image.open(COAST / "pano/camera-sand.png").convert("RGB")).astype(int)
sprite = np.zeros((h, w), bool)
sprite[o["y"] - y:o["y"] - y + o["height"], o["x"] - x:o["x"] - x + o["width"]] = \
    np.asarray(Image.open(COAST / "camera.png").convert("RGBA"))[..., 3] > 0

differs = np.abs(still - clean).max(2) > 10
mask = ndi.binary_closing(differs, iterations=1) & (differs | ndi.binary_erosion(sprite, iterations=2))
lab, n = ndi.label(mask)
sizes = ndi.sum(mask, lab, range(1, n + 1))
main = 1 + int(np.argmax(sizes))
mask = lab == main                     # the camera and strap; not the lettering or the wash
# Sand-coloured pixels inside the silver body are part of it: fill small holes (but not the
# open loop of the strap).
holes = ndi.binary_fill_holes(mask) & ~mask
lab, n = ndi.label(holes)
sizes = ndi.sum(holes, lab, range(1, n + 1))
mask |= np.isin(lab, 1 + np.flatnonzero(sizes < 60))
out = np.dstack([still, mask * 255]).astype(np.uint8)
Image.fromarray(out).resize((w * 4, h * 4), Image.NEAREST).save(COAST / "camera-front.png", optimize=True)
print(f"camera-front.png: {mask.sum()} pixels, {w}×{h} at ({x}, {y}), written 4×")
