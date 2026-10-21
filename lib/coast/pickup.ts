import { rearGeometry } from "@/lib/photography/camera-rear";
import type { Bounds, SceneFrame } from "./scene-manifest";

/**
 * The camera pickup as a pure function of one timeline value t ∈ [0, 1]: 0 is the beach
 * as it was, 1 is the camera held in front of the viewer. Closing runs the same timeline
 * backwards, so the two always mirror each other and can reverse at any moment.
 *
 *   0    – 0.62  lean in: the view drifts down toward the camera on a curve and zooms in
 *   0.55         the drawn beach camera hands over to an identical sprite at the same pixels
 *   0.56 – 1     pick up: it lifts on a gentle arc, grows and turns around to show its back,
 *                while the view straightens up again (zooms partly back out)
 *   0.93 – 1     the LCD switches on
 */
export interface PickupInput {
  /** The scene window before the pickup (scene px). */
  start: SceneFrame;
  /** The lifted sprite's bounds in the scene (scene px): pano.cameraSand. */
  camera: Bounds;
  /** The whole world, so the view never leaves the artwork. */
  world: { width: number; height: number };
  /** Where the scene window is on screen (CSS px). */
  box: Rect;
  /** On phones the scene is a box within the page: it grows to fill the screen as you lean in. */
  fill?: Rect;
  viewport: { width: number; height: number };
  reduced: boolean;
}

export interface Rect { left: number; top: number; width: number; height: number }

export interface PickupPose {
  frame: SceneFrame;
  /** Where the scene window is on screen now. */
  box: Rect;
  /** The drawn beach camera is visible (false once the sprite has taken over). */
  beachCamera: boolean;
  /** The camera body's on-screen rectangle, and how it is turned. */
  body: Rect;
  /** 0 = front facing as on the beach, 180 = back facing the viewer. */
  turn: number;
  tilt: number;
  lean: number;
  /** Opacity of the lifted sprite (only below 1 with reduced motion). */
  sprite: number;
  /** Intro, nav and other page chrome. */
  chrome: number;
  /** The soft darkening behind the held camera. */
  dim: number;
  lcd: number;
}

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const span = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const inOut = (x: number) => x < .5 ? 4*x*x*x : 1 - Math.pow(-2*x + 2, 3) / 2;
const smooth = (x: number) => x*x*(3 - 2*x);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** The lifted front sprite (camera-front.png) covers the 256 × 144 box around the camera;
 *  the back's body box is 1421 × 675. */
export const FRONT_ASPECT = 256 / 144;
export const BACK_ASPECT = (rearGeometry.body.width * 1536) / (rearGeometry.body.height * 1024);

/** Where the held camera's body sits on screen. */
export function heldBody(viewport: { width: number; height: number }): Rect {
  const narrow = viewport.width < 700;
  const width = narrow
    ? Math.min(viewport.width * .96, viewport.height * .9 * BACK_ASPECT)
    : Math.min(viewport.width * .78, viewport.height * .8 * BACK_ASPECT);
  const height = width / BACK_ASPECT;
  const cy = viewport.height * (narrow ? .5 : .53);
  return { left: (viewport.width - width) / 2, top: cy - height / 2, width, height };
}

export function pickupPose(t: number, input: PickupInput): PickupPose {
  const { start, camera, world, viewport, reduced } = input;
  const grow = input.fill ? inOut(span(t, 0, .5)) : 0;
  const box: Rect = input.fill ? {
    left: lerp(input.box.left, input.fill.left, grow), top: lerp(input.box.top, input.fill.top, grow),
    width: lerp(input.box.width, input.fill.width, grow), height: lerp(input.box.height, input.fill.height, grow),
  } : input.box;
  const held = heldBody(viewport);
  if (reduced) {
    return { frame: start, box: input.box, beachCamera: t <= 0, body: held, turn: 180, tilt: 0, lean: 0,
      sprite: smooth(t), chrome: 1 - smooth(t), dim: smooth(t), lcd: smooth(span(t, .5, 1)) };
  }

  // ---- the view ----
  const aspect = box.width / box.height;
  const S = { x: start.x + start.width / 2, y: start.y + start.height / 2 };
  const C = { x: camera.x + camera.width / 2, y: camera.y + camera.height / 2 };
  const near = 2.6, standing = 1.45;
  const a = inOut(span(t, 0, .62));
  const b = inOut(span(t, .5, 1));
  const zoom = Math.exp(lerp(lerp(0, Math.log(near), a), Math.log(standing), b));
  let w = start.width / zoom, h = w / aspect;
  if (h > world.height) { h = world.height; w = h * aspect; }
  // Lean: first down toward the sand, then across to the camera (a quadratic curve),
  // ending with the camera a little below the middle, as when looking down at it.
  const T1 = { x: C.x, y: C.y - .08 * (start.height / near) };
  const P = { x: lerp(S.x, C.x, .25), y: T1.y };
  const curve = (k: number, p0: number, p1: number, p2: number) => (1-k)*(1-k)*p0 + 2*(1-k)*k*p1 + k*k*p2;
  // Standing back up: the camera is in your hands, the beach and the sea behind it.
  const T2 = { x: C.x, y: C.y - .1 * (start.height / standing) };
  const cx = lerp(curve(a, S.x, P.x, T1.x), T2.x, b);
  const cy = lerp(curve(a, S.y, P.y, T1.y), T2.y, b);
  const frame = {
    x: clamp(cx - w / 2, 0, world.width - w),
    y: clamp(cy - h / 2, 0, world.height - h),
    width: w, height: h,
  };

  // ---- the camera ----
  // On the sand: exactly where the scene draws it under the current view.
  const k = box.width / frame.width;
  const onSand: Rect = {
    left: box.left + (camera.x - frame.x) * k, top: box.top + (camera.y - frame.y) * k,
    width: camera.width * k, height: camera.height * k,
  };
  // It comes up off the sand first and turns while it rises, so the turn happens in
  // the air at a good size, not as a sliver on the sand.
  const lift = inOut(span(t, .56, .98));
  const arc = Math.sin(Math.PI * lift) * .05 * viewport.height;
  const width = Math.exp(lerp(Math.log(onSand.width), Math.log(held.width), lift));
  const height = width / lerp(FRONT_ASPECT, BACK_ASPECT, lift);
  const centre = {
    x: lerp(onSand.left + onSand.width / 2, held.left + held.width / 2, lift),
    y: lerp(onSand.top + onSand.height / 2, held.top + held.height / 2, lift) - arc,
  };
  const turnK = smooth(span(t, .66, .9));
  return {
    frame, box,
    beachCamera: t < .55,
    body: { left: centre.x - width / 2, top: centre.y - height / 2, width, height },
    turn: 180 * turnK,
    // A small roll as it comes up, and the back tipped toward you until it settles.
    tilt: -5 * Math.sin(Math.PI * lift),
    lean: 16 * (1 - smooth(span(t, .8, 1))) * turnK,
    sprite: 1,
    chrome: 1 - smooth(span(t, 0, .3)),
    dim: smooth(span(t, .6, 1)),
    lcd: smooth(span(t, .93, 1)),
  };
}
