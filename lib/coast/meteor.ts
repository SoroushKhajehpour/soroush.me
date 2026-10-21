import pack from "@/public/pixel-meteor-animation-pack/animations.json";
import panorama from "@/public/coast/pano/manifest.json";

/**
 * The Experience meteor (components/home/Meteor.tsx). Art and timings come from
 * pixel-meteor-animation-pack/animations.json; positions are panorama world pixels.
 */
export const METEOR_URL = "/pixel-meteor-animation-pack";
/** Where it lands: well onto the dry sand of the cove's foreground, far below the surf line, with room around it for the blast. */
export const LANDING = { x: 4620, y: 915 } as const;
/** The phones' beach panel: this window of the panorama, shown at its own width. */
export const MOBILE_CROP = { x: 4420, y: 640, width: 700, height: 352 } as const;

export type SequenceName = keyof typeof pack.sequences;
export const sequences = pack.sequences;

export function frameAt(name: SequenceName, elapsedMs: number) {
  const s = sequences[name];
  const total = s.frameDurationMs.reduce((a, b) => a + b, 0);
  const t = s.loop ? elapsedMs % total : Math.min(elapsedMs, total - 1);
  let end = 0;
  for (let i = 0; i < s.frameCount; i++) { end += s.frameDurationMs[i]; if (t < end) return s.frameOrder[i]; }
  return s.frameOrder[s.frameCount - 1];
}
export const duration = (name: SequenceName) => sequences[name].frameDurationMs.reduce((a, b) => a + b, 0);

export type Point = { x: number; y: number };

/**
 * The Experience scene's regions, in panorama world pixels (measured from public/coast/pano/still.webp):
 * the sea horizon, and the shoreline (where foam and wet sand give way to dry sand) as a polyline.
 */
export const SCENE = {
  horizon: panorama.horizon,
  shoreline: [[3836, 575], [4080, 589], [4240, 617], [4400, 677], [4560, 717], [4720, 753], [4880, 777], [5040, 793], [5200, 809], [5360, 825], [5580, 845]] as [number, number][],
};
/** The shoreline's y at world x (dry sand is below it). */
export function shoreAt(x: number) {
  const k = SCENE.shoreline;
  for (let i = 1; i < k.length; i++) if (x <= k[i][0]) return k[i - 1][1] + ((x - k[i - 1][0]) / (k[i][0] - k[i - 1][0])) * (k[i][1] - k[i - 1][1]);
  return k[k.length - 1][1];
}

