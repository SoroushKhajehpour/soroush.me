"""Build pixel-sharp sprites from separately generated RGBA source images.

No source sheet is sliced here. Each input file is one independently generated pose.
Run from any directory: python3 pixel-meteor-animation-pack/source/build_pack.py
Requires Pillow.
"""

from __future__ import annotations

import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "source" / "generated"

# All poses were authored separately at 1536 x 1024. A fixed 1:8 reduction
# recovers the intentional pixel clusters; nearest-neighbour is the only resize.
SCALE = 8
ALPHA_CUTOFF = 128  # remove the generated soft halo, keep solid pixels and sparks

SEQUENCES = {
    "flight": {
        "source": ["flight-01", "flight-02", "flight-03"],
        "size": (192, 128),
        "anchor": (44, 103),
        "durations": [85, 85, 85],
        "loop": True,
        "recommended_scale": 2,
    },
    "impact": {
        "source": [f"impact-{i:02d}" for i in range(1, 7)],
        "size": (224, 160),
        "anchor": (112, 140),
        "durations": [75, 65, 90, 100, 110, 130],
        "loop": False,
        "recommended_scale": 2,
    },
    "idle": {
        "source": ["idle-01", "idle-02"],
        "size": (128, 96),
        "anchor": (64, 64),
        "durations": [850, 850],
        "loop": True,
        "recommended_scale": 2,
    },
    "activation": {
        "source": ["idle-01", "activation-01", "activation-02", "activation-03", "idle-01"],
        "size": (128, 96),
        "anchor": (64, 64),
        "durations": [90, 100, 120, 100, 90],
        "loop": False,
        "recommended_scale": 2,
    },
}

# Manually measured source-space anchors. These align the physical head/contact
# instead of centering each irregular silhouette (which would introduce jitter).
FLIGHT_HEAD = {
    "flight-01": (480, 756),
    "flight-02": (495, 777),
    "flight-03": (448, 793),
}
IMPACT_CONTACT = {
    "impact-01": (640, 873),
    "impact-02": (762, 861),
    "impact-03": (772, 796),
    "impact-04": (778, 821),
    "impact-05": (766, 838),
    "impact-06": (774, 800),
}


def clean_source(name: str) -> Image.Image:
    image = Image.open(SRC / f"{name}.png").convert("RGBA")
    assert image.size == (1536, 1024), (name, image.size)
    # Image generation produced real alpha, with a faint soft halo. Hard alpha
    # restores a pixel-art boundary without erasing solid pale details.
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            r, g, b, a = pixels[x, y]
            pixels[x, y] = (r, g, b, 255 if a >= ALPHA_CUTOFF else 0)
    return image.resize((image.width // SCALE, image.height // SCALE), Image.Resampling.NEAREST)


def normalize(name: str, sequence: str, size: tuple[int, int], anchor: tuple[int, int]) -> Image.Image:
    source = clean_source(name)
    if sequence == "flight":
        sx, sy = FLIGHT_HEAD[name]
        shift = (anchor[0] - round(sx / SCALE), anchor[1] - round(sy / SCALE))
    elif sequence == "impact":
        sx, sy = IMPACT_CONTACT[name]
        shift = (anchor[0] - round(sx / SCALE), anchor[1] - round(sy / SCALE))
    else:
        # All idle/activation poses were generated against the same resting-rock
        # reference. Use one fixed source-to-logical transform for every frame.
        shift = (-32, -33)
    out = Image.new("RGBA", size, (0, 0, 0, 0))
    out.paste(source, shift, source)
    # Check the actual solid pixels in the original transformed image, before
    # allowing a canvas boundary to silently crop anything.
    bbox = source.getchannel("A").getbbox()
    assert bbox is not None, name
    moved = (bbox[0] + shift[0], bbox[1] + shift[1], bbox[2] + shift[0], bbox[3] + shift[1])
    margin = min(moved[0], moved[1], size[0] - moved[2], size[1] - moved[3])
    assert margin >= 3, f"{name}: artwork too close to edge: {moved} in {size}; min margin {margin}"
    return out


def contact_sheet(name: str, frames: list[Image.Image], durations: list[int]) -> None:
    width, height = frames[0].size
    zoom = 2
    gap = 16
    label_h = 27
    background = (17, 35, 70, 255)
    sheet = Image.new("RGBA", (gap + len(frames) * (width * zoom + gap), height * zoom + label_h + 2 * gap), background)
    draw = ImageDraw.Draw(sheet)
    for index, frame in enumerate(frames):
        x = gap + index * (width * zoom + gap)
        y = gap + label_h
        sheet.alpha_composite(frame.resize((width * zoom, height * zoom), Image.Resampling.NEAREST), (x, y))
        draw.text((x, gap), f"{name} {index + 1:02d}  {durations[index]} ms", fill=(245, 225, 205, 255))
    sheet.convert("RGB").save(ROOT / "previews" / f"{name}-contact.png", optimize=True)


def main() -> None:
    for directory in ["sprites", "sheets", "static", "previews"]:
        (ROOT / directory).mkdir(exist_ok=True)
    animations = {}
    for name, spec in SEQUENCES.items():
        size = spec["size"]
        anchor = spec["anchor"]
        frame_dir = ROOT / "sprites" / name
        frame_dir.mkdir(exist_ok=True)
        frames = []
        frame_files = []
        for index, source_name in enumerate(spec["source"], 1):
            frame = normalize(source_name, name, size, anchor)
            filename = f"{index:02d}.png"
            frame.save(frame_dir / filename, optimize=True)
            frames.append(frame)
            frame_files.append(f"sprites/{name}/{filename}")
        strip = Image.new("RGBA", (size[0] * len(frames), size[1]), (0, 0, 0, 0))
        for index, frame in enumerate(frames):
            strip.alpha_composite(frame, (index * size[0], 0))
        strip.save(ROOT / "sheets" / f"meteor-{name}.png", optimize=True)
        contact_sheet(name, frames, spec["durations"])
        # Opaque dark-blue GIF preview avoids GIF's limited alpha support.
        preview = []
        for frame in frames:
            backdrop = Image.new("RGBA", size, (17, 35, 70, 255))
            backdrop.alpha_composite(frame)
            preview.append(backdrop.resize((size[0] * 2, size[1] * 2), Image.Resampling.NEAREST).convert("P", palette=Image.Palette.ADAPTIVE))
        preview[0].save(ROOT / "previews" / f"{name}.gif", save_all=True, append_images=preview[1:], duration=spec["durations"], loop=0 if spec["loop"] else 1, optimize=False, disposal=2)
        animations[name] = {
            "sheet": f"sheets/meteor-{name}.png",
            "individualFrames": frame_files,
            "frameWidth": size[0],
            "frameHeight": size[1],
            "frameCount": len(frames),
            "frameOrder": list(range(len(frames))),
            "frameDurationMs": spec["durations"],
            "loop": spec["loop"],
            "anchor": {"x": anchor[0], "y": anchor[1]},
            "contactPoint": {"x": anchor[0], "y": anchor[1]} if name != "flight" else None,
            "recommendedScale": spec["recommended_scale"],
            "imageRendering": "pixelated",
            "sourceImages": [f"source/generated/{source_name}.png" for source_name in spec["source"]],
        }
    (ROOT / "static" / "meteorite-resting.png").write_bytes((ROOT / "sprites" / "idle" / "01.png").read_bytes())
    (ROOT / "animations.json").write_text(json.dumps({"version": 1, "sequences": animations}, indent=2) + "\n")


if __name__ == "__main__":
    main()
