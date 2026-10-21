"""The playable JBL speaker (components/home/Speaker.tsx).

The new artwork (assets/reference/speaker-jbl.png, 1536 × 1024, from
~/Documents/updated_speaker_website.png) replaces the speaker painted into the Home scene.
This script:

* fits it over the old speaker: its body is scaled to the old body's width and stands on
  the same spot on the sand;
* writes public/coast/speaker-sand.png, the sand under the old speaker: the clean
  panorama plate with the old speaker's own contact shadow put back, so the new speaker
  rests on it and the shadow stays on the sand when the speaker bounces. The shader draws
  it in place of the old speaker, so there are never two;
* stores the button positions, measured from the artwork, as fractions of the image.

Run after scripts/extract-panorama.py:  python3 scripts/extract-speaker.py
"""
from pathlib import Path
import json
import shutil
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parents[1]
COAST = ROOT / "public/coast"
SOURCE = ROOT / "assets/reference/speaker-jbl.png"
art = Image.open(SOURCE).convert("RGBA")
AW, AH = art.size
a = np.asarray(art).astype(int)
ys, xs = np.nonzero(a[..., 3] > 8)
body = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)   # opaque box

old = json.loads((COAST / "manifest.json").read_text())["objects"]["speaker"]
o = np.asarray(Image.open(COAST / "speaker.png").convert("RGBA")).astype(int)
olum = o[..., :3].mean(2)
on = o[..., 3] > 0
dark = ndi.binary_fill_holes(ndi.binary_closing(on & (olum < 150), iterations=2))
oy, ox = np.nonzero(dark)
old_body = (ox.min(), oy.min(), ox.max() + 1, oy.max() + 1)

# Same width as the old body; standing on the same line on the sand.
scale = (old_body[2] - old_body[0]) / (body[2] - body[0])
width, height = AW * scale, AH * scale
cx = old["x"] + (old_body[0] + old_body[2]) / 2
bottom = old["y"] + old_body[3]
x = cx - ((body[0] + body[2]) / 2) * scale
y = bottom - body[3] * scale

# The sand under the old speaker, with its contact shadow kept.
PAD = 8
sx0, sy0 = old["x"] - PAD, old["y"] - PAD
sx1, sy1 = old["x"] + old["width"] + PAD, old["y"] + old["height"] + PAD
clean = np.asarray(Image.open(COAST / "pano/still.webp").convert("RGB")).astype(int)[sy0:sy1, sx0:sx1].copy()
shadow = on & ~ndi.binary_dilation(dark, iterations=1) & (olum > 140)
lab, n = ndi.label(shadow)
sizes = ndi.sum(shadow, lab, range(1, n + 1))
shadow = np.isin(lab, 1 + np.flatnonzero(sizes > 40))
region = clean[PAD:PAD + old["height"], PAD:PAD + old["width"]]
shade = o[..., :3]
region[shadow] = np.minimum(region[shadow], shade[shadow])  # only ever darker than the sand
# And the new speaker's own soft contact shadow, cast down and to the right like the old
# one (the light is the sunset, behind and to the left), on the sand under its base.
sil = np.asarray(art.resize((max(1, round(width)), max(1, round(height))), Image.LANCZOS))[..., 3] > 128
cast = np.zeros(clean.shape[:2], bool)
ox0, oy0 = round(x) - sx0 + 5, round(y) - sy0 + 6
hh, ww = sil.shape
ys0, xs0 = max(0, oy0), max(0, ox0)
ys1, xs1 = min(cast.shape[0], oy0 + hh), min(cast.shape[1], ox0 + ww)
cast[ys0:ys1, xs0:xs1] = sil[ys0 - oy0:ys1 - oy0, xs0 - ox0:xs1 - ox0]
# Only its lower half falls on the sand; it is strongest at the base.
rows = np.arange(cast.shape[0])[:, None]
base = round(y + height * (body[3] / AH)) - sy0
weight = np.clip((rows - (base - height * .45)) / (height * .45), 0, 1)
soft = ndi.gaussian_filter(cast.astype(float), 1.2) * weight
clean = (clean * (1 - .22 * soft[..., None])).round()
Image.fromarray(clean.astype(np.uint8)).save(COAST / "speaker-sand.png", optimize=True)

shutil.copyfile(SOURCE, COAST / "speaker-jbl.png")
box = lambda x0, y0, x1, y1: {"left": x0 / AW, "top": y0 / AH, "width": (x1 - x0) / AW, "height": (y1 - y0) / AH}
manifest = {
    "sprite": {"src": "/coast/speaker-jbl.png", "x": round(x, 2), "y": round(y, 2),
               "width": round(width, 2), "height": round(height, 2), "imageWidth": AW, "imageHeight": AH},
    "sand": {"src": "/coast/speaker-sand.png", "x": sx0, "y": sy0, "width": sx1 - sx0, "height": sy1 - sy0},
    # The buttons' grey caps, measured on the artwork.
    "buttons": {
        "previous": box(436, 305, 575, 407),
        "playPause": box(639, 351, 812, 469),
        "next": box(875, 412, 1021, 524),
    },
    # Where the speaker touches the sand (fractions of the image): the bounce pivots here.
    "foot": {"x": (body[0] + body[2]) / 2 / AW, "y": body[3] / AH},
}
(COAST / "speaker.json").write_text(json.dumps(manifest, indent=2) + "\n")
print(f"speaker at ({x:.1f}, {y:.1f}) {width:.1f}×{height:.1f}; shadow {shadow.sum()} px")
