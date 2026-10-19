import { pano } from "./scene-manifest";

export type Zone = "home" | "projects" | "experience";

/**
 * The scroll timeline, in viewport heights of scrolling. Home's objects fade out in place
 * first, so they never pan; then the camera eases to Projects, rests, eases to Experience
 * and rests. Anchors are where the nav links and scroll-snap land.
 */
export const timeline = {
  objectsGone: [0.04, 0.32] as const,
  toProjects: [0.35, 1.6] as const,
  toExperience: [2.0, 3.2] as const,
  anchors: { home: 0, projects: 1.8, experience: 3.6 } as Record<Zone, number>,
  length: 3.6,
};

/** Camera x for a zone: its designed 1744 px window, centred, kept inside the world. */
export function zoneCamera(zone: Exclude<Zone, "home">, windowWidth: number) {
  const x = pano.zones[zone] + (pano.designWindow - windowWidth) / 2;
  return Math.min(pano.width - windowWidth, Math.max(0, x));
}

const ease = (t: number) => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2;
const span = (p: number, [a, b]: readonly [number, number]) => Math.min(1, Math.max(0, (p - a) / (b - a)));
const smooth = (t: number) => t*t*(3 - 2*t);

/**
 * Camera position for a scroll progress. With reduced motion there is no pan: the view
 * cuts between the three zones at the midpoints, and the objects simply disappear.
 */
export function cameraAt(progress: number, at: Record<Zone, number>, reduced = false) {
  const p = Math.max(0, progress);
  if (reduced) {
    const zone: Zone = p < 0.9 ? "home" : p < 2.7 ? "projects" : "experience";
    return { camera: at[zone], objects: zone === "home" && p < 0.2 ? 1 : 0, zone };
  }
  const a = ease(span(p, timeline.toProjects));
  const b = ease(span(p, timeline.toExperience));
  const camera = p < timeline.toExperience[0]
    ? at.home + (at.projects - at.home) * a
    : at.projects + (at.experience - at.projects) * b;
  const objects = 1 - smooth(span(p, timeline.objectsGone));
  const zone: Zone = p < 0.9 ? "home" : p < 2.7 ? "projects" : "experience";
  return { camera, objects, zone };
}
