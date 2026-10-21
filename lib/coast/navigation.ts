import type { Zone } from "./camera";

/*
  The desktop panorama's navigation, as pure logic: the camera's motion between the three
  sections and the recognition of physical scroll gestures. components/home/Panorama.tsx
  owns the single controller that uses them; tests/navigation.spec.ts exercises both.
*/

export const SECTIONS: readonly Zone[] = ["home", "projects", "experience"];
export type NavSource = "init" | "wheel" | "touch" | "key" | "click" | "history" | "focus";

/** Tuning, in one place. */
export const NAV = {
  /** One section, and two (Home ↔ Experience, one continuous pan). */
  adjacentMs: 880,
  acrossMs: 1320,
  /** The shortest move, e.g. finishing a nearly complete swipe… */
  minMs: 300,
  /** …and the shortest braking onto a section the camera is already racing toward. */
  brakeMs: 160,
  /** > 1 front-loads the ease: a prompt start, then a long gentle arrival. */
  lead: 1.35,
  wheel: {
    /** Accumulated input (CSS px) a gesture needs before it moves a section. */
    threshold: 50,
    /** Silence that ends a gesture. Trackpad momentum never pauses this long. */
    gapMs: 180,
    /** px per line for deltaMode 1 (Firefox mouse wheels). */
    linePx: 40,
    /** A momentum tail has "decayed" once its last few events are under this fraction of its peak… */
    decay: .4,
    /** …and a fresh swipe on top of it shows as input this many times the tail's level, the
     *  event before it already `sustain` times up, and at least a fair share of the first
     *  swipe's strength. */
    rise: 2,
    sustain: 1.4,
    /** A jump this many times the tail's level needs no second event to confirm it. */
    leap: 3,
    /** Speeds below are in px per 60 Hz frame. */
    risePx: 10,
    riseOfPeak: .3,
    /** An event this much smaller than the one before is momentum cut short, not decaying. */
    cut: .25,
    /** A rise this soon after a gesture began is still that gesture ramping up. */
    minAgeMs: 260,
    /** A second step in the same direction never follows the previous one sooner than this. */
    repeatMs: 320,
  },
  touch: {
    /** Movement before a touch picks its axis. */
    lockPx: 10,
    /** Released past this fraction of a section's span, the drag commits… */
    commit: .18,
    /** …or when flicked at least this fast (CSS px per ms). */
    flick: .35,
  },
};

export const sectionIndex = (zone: Zone) => SECTIONS.indexOf(zone);
export const neighbour = (zone: Zone, step: number) =>
  SECTIONS[Math.min(SECTIONS.length - 1, Math.max(0, sectionIndex(zone) + step))];

// ---- motion ------------------------------------------------------------------------------

/**
 * One camera move. Starting velocity carries over from whatever the camera was doing, so
 * a retargeted move never jerks: x(t) = from + Δ·ease(t) + v0·T·t(1−t)³. The second term
 * starts at the old speed and dies away before the end, where velocity is always zero.
 */
export interface Motion { from: number; to: number; v0: number; start: number; duration: number }

const smooth = (u: number) => u * u * (3 - 2 * u);
const warp = (t: number) => 1 - Math.pow(1 - t, NAV.lead);
const ease = (t: number) => smooth(warp(t));
function easeSlope(t: number) {
  const w = warp(t);
  return 6 * w * (1 - w) * NAV.lead * Math.pow(1 - t, NAV.lead - 1);
}

/** How long a move of `distance` world px takes, given the average gap between sections. */
export function durationFor(distance: number, span: number) {
  const r = distance / span;
  const ms = r <= 1 ? NAV.adjacentMs * Math.sqrt(r) : NAV.adjacentMs + (NAV.acrossMs - NAV.adjacentMs) * (r - 1);
  return Math.min(NAV.acrossMs, Math.max(NAV.minMs, ms));
}

/**
 * A move from `from` to `to` that starts at velocity `v0` (world px per ms). Already heading
 * for a target close ahead, the move is shortened so the camera brakes onto it smoothly
 * rather than overshooting; only below a floor is the starting speed trimmed.
 */
export function plan(from: number, to: number, v0: number, start: number, span: number): Motion {
  const distance = Math.abs(to - from);
  const ahead = v0 !== 0 && Math.sign(v0) === Math.sign(to - from);
  // The carried-over term peaks at 0.105·v0·T; within 1.4·Δ the ease always stays ahead.
  let duration = durationFor(distance, span);
  if (ahead) duration = Math.max(NAV.brakeMs, Math.min(duration, 1.4 * distance / Math.abs(v0)));
  const cap = 1.4 * distance / duration;
  return { from, to, start, duration, v0: ahead ? Math.sign(v0) * Math.min(Math.abs(v0), cap) : v0 };
}

/** Position and velocity (world px per ms) of a move at time `now`. */
export function sample(m: Motion, now: number) {
  const T = m.duration;
  const t = T > 0 ? Math.min(1, Math.max(0, (now - m.start) / T)) : 1;
  if (t >= 1) return { x: m.to, v: 0, done: true };
  const delta = m.to - m.from, s = 1 - t;
  const x = m.from + delta * ease(t) + m.v0 * T * t * s * s * s;
  const v = delta * easeSlope(t) / T + m.v0 * s * s * (1 - 4 * t);
  return { x, v, done: false };
}

