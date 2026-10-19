"""Derive the panoramic scene layers (Home -> Projects -> Experience) for the desktop site.

Run after scripts/extract-coast.py:  python3 scripts/extract-panorama.py
Requires Pillow, numpy, scipy.

World coordinates are the Home scene's own (x = scene x of public/coast/still.png), so the
Home view is unchanged at every aspect ratio. The world is the Home still's leftmost 236
columns followed by the approved 5344 px panorama (assets/reference/coast-v2), whose
first 1744 columns are the Home crop 236..1980 with the camera, speaker and inscription
inpainted away. The panorama is therefore object free everywhere; the Home objects are
separate sprites that fade before the camera pans.

Left of JOIN the sky layers are the Home ones (ground sky, atmosphere and sun, which the
shader animates); right of JOIN the panorama's own sky is used directly. Below the horizon
every layer is rebuilt from the clean world with one continuous shoreline, which follows
the Home shoreline left of JOIN and the panorama's detected foam line to its right.
Water and data layers only cover rows 422..991, the sky never needs them.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parents[1]
HOME = ROOT / "public/coast"
OUT = HOME / "pano"
QA = Path(__import__("os").environ.get("PANO_QA", ROOT / "docs/verification/panorama"))
OUT.mkdir(parents=True, exist_ok=True)
QA.mkdir(parents=True, exist_ok=True)
REF = ROOT / "assets/reference/coast-v2"

HORIZON, RUNUP = 422, 30
OFFSET = 236                 # world x of the panorama's first column
JOIN = 1900                  # inside 1846..1980, where the panorama equals the Home still
ZONES = {"home": 0, "projects": 1914 + OFFSET, "experience": 3600 + OFFSET}
DESIGN_WINDOW = 1744         # the window width the zone anchors were composed for

def load(path, mode="RGB"):
    return np.asarray(Image.open(path).convert(mode))

def save(name, arr, **kw):
    Image.fromarray(np.ascontiguousarray(arr).astype(np.uint8)).save(OUT / name, optimize=True, **kw)

still = load(HOME / "still.png")
master = load(REF / "continuous-master.png")
H = master.shape[0]
assert still.shape == (992, 2335, 3) and master.shape == (992, 5344, 3)
home_crop = still[:, OFFSET:OFFSET + 1744]
assert (master[:HORIZON, :1744] == home_crop[:HORIZON]).all(), "panorama sky must equal the Home sky"
assert (master[:, JOIN - OFFSET:1980 - OFFSET] == still[:, JOIN:1980]).all(), "join band must be identical"

world = np.concatenate([still[:, :OFFSET], master], axis=1)   # clean: no sprites anywhere
W = world.shape[1]
y, x = np.mgrid[:H, :W]
gray = world.mean(2)
lum = world.astype(float) @ [0.2126, 0.7152, 0.0722]

def home_manifest_objects():
    return json.loads((HOME / "manifest.json").read_text())["objects"]

# ---- shoreline -------------------------------------------------------------------
old_ocean = load(HOME / "ocean-mask.png", "L") > 127
old_shore = np.array([np.flatnonzero(old_ocean[:, c]).max() + 1 for c in range(old_ocean.shape[1])], float)

def detect(lum):
    """Lowest row of the sea, taken through the bright shore foam, for every column."""
    med = ndi.median_filter(lum, size=(9, 9))
    sea = ndi.uniform_filter1d(np.median(med[428:446], axis=0), 101)
    sand = ndi.uniform_filter1d(np.median(med[H - 60:H], axis=0), 101)
    threshold = (sea + sand) / 2
    est = np.empty(lum.shape[1])
    for c in range(lum.shape[1]):
        dark = np.flatnonzero(med[HORIZON:, c] < threshold[c])
        est[c] = HORIZON + dark[-1] if len(dark) else HORIZON
    est = ndi.median_filter(est, 31)
    fine = ndi.gaussian_filter(lum, (1, 2))
    out = est.copy()
    for c in range(lum.shape[1]):
        y0 = int(est[c])
        bright = np.flatnonzero(fine[y0:min(H, y0 + 45), c] > sand[c] + 12)
        if len(bright): out[c] = y0 + bright[-1] + 2
    return ndi.gaussian_filter1d(ndi.median_filter(out, 21), 6)

new_shore = detect(lum)
shore = new_shore.copy()
shore[:JOIN] = old_shore[:JOIN]
# Meet the Home shoreline exactly at the join, easing into the detected line over 200 px.
gap = old_shore[JOIN] - new_shore[JOIN]
ramp = np.clip(1 - (np.arange(W) - JOIN) / 200, 0, 1)
shore[JOIN:] = new_shore[JOIN:] + gap * ramp[JOIN:]
shore = np.clip(shore, HORIZON + 2, H)

# ---- join repair -------------------------------------------------------------------
# Where the Home art meets the new art the beach had two shorelines: the Home foam band
# peels off into the sea as a wave crest, while the new art's shore foam starts ~25 px
# lower at x 2075, leaving a grey wedge that read as a second strip of water. The art is
# corrected, not faded. A smooth target shoreline S continues the Home shore into the new
# one; the new foam line (with the wet band under it) is moved up onto S, starting thin
# under the Home foam and thickening, like surf peeling away from the shore. The strip it
# leaves is refilled with sand from further down the same column, so no sand is sheared.
REPAIR_A, REPAIR_B = 2075, 2280
cols = np.arange(REPAIR_A, REPAIR_B + 1)
# Measured bottom of the new shore foam in the delivered art.
foam_bottom = np.round(np.interp(cols,
    [2075, 2080, 2100, 2120, 2140, 2160, 2180, 2200, 2220, 2240, 2260, 2280],
    [536, 535, 524, 516, 515, 516, 511, 507, 505, 500, 492, 488])).astype(int)
a, b = shore[REPAIR_A], foam_bottom[-1]
ma = shore[REPAIR_A] - shore[REPAIR_A - 12]                 # Home slope per 12 px
mb = new_shore[REPAIR_B + 12] - new_shore[REPAIR_B]
t = (cols - REPAIR_A) / (REPAIR_B - REPAIR_A)
span = (REPAIR_B - REPAIR_A) / 12
target = ((2*t**3 - 3*t**2 + 1) * a + (t**3 - 2*t**2 + t) * span * ma
          + (-2*t**3 + 3*t**2) * b + (t**3 - t**2) * span * mb)
target = np.minimum(np.round(target).astype(int), foam_bottom)
FOAM, WET, SAND_FROM = 16, 12, 70
grow = np.clip((cols - REPAIR_A) / 35, 0, 1)
source = world.copy()
for i, c in enumerate(cols):
    S, L = target[i], foam_bottom[i]
    if L <= S: continue
    f, w = int(round(FOAM * grow[i])), int(round(WET * grow[i]))
    world[S - f:S + w, c] = source[L - f:L + w, c]
    rows_fill = np.arange(S + w, L + WET)
    world[rows_fill, c] = source[np.minimum(rows_fill + SAND_FROM, H - 1), c]
shore[REPAIR_A:REPAIR_B + 1] = target
# Let the detected line take over smoothly after the repaired span.
after = np.arange(REPAIR_B + 1, min(W, REPAIR_B + 120))
k = (after - REPAIR_B) / 120
shore[after] = (1 - k) * (target[-1] + (new_shore[after] - new_shore[REPAIR_B])) + k * new_shore[after]
gray = world.mean(2)
print(f"join repair moved the shore foam in columns {REPAIR_A}..{REPAIR_B} by up to {(foam_bottom - target).max()} px")
print(f"join gap {gap:+.1f}px; shoreline at projects {shore[ZONES['projects'] + 800]:.0f}, experience right edge {shore[-1]:.0f}")

land = y >= shore[None, :]
ocean = (y >= HORIZON) & ~land
sd = ndi.distance_transform_edt(land) - ndi.distance_transform_edt(~land)
sd -= 0.5 * np.sign(sd)
encoded = np.round(np.clip(sd + 1024, 0, 2047) * 16).astype(np.uint16)
depth = np.round(np.clip((y - HORIZON) / np.maximum(shore[None, :] - HORIZON, 1), 0, 1) * 255)
# The Home field measures depth against a shoreline that continues below the frame on the
# left; keep its values so Home's travelling light is unchanged.
depth[:, :JOIN] = load(HOME / "shore-field.png", "RGBA")[:, :JOIN, 2]
sd_smooth = ndi.gaussian_filter(sd, 7)
nx = ndi.sobel(sd_smooth, axis=1) / 8
ny = ndi.sobel(sd_smooth, axis=0) / 8
length = np.maximum(np.hypot(nx, ny), 0.001)
protected = (sd > RUNUP) | (y < HORIZON)
ones = np.full((H, W), 255)

# ---- layers ------------------------------------------------------------------------
base = world.copy()
old_ground = load(HOME / "ground.png")
base[:HORIZON, :JOIN] = old_ground[:HORIZON, :JOIN]       # sun and warm sky live in their own layers
base[ocean] = [153, 159, 164]
strip = (sd >= -RUNUP - 4) & (sd < 0) & (y >= HORIZON)
shift = np.ceil(-sd[strip] * 1.06).astype(int) + 10
base[strip] = world[np.minimum(y[strip] + shift, H - 1), x[strip]]
reflection = np.clip((world[:, :, 0].astype(float) - world[:, :, 2] - 5) / 65, 0, 1) * ocean * (x < JOIN)
foam = np.clip((gray - 185) / 65, 0, 1) * ocean

rows = slice(HORIZON, H)
save("ground.png", base)
save("water.png", np.dstack([world, ocean * 255])[rows])
save("shore-field.png", np.dstack([encoded // 256, encoded % 256, depth, ones])[rows])
save("flow-field.png", np.dstack([(nx / length * .5 + .5) * 255, (ny / length * .5 + .5) * 255, protected * 255, ones])[rows])
save("water-detail.png", np.dstack([foam * 255, reflection * 255, ocean * 255, ones])[rows])

# ---- Home patch ----------------------------------------------------------------------
# The panorama's own inpainting under the camera and speaker is clean but not identical to
# the Home art around them (grain, the speaker's shadow, the wash line beside it). While the
# objects are on screen the shader therefore draws the original Home layers in this patch,
# and fades it to the clean panorama at the same rate as the objects (uObjects), so neither
# a changed Home nor the old plate's remnants under the sprites is ever seen on its own.
# Outside the patch the two plates are identical. Under the sprites themselves (always
# covered while visible) the old layers carry remnants of the sprites, so they take the
# clean layers.
PATCH = (1120, 580, 1880, 992)
px0, py0, px1, py1 = PATCH
# Left of 1980 the panorama is the Home still except where the objects were removed.
diff = np.abs(world[:, :1980].astype(int) - still[:, :1980]).max(2) > 0
inside = np.zeros_like(diff); inside[py0:py1, px0:px1] = True
assert not (diff & ~inside).any(), "the patch must cover every changed Home pixel"
old_water = load(HOME / "water.png", "RGBA")
sprites_px = np.zeros((H, 2335), bool)
for name, o in home_manifest_objects().items():
    alpha = load(HOME / f"{name}.png", "RGBA")[..., 3] > 0
    sprites_px[o["y"]:o["y"] + o["height"], o["x"]:o["x"] + o["width"]] |= alpha
# Exactly the pixels the sprites cover, so the Home view keeps every original pixel.
patch_water = old_water.copy()
clean_water = np.dstack([world[:, :2335], ocean[:, :2335] * 255])
patch_water[sprites_px] = clean_water[sprites_px]
# The old plate also holds remnants of the objects under the sprites; there the patch
# takes the clean ground as well, so a half-faded sprite only ever shows clean sand.
patch_ground = old_ground.copy()
patch_ground[sprites_px] = base[:, :2335][sprites_px]
save("home-patch-ground.png", patch_ground[py0:py1, px0:px1])
save("home-patch-water.png", patch_water[py0:py1, px0:px1])

# Static images: the no-WebGL fallback (clean, the DOM sprites sit on it) and the phone strips.
Image.fromarray(world).save(OUT / "still.webp", lossless=True, method=6)
# Each strip ends on the colour its stacked section continues in: dusk sand, night sea.
STRIPS = {"projects": (2380, 250, 3080, 750), "experience": (4420, 200, 5120, 640)}
for name, box in STRIPS.items():
    Image.fromarray(world).crop(box).save(OUT / f"{name}-strip.webp", lossless=True, method=6)

def edge_colour(box):
    a, b, c, d = box
    return "#%02x%02x%02x" % tuple(int(v) for v in np.median(world[d - 12:d, a:c].reshape(-1, 3), axis=0))

manifest = {
    "patch": {"x": px0, "y": py0, "width": px1 - px0, "height": py1 - py0},
    "width": W, "height": H, "horizon": HORIZON, "dataTop": HORIZON, "join": JOIN,
    "panoramaOffset": OFFSET, "designWindow": DESIGN_WINDOW, "zones": ZONES,
    "strips": {k: {"x": v[0], "y": v[1], "width": v[2] - v[0], "height": v[3] - v[1], "edge": edge_colour(v)} for k, v in STRIPS.items()},
    "duskStart": 1600, "duskEnd": 2900,
}
(OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")

# ---- checks --------------------------------------------------------------------------
# Away from the old sprites and the join, the rebuilt Home layers must equal the old ones.
sprites = np.zeros((H, 2335), bool)
home_manifest = json.loads((HOME / "manifest.json").read_text())
for o in home_manifest["objects"].values():
    sprites[o["y"]:o["y"] + o["height"], o["x"]:o["x"] + o["width"]] = True
sprites = ndi.binary_dilation(sprites, iterations=60)
check = ~sprites[:, :JOIN - 100]
for name in ["water.png", "water-detail.png", "shore-field.png"]:
    a = load(HOME / name, "RGBA")[:, :JOIN - 100][rows]
    b = load(OUT / name, "RGBA")[:, :JOIN - 100]
    diff = (np.abs(a.astype(int) - b).max(2) > (1 if name != "shore-field.png" else 0)) & check[rows]
    print(f"{name}: {diff.mean() * 100:.3f}% of Home pixels differ outside the sprite areas")
a = old_ground[:, :JOIN - 100]; b = load(OUT / "ground.png")[:, :JOIN - 100]
print(f"ground.png: {((np.abs(a.astype(int) - b).max(2) > 0) & check).mean() * 100:.3f}% differ outside the sprite areas")

overlay = world.copy()
for c in range(W):
    r = int(round(shore[c])); overlay[max(0, r - 1):r + 1, c] = [255, 40, 40]
overlay[:, JOIN] = [40, 255, 40]
Image.fromarray(overlay[380:]).resize((W // 3, (H - 380) // 3), Image.NEAREST).save(QA / "shoreline.png")
Image.fromarray(overlay[380:, JOIN - 350:JOIN + 350]).save(QA / "join.png")
print("wrote", sorted(p.name for p in OUT.iterdir()))