/*
  The flight, as a projected 3D approach. Every number that shapes it is here.

  The meteor travels a straight line through 3D space (plus a touch of gravity), from far out
  over the sea to LANDING on the near beach, seen by a pinhole camera whose horizon is the
  panorama's. On screen that gives, from physics rather than easing curves:
    - a tiny, slow, distant point high in the upper-right sky that moves almost level at first,
    - apparent speed and size rising together as its distance falls (size ∝ 1/distance^sizeExponent),
    - a descent that steepens smoothly (gravity) until its velocity points into the sand.

  Staging: the meteor is drawn in the scene layer, under the page content (.scene-window sits
  below .zone, z-index 3), so it passes behind the timeline. While its head is above the bottom
  of the timeline band it is held subtle (dimmer, trail trimmed short); it becomes prominent as it
  descends below the band into the open lower-right of the scene.

  Size is set by what is actually drawn: the art's visible streak (head to the end of the tail and
  sparks, measured from opaque pixels, padding excluded) is `length` long on screen at contact.
  The impact starts at that size and settles frame by frame to the resting rock's (landedScale).
  Sizes are multiples of the art's base size: one art pixel per scene pixel (--mfly screen px).
*/
export const FLIGHT = {
  /**
   * Where it first appears, relative to the visible scene (which differs by viewport): `inset`
   * world px in from the right edge, and `sky` of the way from the horizon up to the top edge.
   */
  start: { inset: 50, sky: 0.75 },
  /** How much farther away it is when it appears than when it lands (3D distance ratio). */
  depth: 3,
  /** Gravity: how much the 3D path bows up over the straight line (fraction of its height drop). Bigger = flatter start, steeper finish. */
  arc: 0.08,
  /** Its 3D speed gains this much over the flight (0 = constant speed; perspective alone accelerates it on screen). */
  thrust: 0.1,
  durationMs: 3400,
  /** The whole visible streak's length at contact: this fraction of the scene's width, within [minPx, maxPx]. */
  length: { fraction: 0.18, minPx: 90, maxPx: 300 },
  /** Size ∝ (1 / distance)^this: at depth 3 the meteor starts at ~24% of its contact size. */
  sizeExponent: 1.3,
  /** Sizes are baked in steps of this ratio (small enough that no step reads as a jump). */
  scaleStepRatio: 1.07,
  /**
   * The trail: how much of the art's streak is drawn (fraction of its length), from a warm-white
   * point with a stub of tail far off to the whole trail. The cut-off edge is ordered-dithered
   * over `ditherArtPx` art pixels, so it stays hard-edged pixel art.
   */
  trail: { from: 0.12, full: 0.6, steps: 8, ditherArtPx: 14 },
  /**
   * Staging against the timeline: above the band's bottom (+ `marginPx` world px) it is drawn at
   * `subtle` opacity; it ramps to full over `rampPx` world px below that. It fades in from nothing
   * over `fadeInMs`, already moving.
   */
  stage: { subtle: 0.75, marginPx: 10, rampPx: 90, fadeInMs: 500 },
  /** Brightness while subtle → when prominent and close (kept up while far, so the distant point reads warm-white, not grey). */
  glow: [1.05, 1.15] as [number, number],
  /**
   * Energy in the final approach: from this point in the flight, a hard-edged echo of the meteor's
   * own silhouette trails just behind it (offset along the tail, never blurred).
   */
  smear: { from: 0.8, colors: ["rgb(255 120 40 / .45)", "rgb(28 26 104 / .45)"], reach: 5 },
  /** Size of the resting rock (rounded to whole screen pixels per art pixel); the impact settles to it. */
  landedScale: 1,
  /** The impact's six frames: how far from the rock's size toward the contact size each is drawn (1 = contact). */
  impactSettle: [1, 0.8, 0.55, 0.3, 0.12, 0],
  /** The head's tip on the flight art (art pixels): it follows the path, and everything scales and turns about it. */
  headAnchor: { ...pack.sequences.flight.anchor },
  /** The art is pre-rotated to headings this many degrees apart, to follow the path's tangent. */
  angleStepDeg: 5,
  /**
   * The phones' panel is a beach crop with no sky: it comes in from the crop's upper right
   * (`inset` world px in, `drop` below its top), from nearer, and quicker.
   */
  panel: { inset: 60, drop: 24, depth: 2, durationMs: 2200, length: { fraction: 0.3, minPx: 70, maxPx: 160 } },
};
/** The flight art's own heading (head first, tail up and to the right), in screen degrees. */
export const ART_HEADING_DEG = 142;

/**
 * smear: 0..1, how heavy the final-approach echo is; tail: unit vector from the head back along the
 * tail (screen); trail: fraction of the streak drawn; prominence: 0 subtle .. 1 fully staged.
 */
export type FlightSample = {
  x: number; y: number; scale: number; glow: number; angle: number; opacity: number;
  smear: number; tail: Point; trail: number; prominence: number;
};
export type PlanInput = {
  mode: "pano" | "panel";
  /** Contact size, in base sizes. */
  contact: number;
  /** First visible position (world px). */
  start: Point;
  /** World y of the timeline band's bottom (above it the meteor is held subtle); -Infinity for none. */
  bandY: number;
};

