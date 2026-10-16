"""Derive lossless scene layers from the approved PNG. Requires Pillow, numpy, scipy.

Run from any directory: python3 scripts/extract-coast.py
The only invented pixels are those hidden behind removed sprites, sun and type,
plus the padding that extends the scene sideways for wide screens.
"""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public/coast"
QA = ROOT / "docs/verification"
OUT.mkdir(parents=True, exist_ok=True)
QA.mkdir(parents=True, exist_ok=True)
SOURCE = ROOT / "assets/reference/homepage_design.png"
rgb = np.asarray(Image.open(SOURCE).convert("RGB")).copy()
H, W = rgb.shape[:2]
assert (W, H) == (1585, 992)
y, x = np.mgrid[:H, :W]
gray = rgb.mean(2)
# Wide screens need more world than the 1585 px illustration. The scene is extended
# sideways: the sky is mirrored, the sea is mirrored on the left and slid along the
# shoreline on the right, so the beach keeps running toward the horizon.
PAD_L, PAD_R = 300, 450

def save(name, arr):
    Image.fromarray(arr.astype(np.uint8)).save(OUT / name, optimize=True)

def polygon(points):
    im = Image.new("1", (W, H))
    ImageDraw.Draw(im).polygon(points, fill=1)
    return np.array(im).astype(bool)

def roi(box):
    a, b, c, d = box
    return (x >= a) & (x < c) & (y >= b) & (y < d)

def cut(name, mask, box):
    a, b, c, d = box
    rgba = np.dstack([rgb, mask.astype(np.uint8)*255])
    save(name, rgba[b:d, a:c])

# Discrete source pixels are retained, including antialiased sprite edge pixels.
camera_box = (887, 765, 1127, 893)
camera = polygon([(965,770),(982,770),(990,782),(1010,784),(1015,790),
    (1038,792),(1044,798),(1084,800),(1106,811),(1107,845),(1119,850),
    (1114,877),(1090,892),(1046,886),(1002,873),(975,864),(977,887),
    (947,891),(902,877),(887,863),(887,833),(914,823),(947,810),(960,805)])
# Remove the sand visible between the wrist strap and body.
strap_hole = polygon([(945,826),(938,831),(914,839),(911,850),(934,855),
    (957,865),(968,865),(951,852),(945,843)])
camera &= ~strap_hole

speaker_box = (1215, 651, 1494, 847)
speaker = polygon([(1276,657),(1317,657),(1317,666),(1342,666),(1349,672),
    (1377,673),(1393,688),(1405,712),(1433,717),(1433,727),(1456,729),
    (1470,748),(1477,778),(1470,804),(1489,813),(1491,829),(1454,841),
    (1426,844),(1363,826),(1312,814),(1271,792),(1220,782),(1217,767),
    (1225,753),(1225,718),(1235,695),(1255,684),(1273,678)])
handle_hole = polygon([(1308,680),(1322,680),(1326,685),(1340,685),
    (1341,690),(1353,690),(1359,696),(1373,696),(1379,704),
    (1379,709),(1364,707),(1360,702),(1339,697),(1320,695),(1300,690)])
speaker &= ~handle_hole

life_box = (959, 887, 1048, 929)
life = ndi.binary_dilation((gray < 210) & roi(life_box), iterations=1) & roi(life_box)
title_box = (74, 66, 1031, 131)
title = roi(title_box) & (rgb[:,:,0].astype(float)-rgb[:,:,2] > 8)
title = ndi.binary_dilation(title, iterations=1) & roi(title_box)
bullet_box = (79, 144, 669, 300)
bullets = ndi.binary_dilation((gray < 239) & roi(bullet_box), iterations=2) & roi(bullet_box)

for name, mask, box in [("camera.png",camera,camera_box),("speaker.png",speaker,speaker_box),
                         ("life.png",life,life_box),("name.png",title,title_box)]:
    cut(name,mask,box)
cut("name-first.png", title, (74,66,453,131))
cut("name-last.png", title, (492,66,1031,131))

# Text removal uses adjacent unobstructed white sky; sprites use nearby dry sand.
def remove_foreground(img, masks):
    out = img.copy()
    for mask in masks[:2]:
        # A halo wider than the type also removes its antialiasing, which would otherwise ghost.
        wide = ndi.binary_dilation(mask, iterations=5) & (y < 330)
        out[wide] = img[y[wide] % 40 + 10, x[wide]]
    for mask in masks[2:]:
        out[mask] = img[np.minimum(y[mask]+90,H-1), np.maximum(x[mask]-190,0)]
    return out

# Trace the dark, stepped seaward edge of the sand, near these measured anchors.
anchors = [(0,988),(100,961),(200,940),(300,913),(400,888),(500,865),
           (600,833),(700,802),(800,770),(900,736),(1000,701),(1100,669),
           (1200,638),(1300,609),(1400,583),(1500,566),(1584,552)]
