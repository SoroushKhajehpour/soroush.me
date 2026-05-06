"use client";

import { useEffect, useState } from "react";

type GrainType = "standard" | "rough" | "color" | "film" | "digital";

type BlendMode =
  | "normal"
  | "multiply"
  | "screen"
  | "overlay"
  | "darken"
  | "lighten"
  | "color-dodge"
  | "color-burn"
  | "hard-light"
  | "soft-light"
  | "difference"
  | "exclusion"
  | "hue"
  | "saturation"
  | "color"
  | "luminosity";

type GrainProps = {
  type?: GrainType;
  opacity?: number;
  blendMode?: BlendMode;
  size?: number;
  contrast?: number;
  brightness?: number;
};

export default function Grain({
  type = "film",
  opacity = 0.25,
  blendMode = "multiply",
  size = 1,
  contrast = 100,
  brightness = 100,
}: GrainProps) {
  const [noiseUrl, setNoiseUrl] = useState<string>("");

  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imageData = ctx.createImageData(128, 128);
    const data = imageData.data;
    let currentSeed = 1;
    const random = () => {
      const x = Math.sin(currentSeed++) * 1e4;
      return x - Math.floor(x);
    };

    for (let i = 0; i < data.length; i += 4) {
      if (type === "color") {
        data[i] = random() * 255;
        data[i + 1] = random() * 255;
        data[i + 2] = random() * 255;
      } else if (type === "rough") {
        const val = random() > 0.5 ? 255 : 0;
        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
      } else if (type === "film") {
        const u = 1 - random();
        const v = random();
        const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
        const val = Math.max(0, Math.min(255, 128 + z * 64));
        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
      } else if (type === "digital") {
        const levels = 4;
        const val = Math.floor(random() * levels) * (255 / (levels - 1));
        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
      } else {
        const val = random() * 255;
        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
      }
      data[i + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
    setNoiseUrl(canvas.toDataURL());
  }, [type]);

  if (!noiseUrl) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{ opacity, mixBlendMode: blendMode }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${noiseUrl})`,
          backgroundRepeat: "repeat",
          backgroundSize: `${128 * size}px`,
          imageRendering: "pixelated",
          filter: `contrast(${contrast}%) brightness(${brightness}%)`,
        }}
      />
    </div>
  );
}