/** The whole flight as a function of elapsed time: precomputed once, then cheap per frame. */
export function flightPlan({ mode, contact, start, bandY }: PlanInput) {
  const panel = mode === "panel";
  const ms = panel ? FLIGHT.panel.durationMs : FLIGHT.durationMs;
  const D = panel ? FLIGHT.panel.depth : FLIGHT.depth, H = SCENE.horizon, L = LANDING;
  // Camera space with focal length 1 and its axis through LANDING's x: a world point's screen
  // offset from (L.x, horizon) is its 3D offset over its distance Z (LANDING is at Z = 1).
  const S3 = { x: (start.x - L.x) * D, y: (H - start.y) * D }, L3 = { x: 0, y: H - L.y };
  const bow = FLIGHT.arc * Math.abs(S3.y - L3.y);
  const project = (tau: number) => {
    const Z = D - (D - 1) * tau;
    const X = S3.x + (L3.x - S3.x) * tau, Y = S3.y + (L3.y - S3.y) * tau + bow * 4 * tau * (1 - tau);
    return { x: L.x + X / Z, y: H - Y / Z, Z };
  };
  const tauAt = (t: number) => (1 - FLIGHT.thrust) * t + FLIGHT.thrust * t * t;
  const sMin = contact * Math.pow(D, -FLIGHT.sizeExponent), stepLog = Math.log(FLIGHT.scaleStepRatio);
  const lastStep = Math.max(1, Math.round(Math.log(contact / sMin) / stepLog));
  const { trail: tr, stage } = FLIGHT;
  const sample = (elapsed: number): FlightSample => {
    const t = Math.min(1, Math.max(0, elapsed / ms)), tau = tauAt(t);
    const p = t >= 1 ? { ...L, Z: 1 } : project(tau);
    const q = project(Math.min(1, tau + 1e-3)), b = project(Math.max(0, tau - 1e-3));
    const tan = { x: q.x - b.x, y: q.y - b.y };
    // Size from distance, on a baked step; the last step is the contact size itself.
    const s = contact * Math.pow(p.Z, -FLIGHT.sizeExponent);
    const step = Math.min(lastStep, Math.max(0, Math.round(Math.log(s / sMin) / stepLog)));
    const scale = step === lastStep ? contact : +(sMin * Math.exp(step * stepLog)).toFixed(4);
    // Staging: subtle above the timeline band, prominent below it.
    const below = (p.y - (bandY + stage.marginPx)) / stage.rampPx;
    const prominence = Math.max(0, Math.min(1, below));
    const fade = Math.min(1, elapsed / stage.fadeInMs);
    const opacity = +(fade * (stage.subtle + (1 - stage.subtle) * prominence)).toFixed(2);
    const glow = +(FLIGHT.glow[0] + (FLIGHT.glow[1] - FLIGHT.glow[0]) * prominence).toFixed(2);
    // The trail lengthens with the approach (by size), on a few steps.
    const grown = Math.min(1, Math.log(scale / sMin) / Math.log(contact / sMin) / tr.full);
    const trail = +Math.min(1, tr.from + (1 - tr.from) * Math.round(grown * tr.steps) / tr.steps).toFixed(3);
    const heading = (Math.atan2(tan.y, tan.x) * 180) / Math.PI;
    const angle = Math.round((heading - ART_HEADING_DEG) / FLIGHT.angleStepDeg) * FLIGHT.angleStepDeg;
    const tl = Math.hypot(tan.x, tan.y) || 1;
    const smear = prominence < 1 ? 0 : Math.max(0, Math.min(1, (t - FLIGHT.smear.from) / (1 - FLIGHT.smear.from)));
    return { x: p.x, y: p.y, scale, glow, angle, opacity, smear: Math.round(smear * 6) / 6, tail: { x: -tan.x / tl, y: -tan.y / tl }, trail, prominence };
  };
  // Every size/heading/trail the flight will use, so they can be baked before it starts.
  const variants = new Map<string, Variant>();
  for (let e = 0; e <= ms + 8; e += 8) { const f = sample(Math.min(e, ms)); variants.set(variantKey(f), { scale: f.scale, angle: f.angle, trail: f.trail }); }
  // The path itself, for the development overlay.
  const path = Array.from({ length: 121 }, (_, i) => { const f = sample((i / 120) * ms); return { x: f.x, y: f.y }; });
  return { durationMs: ms, sample, variants: [...variants.values()], path, start, landing: L, bandY, depth: D };
}
export type Variant = { scale: number; angle: number; trail: number };
export const variantKey = (v: Variant) => `${v.scale}:${v.angle}:${v.trail}`;

/** A sprite sheet ready for the .meteor element: its cell size, cell count and anchor. */
/** `held` keeps a baked sheet decoded while it may be shown (a first, undecoded showing can paint an empty frame). */
export type Sheet = { url: string; fw: number; fh: number; fc: number; ax: number; ay: number; held?: HTMLImageElement };
export const sheetOf = (name: SequenceName): Sheet => {
  const s = sequences[name], a = name === "flight" ? FLIGHT.headAnchor : s.anchor;
  return { url: `${METEOR_URL}/${s.sheet}`, fw: s.frameWidth, fh: s.frameHeight, fc: s.frameCount, ax: a.x, ay: a.y };
};

/**
 * The flight art's visible length in art pixels: the extent of its opaque pixels (sparks
 * included, transparent padding not) along its own heading, over all its frames.
 */
export function visibleLength(img: HTMLImageElement) {
  const { fw, fh, fc, ax, ay } = sheetOf("flight");
  const c = document.createElement("canvas");
  c.width = fw * fc; c.height = fh;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, c.width, fh).data;
  const h = (ART_HEADING_DEG * Math.PI) / 180, ux = Math.cos(h), uy = Math.sin(h);
  let longest = 0;
  for (let f = 0; f < fc; f++) {
    let lo = Infinity, hi = -Infinity;
    for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
      if (d[(y * c.width + f * fw + x) * 4 + 3] < 40) continue;
      const along = (x + 0.5 - ax) * ux + (y + 0.5 - ay) * uy;
      lo = Math.min(lo, along); hi = Math.max(hi, along);
    }
    if (hi > lo) longest = Math.max(longest, hi - lo);
  }
  return longest || Math.hypot(fw, fh);
}