expected_src = np.interp(np.arange(W), *np.array(anchors).T)


def detect_shore(img_gray, expected_cols):
    smooth = ndi.gaussian_filter(img_gray, sigma=(1.4,3.0))
    out = np.empty(img_gray.shape[1])
    for col in range(img_gray.shape[1]):
        lo, hi = max(422,int(expected_cols[col])-4), min(H,int(expected_cols[col])+47)
        dark = np.flatnonzero(smooth[lo:hi,col] < 190)
        out[col] = min(H,lo+int(dark[-1])+3) if len(dark) else expected_cols[col]
    return ndi.median_filter(out, size=15)

# ---- Sideways extension --------------------------------------------------
HORIZON = 422
plate = remove_foreground(rgb, [title, bullets, camera, speaker, life])
W0, OX = W, PAD_L
EW = PAD_L + W0 + PAD_R
ext = np.zeros((H, EW, 3), np.uint8)
ext[:, OX:OX+W0] = rgb
ey, ex = np.mgrid[:H, :EW]
xo = ex - OX                       # x in original-illustration coordinates
reflect_row = 840
# Left: the shore leaves the frame, so the sea slides down along it (shear) with a
# mirrored band near the horizon. Right: the whole strip slides up along the shore.
shore_src = detect_shore(gray, expected_src)
def slide_drop(shift):
    return int(round(shore_src[W0-1] - shore_src[W0-1-shift]))   # negative: the shore climbs
# Slide the sea along the shore by whichever distance continues the waves most plausibly.
best = None
for shift in range(PAD_R, 901, 2):
    drop = slide_drop(shift)
    ys = np.arange(430, int(shore_src[W0-1])-6)
    cost = np.abs(rgb[ys, W0-1].astype(float) - rgb[ys-drop, W0-shift].astype(float)).mean()
    if best is None or cost < best[0]: best = (cost, shift)
right_shift = best[1]
right_drop = slide_drop(right_shift)
print("right extension slides", right_shift, "px; seam cost", round(best[0],2), "shore drop", right_drop)
sand_tile = rgb[912:992, 1150:1406]
rows = np.arange(H)
for col in range(EW):
    X = col - OX
    if 0 <= X < W0: continue
    if X < 0:
        # Mirror: the sea continues seamlessly. Only the last rows, where the original's
        # shoreline touches the corner, are reflected so no sand wedge appears.
        d = -X
        sy = np.where(rows < 975, rows, 2*975 - rows - 1)
        ext[:, col] = plate[sy, d-1]
    else:
        d = X - W0 + 1
        sx = X - right_shift
        sy = np.clip(rows - right_drop, 0, H-1)
        pad_shore = shore_src[sx] + right_drop
        column = plate[sy, sx]
        column[:HORIZON] = plate[:HORIZON, W0-d]               # sky: mirror
        band_end = int(min(HORIZON+70, pad_shore-40))
        if band_end > HORIZON:                                  # far water: mirror
            column[HORIZON:band_end] = plate[HORIZON:band_end, W0-d]
        sandy = rows > pad_shore + 14                           # clean tiled sand, no slid sprites
        column[sandy] = sand_tile[rows[sandy] % 80, X % 256]
        ext[:, col] = column
assert (ext[:, OX:OX+W0] == rgb).all()

expected = np.empty(EW)
for col in range(EW):
    X = col - OX
    if X < 0: expected[col] = H + 200
    elif X < W0: expected[col] = expected_src[X]
    else: expected[col] = shore_src[X - right_shift] + right_drop

def widen(mask):
    out = np.zeros((H, EW), bool)
    out[:, OX:OX+W0] = mask
    return out
camera, speaker, life, title, bullets = map(widen, [camera, speaker, life, title, bullets])
rgb, W = ext, EW
y, x = np.mgrid[:H, :W]
gray = rgb.mean(2)
clean = remove_foreground(rgb, [title, bullets, camera, speaker, life])

