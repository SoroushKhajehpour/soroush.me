import { pano } from "./scene-manifest";

export type Zone = "home" | "projects" | "experience";

/** Camera x for a zone: its designed 1744 px window, centred, kept inside the world. */
export function zoneCamera(zone: Exclude<Zone, "home">, windowWidth: number) {
  const x = pano.zones[zone] + (pano.designWindow - windowWidth) / 2;
  return Math.min(pano.width - windowWidth, Math.max(0, x));
}