/*
  A sheet scaled and turned about its anchor (the flight's head, the impact's contact point), at
  the scene's pixel size with nearest-neighbour sampling: every pixel stays a hard square of the
  original palette, and the browser only ever magnifies it by whole multiples (no blurry
  fractional scaling or rotation). `cell` bakes just that one cell of the sheet. `keepArtPx` (flight
  only) draws the streak only that far back from the head, its end ordered-dithered away.
*/
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
export async function bakeSheet(img: HTMLImageElement, base: Sheet, scale: number, angleDeg: number, cell?: number, keepArtPx = Infinity): Promise<Sheet> {
  if (scale === 1 && angleDeg === 0 && cell === undefined && keepArtPx === Infinity) return base;
  const hd = (ART_HEADING_DEG * Math.PI) / 180, hx = Math.cos(hd), hy = Math.sin(hd), band = FLIGHT.trail.ditherArtPx;
  const { fw, fh, ax, ay } = base;
  const cells = cell === undefined ? [...Array(base.fc).keys()] : [cell], fc = cells.length;
  const src = document.createElement("canvas");
  src.width = fw * base.fc; src.height = fh;
  const sctx = src.getContext("2d")!;
  sctx.drawImage(img, 0, 0);
  const sp = sctx.getImageData(0, 0, src.width, fh).data;
  const r = (angleDeg * Math.PI) / 180, cos = Math.cos(r), sin = Math.sin(r);
  // The turned cell's bounds around the head.
  const xs: number[] = [], ys: number[] = [];
  for (const [cx, cy] of [[0, 0], [fw, 0], [0, fh], [fw, fh]]) {
    const dx = (cx - ax) * scale, dy = (cy - ay) * scale;
    xs.push(dx * cos - dy * sin); ys.push(dx * sin + dy * cos);
  }
  const nax = Math.ceil(-Math.min(...xs)), nay = Math.ceil(-Math.min(...ys));
  const nfw = nax + Math.ceil(Math.max(...xs)) + 1, nfh = nay + Math.ceil(Math.max(...ys)) + 1;
  const out = document.createElement("canvas");
  out.width = nfw * fc; out.height = nfh;
  const octx = out.getContext("2d")!;
  const od = octx.createImageData(out.width, nfh), op = od.data;
  for (let c = 0; c < fc; c++) {
    const from = cells[c];
    for (let y = 0; y < nfh; y++) for (let x = 0; x < nfw; x++) {
      const dx = x + 0.5 - nax, dy = y + 0.5 - nay;
      const sx = Math.floor((dx * cos + dy * sin) / scale + ax), sy = Math.floor((-dx * sin + dy * cos) / scale + ay);
      if (sx < 0 || sy < 0 || sx >= fw || sy >= fh) continue;
      if (keepArtPx !== Infinity) {
        const back = -((sx + 0.5 - ax) * hx + (sy + 0.5 - ay) * hy);
        if (back > keepArtPx && (back - keepArtPx) / band >= 1 - BAYER[(sy % 4) * 4 + (sx % 4)]) continue;
      }
      const si = (sy * src.width + from * fw + sx) * 4, oi = (y * out.width + c * nfw + x) * 4;
      op[oi] = sp[si]; op[oi + 1] = sp[si + 1]; op[oi + 2] = sp[si + 2]; op[oi + 3] = sp[si + 3];
    }
  }
  octx.putImageData(od, 0, 0);
  const blob = await new Promise<Blob>((ok, no) => out.toBlob(b => (b ? ok(b) : no(new Error("bake failed"))), "image/png"));
  const url = URL.createObjectURL(blob);
  const pre = new Image(); pre.src = url;
  await pre.decode().catch(() => {});
  return { url, fw: nfw, fh: nfh, fc, ax: nax, ay: nay, held: pre };
}

/**
 * The impact's frames as drawn: the size of each (in base sizes), from the contact size down to
 * the rock's. Frames at the rock's size use the sheet as it is, at the landed pixel size.
 */
export function impactScales(contact: number, landed: number) {
  return FLIGHT.impactSettle.map(w => +(landed * Math.pow(contact / landed, w)).toFixed(4));
}

/** The visit's meteor: it falls once per page load, whatever remounts in between. */
export const meteorVisit = { landed: false };