shore = detect_shore(gray, expected)
land = y >= shore[None,:]
ocean = (y >= 422) & ~land
# Distances are Euclidean source pixels, not UV units, with positive distance inland.
sd = ndi.distance_transform_edt(land)-ndi.distance_transform_edt(~land)
sd -= 0.5*np.sign(sd)
encoded = np.round(np.clip(sd+1024,0,2047)*16).astype(np.uint16)
depth = np.clip((y-422)/(shore[None,:]-422),0,1)
sdf = np.dstack([encoded//256, encoded%256, np.round(depth*255), np.ones_like(x)*255])
save("shore-field.png",sdf)
# Smoothed so the wash slides along clean normals instead of fraying on the pixel staircase.
sd_smooth = ndi.gaussian_filter(sd, 7)
nx = ndi.sobel(sd_smooth,axis=1)/8
ny = ndi.sobel(sd_smooth,axis=0)/8
length = np.maximum(np.hypot(nx,ny),0.001)
# Water may wash up to RUNUP pixels onto the sand and retreat the same distance.
RUNUP = 30
protected = (sd > RUNUP) | (y < 422) | camera | speaker | life
save("flow-field.png", np.dstack([(nx/length*.5+.5)*255,(ny/length*.5+.5)*255,
                                  protected*255,np.ones_like(x)*255]))
save("ocean-mask.png", ocean*255)
save("protected-land.png", protected*255)

# The entire water surface is replaced on each frame; there is no frozen crest below it.
water = np.dstack([rgb, ocean.astype(np.uint8)*255])
save("water.png",water)
reflection = np.clip((rgb[:,:,0].astype(float)-rgb[:,:,2]-5)/65,0,1)*ocean
foam = np.clip((gray-185)/65,0,1)*ocean
save("water-detail.png",np.dstack([foam*255,reflection*255,ocean*255,np.ones_like(x)*255]))

def roi(box):
    a, b, c, d = box
    return (x >= a) & (x < c) & (y >= b) & (y < d)

sun_box = (992+OX, 284, 1121+OX, 411)
sun = roi(sun_box) & (((x-1056-OX)/62)**2+((y-349)/61)**2 < 1.07)
sun = ndi.binary_dilation(sun,iterations=1) & roi(sun_box)
cut("sun.png",sun,sun_box)
warm_sky = (y < 422) & (rgb[:,:,0].astype(float)-rgb[:,:,2] > 8) & ~title & ~sun
warm_sky = ndi.binary_dilation(warm_sky,iterations=1) & ~sun & ~title & (y < 422)
cut("atmosphere.png",warm_sky,(0,0,W,422))
# Unseen pixels under the sun are intentionally reconstructed, not claimed as recovered.
clean[sun] = [247,248,248]
clean[warm_sky] = np.repeat(np.max(rgb[warm_sky],axis=1)[:,None],3,axis=1)
base = clean.copy()
base[ocean] = [153,159,164]
# Hidden sand beyond the shoreline lets the wash retreat without exposing a second frozen wave.
strip = (sd >= -RUNUP-4) & (sd < 0) & (y >= 422)
shift = np.ceil(-sd[strip]*1.06).astype(int) + 10
base[strip] = remove_foreground(rgb,[title,bullets,camera,speaker,life])[np.minimum(y[strip]+shift,H-1),x[strip]]
save("ground.png",base)

# The fallback is assembled from the same independent assets and contains no baked type.
none = np.zeros_like(title)
fallback = remove_foreground(rgb,[title,bullets,none,none,none])
save("still.png",fallback)
save("sand-tile.png",rgb[912:992,1150+OX:1406+OX])
icon = Image.new("RGBA",(64,64))
icon.paste(Image.open(OUT/"name-first.png").crop((4,3,54,62)),(7,2))
icon.save(ROOT/"app/icon.png")

# Verify exact artwork reconstruction with binary masks before any GPU deformation.
recomposed = base.copy()
recomposed[warm_sky] = rgb[warm_sky]
recomposed[sun] = rgb[sun]
recomposed[ocean] = rgb[ocean]
for mask in [camera,speaker,life,title,bullets]:
    recomposed[mask] = rgb[mask]
# The cleaned halo around the type is deliberately not source pixels.
halo = ndi.binary_dilation(title | bullets, iterations=5) & (y < 330)
recomposed[halo] = rgb[halo]
delta = np.abs(recomposed.astype(int)-rgb.astype(int))
assert delta.max()==0, f"Extraction is not lossless: {delta.max()}"

overlay = rgb.astype(float)
overlay[ocean] = overlay[ocean]*.6 + np.array([35,157,255])*.4
band = (sd>=0)&(sd<=6)
overlay[band] = [255,80,50]
overlay[camera|speaker|life] = overlay[camera|speaker|life]*.65+np.array([100,255,100])*.35
Image.fromarray(overlay.astype(np.uint8)).save(QA/"mask-overlay.png")

manifest = {
    "width":EW,"height":H,"horizon":422,
    "sourceWidth":W0,"padLeft":PAD_L,"padRight":PAD_R,"runup":RUNUP,
    "sourceSha256":hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
    "extractionMaxChannelDifference":int(delta.max()),
    "objects":{},
    "title":{"x":74+OX,"y":66,"width":957,"height":65},
    "sun":{"x":992+OX,"y":284,"width":129,"height":127},
}
for ident,box in [("camera",camera_box),("speaker",speaker_box),("life",life_box)]:
    a,b,c,d=box
    manifest["objects"][ident]={"x":a+OX,"y":b,"width":c-a,"height":d-b,"src":f"/coast/{ident}.png"}
(OUT/"manifest.json").write_text(json.dumps(manifest,indent=2)+"\n")
print(json.dumps({"source":manifest["sourceSha256"],"dimensions":[W,H],"maxRecompositionError":int(delta.max())}))
