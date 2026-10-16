import derived from "@/public/coast/manifest.json";
import type { CSSProperties } from "react";

export const scene = derived;
export type Bounds = { x: number; y: number; width: number; height: number };
export type SceneAction = "open-life" | "open-music";
export const sceneObjects = [
  { id: "camera", action: "open-life", label: "Life — photographs", ...scene.objects.camera },
  { id: "speaker", action: "open-music", label: "On repeat — music", ...scene.objects.speaker },
] as const;

/**
 * The scene is wider than any one screen. CSS publishes the visible window as
 * --x0/--y0 (top-left) and --ww/--wh (size) in scene pixels (see globals.css), and the
 * canvas, fallback still and every object place themselves inside that window.
 */
export function boundsStyle(bounds: Bounds): CSSProperties {
  return {
    left: `calc((${bounds.x} - var(--x0)) / var(--ww) * 100%)`,
    top: `calc((${bounds.y} - var(--y0)) / var(--wh) * 100%)`,
    width: `calc(${bounds.width} / var(--ww) * 100%)`,
    height: `calc(${bounds.height} / var(--wh) * 100%)`,
  };
}

export interface SceneFrame { x: number; y: number; width: number; height: number }

/** Reads the visible scene window that CSS computed for this element. */
export function readFrame(element: HTMLElement): SceneFrame {
  const style = getComputedStyle(element);
  const read = (name: string, fallback: number) => {
    const value = parseFloat(style.getPropertyValue(name));
    return Number.isFinite(value) ? value : fallback;
  };
  return {
    x: read("--x0", scene.padLeft), y: read("--y0", 0),
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
