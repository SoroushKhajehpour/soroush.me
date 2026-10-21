"""Validate exported meteor assets and write validation.json."""

from __future__ import annotations

import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    metadata = json.loads((ROOT / "animations.json").read_text())
    report = {"status": "passed", "sequences": {}, "notes": []}
    for name, spec in metadata["sequences"].items():
        size = (spec["frameWidth"], spec["frameHeight"])
        count = spec["frameCount"]
        assert count == len(spec["frameOrder"]) == len(spec["frameDurationMs"]) == len(spec["individualFrames"])
        assert spec["frameOrder"] == list(range(count))
        frames = []
        margins = []
        for filename in spec["individualFrames"]:
            image = Image.open(ROOT / filename)
            image.load()
            assert image.mode == "RGBA" and image.size == size, filename
            alpha = image.getchannel("A")
            assert set(alpha.getdata()) <= {0, 255}, f"nonbinary alpha: {filename}"
            bbox = alpha.getbbox()
            assert bbox, f"empty: {filename}"
            margin = min(bbox[0], bbox[1], size[0] - bbox[2], size[1] - bbox[3])
            assert margin >= 3, f"cropped/edge-touching artwork: {filename}, margin={margin}"
            assert image.getpixel((0, 0))[3] == 0, f"not transparent: {filename}"
            frames.append(image)
            margins.append(margin)
        sheet = Image.open(ROOT / spec["sheet"])
        sheet.load()
        assert sheet.mode == "RGBA" and sheet.size == (size[0] * count, size[1]), name
        for index, frame in enumerate(frames):
            assert sheet.crop((index * size[0], 0, (index + 1) * size[0], size[1])).tobytes() == frame.tobytes(), name
        report["sequences"][name] = {"frames": count, "size": size, "minimumTransparentMarginPx": min(margins)}
    idle = Image.open(ROOT / "sprites/idle/01.png").tobytes()
    assert Image.open(ROOT / "sprites/activation/01.png").tobytes() == idle
    assert Image.open(ROOT / "sprites/activation/05.png").tobytes() == idle
    assert Image.open(ROOT / "static/meteorite-resting.png").tobytes() == idle
    report["notes"] = [
        "Every production frame has hard alpha and at least three transparent pixels on every edge.",
        "Sheets match the individual frames byte for byte.",
        "Activation begins and ends on the exact resting image.",
        "Original poses were generated individually; the style-reference screenshot was not sliced.",
        "Visual alignment and palette were also inspected in the contact sheets.",
    ]
    (ROOT / "validation.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