// ---- wheel gestures ----------------------------------------------------------------------

/** One wheel event's movement along the navigation axis, in CSS px (+ is forward). */
export function wheelDelta(event: Pick<WheelEvent, "deltaX" | "deltaY" | "deltaMode">, pagePx: number) {
  const unit = event.deltaMode === 1 ? NAV.wheel.linePx : event.deltaMode === 2 ? pagePx : 1;
  // Down and sideways-left (content moving left) both walk forward along the beach.
  const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY);
  return { delta: (horizontal ? event.deltaX : event.deltaY) * unit, axis: horizontal ? "x" as const : "y" as const };
}

/**
 * Turns a stream of wheel events into gestures, each worth at most one step.
 *
 * A trackpad swipe is dozens of events, then up to ~2 s of momentum events that decay
 * smoothly; a mouse wheel spun quickly is a burst of equal notches. Each is one gesture:
 * it builds up input until it crosses the threshold, steps once, and every later event of
 * it (including all its momentum) is swallowed. A gesture ends with a pause, a reversal,
 * or a fresh swipe landing on top of a decaying momentum tail, which shows up as a sudden
 * rise in the input after it had died down to well under its peak.
 */
export class WheelGestures {
  private last = -Infinity;
  private began = 0;
  private sign = 0;
  private sum = 0;
  private peak = 0;
  private recent: number[] = [];
  private decayed = false;
  private floor: number | null = null;
  private lastStep = { at: -Infinity, sign: 0 };
  /** Whether the current gesture has already moved a section (or been refused one). */
  consumed = false;
  /** Whether the current gesture belongs to a scroller under the pointer, never to the camera. */
  native = false;

  /**
   * Feed one event. `navigable` is asked once per gesture, on its first event, whether the
   * gesture may move the camera at all. `step` is ±1 when this event should move a section.
   */
  feed(delta: number, now: number, navigable: () => boolean = () => true): { fresh: boolean; step: number } {
    const w = NAV.wheel;
    const abs = Math.abs(delta), sign = Math.sign(delta), elapsed = now - this.last;
    // Compare speeds, not raw deltas: a browser that falls behind merges several events
    // into one, which then spans as many frames. `level` is px per 60 Hz frame.
    const level = abs * 16 / (elapsed > w.gapMs ? 16 : Math.min(120, Math.max(8, elapsed)));
    // The tail's recent typical level (a median, so one odd event cannot skew it). A fresh
    // swipe's ramp outruns it within a few events and keeps rising (the previous event is
    // already up too), or leaps far above it at once; a decaying momentum tail does neither.
    // Once the tail was visibly cut short, the low point since the cut is the reference.
    const sorted = [...this.recent].sort((a, b) => a - b);
    const trough = this.floor ?? (sorted.length ? sorted[sorted.length >> 1] : 0);
    const previous = this.recent.at(-1) ?? 0;
    const fresh = elapsed > w.gapMs
      // Momentum never reverses: a real push the other way is a new gesture.
      || (sign !== 0 && this.sign !== 0 && sign !== this.sign && abs >= 4)
      || (this.decayed && now - this.began > w.minAgeMs && level >= Math.max(w.risePx, w.riseOfPeak * this.peak)
        && level > w.rise * trough && ((previous > w.sustain * trough && level > previous) || level > w.leap * trough));
    this.last = now;
    if (fresh) {
      this.began = now; this.sign = sign; this.sum = 0; this.peak = 0;
      this.recent = []; this.decayed = false; this.floor = null;
      this.native = !navigable();
      this.consumed = this.native;
    }
    if (sign !== 0 && this.sign === 0) this.sign = sign;
    this.recent.push(level);
    if (this.recent.length > 10) this.recent.shift();
    this.peak = Math.max(this.peak, level);
    if (this.peak >= w.risePx && this.recent.length >= 3 && Math.max(...this.recent.slice(-3)) < w.decay * this.peak) this.decayed = true;
    // Momentum fades a few percent per frame; fingers landing on the pad cut it off at once.
    if (!fresh && this.peak >= w.risePx && previous >= w.risePx && level < w.cut * previous) { this.decayed = true; this.floor = level; }
    else if (this.floor !== null) this.floor = Math.min(this.floor, level);
    if (this.consumed) return { fresh, step: 0 };
    this.sum += delta;
    if (Math.abs(this.sum) < w.threshold) return { fresh, step: 0 };
    this.consumed = true;
    const step = Math.sign(this.sum);
    // Belt and braces against a misread momentum tail: no same-way repeat in quick succession.
    if (step === this.lastStep.sign && now - this.lastStep.at < w.repeatMs) return { fresh, step: 0 };
    this.lastStep = { at: now, sign: step };
    return { fresh, step };
  }

  /** Spend the current gesture without moving (e.g. it began while the camera was held). */
  consume() { this.consumed = true; }

  get state() { return { consumed: this.consumed, native: this.native, sum: Math.round(this.sum), decayed: this.decayed }; }
}
