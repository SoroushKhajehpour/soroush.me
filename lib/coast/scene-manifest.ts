import derived from "@/public/coast/manifest.json";
import panorama from "@/public/coast/pano/manifest.json";
import type { CSSProperties } from "react";

export const scene = derived;
export const pano = panorama;
export type Bounds = { x: number; y: number; width: number; height: number };
export type SceneAction = "open-life" | "open-music";
export const sceneObjects = [
  { id: "camera", action: "open-life", label: "Life — photographs", ...scene.objects.camera },
  { id: "speaker", action: "open-music", label: "On repeat — music", ...scene.objects.speaker },
] as const;

/**
 * Texture sets the renderer can draw. Both share world coordinates (x = Home scene x).
 * `home` is the 2335 px Home scene, used by the stacked phone layout. `pano` is the
 * 5580 px panorama (scripts/extract-panorama.py), whose water and data layers only cover
 * rows from `dataTop` down. Left of `join` the Home sky layers (atmosphere, sun) apply;
 * sunset-only effects fade out between `dusk[0]` and `dusk[1]`.
 */
export interface AssetSet {
  dir: string;
  width: number;
  height: number;
  dataTop: number;
  join: number;
  dusk: readonly [number, number];
  /** Where the original Home layers are kept while the Home objects are visible. */
  patch: Bounds | null;
}
export const assetSets = {
  home: { dir: "/coast/", width: scene.width, height: scene.height, dataTop: 0, join: 1e6, dusk: [1e6, 1e6 + 1], patch: null },
  pano: { dir: "/coast/pano/", width: pano.width, height: pano.height, dataTop: pano.dataTop, join: pano.join, dusk: [pano.duskStart, pano.duskEnd], patch: pano.patch },
} satisfies Record<string, AssetSet>;
export type AssetSetName = keyof typeof assetSets;

/**
 * The world is wider than any one screen. CSS publishes the Home window as --x0/--y0
 * (top-left) and --ww/--wh (size) in scene pixels (see globals.css); while panning, the
 * camera's left edge is --cam. The canvas, fallback still and every object place
 * themselves inside that window.
 */
export function boundsStyle(bounds: Bounds): CSSProperties {
  return {
    left: `calc((${bounds.x} - var(--cam, var(--x0))) / var(--ww) * 100%)`,
    top: `calc((${bounds.y} - var(--y0)) / var(--wh) * 100%)`,
    width: `calc(${bounds.width} / var(--ww) * 100%)`,
    height: `calc(${bounds.height} / var(--wh) * 100%)`,
  };
}

export interface SceneFrame { x: number; y: number; width: number; height: number }

/** Reads the Home scene window that CSS computed for this element. */
export function readFrame(element: HTMLElement): SceneFrame {
  const style = getComputedStyle(element);
  const read = (name: string, fallback: number) => {
    const value = parseFloat(style.getPropertyValue(name));
    return Number.isFinite(value) ? value : fallback;
  };
  return {
    x: read("--cam", read("--x0", scene.padLeft)), y: read("--y0", 0),
    width: read("--ww", scene.sourceWidth), height: read("--wh", scene.height),
  };
}

export function sourceToScreen(point: { x: number; y: number }, rect: Bounds) {
  return {
    x: rect.x + point.x * rect.width / scene.width,
    y: rect.y + point.y * rect.height / scene.height,
  };
}

export function screenToSource(point: { x: number; y: number }, rect: Bounds) {
  return {
    x: (point.x - rect.x) * scene.width / rect.width,
    y: (point.y - rect.y) * scene.height / rect.height,
  };
}
