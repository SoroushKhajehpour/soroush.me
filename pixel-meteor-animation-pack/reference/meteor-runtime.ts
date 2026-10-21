/** REFERENCE ONLY. Adapt to the actual Experience component and scene renderer. */

export type SequenceName = "flight" | "impact" | "idle" | "activation";

export interface Sequence {
  sheet: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  frameDurationMs: number[];
  loop: boolean;
  anchor: { x: number; y: number };
  recommendedScale: number;
}

export interface Pack { sequences: Record<SequenceName, Sequence> }

export interface SceneFrame { x: number; y: number; width: number; height: number }

/** Convert a scene/world pixel coordinate to the stage's CSS pixels. */
export function worldToStage(
  world: { x: number; y: number },
  frame: SceneFrame,
  stage: { width: number; height: number },
) {
  return {
    x: Math.round(((world.x - frame.x) / frame.width) * stage.width),
    y: Math.round(((world.y - frame.y) / frame.height) * stage.height),
  };
}

/** Select one cell of a horizontal strip without changing the element's layout. */
export function showSpriteFrame(
  element: HTMLElement,
  packUrl: string,
  sequence: Sequence,
  index: number,
  scale = sequence.recommendedScale,
) {
  const wholeScale = Math.max(1, Math.round(scale));
  const frame = Math.min(sequence.frameCount - 1, Math.max(0, index));
  Object.assign(element.style, {
    width: `${sequence.frameWidth * wholeScale}px`,
    height: `${sequence.frameHeight * wholeScale}px`,
    backgroundImage: `url("${packUrl}/${sequence.sheet}")`,
    backgroundRepeat: "no-repeat",
    backgroundSize: `${sequence.frameWidth * sequence.frameCount * wholeScale}px ${sequence.frameHeight * wholeScale}px`,
    backgroundPosition: `${-frame * sequence.frameWidth * wholeScale}px 0px`,
    imageRendering: "pixelated",
  });
}

/** Place the sprite's metadata anchor exactly over the world coordinate. */
export function placeSprite(
  element: HTMLElement,
  sequence: Sequence,
  world: { x: number; y: number },
  frame: SceneFrame,
  stage: { width: number; height: number },
  scale = sequence.recommendedScale,
) {
  const point = worldToStage(world, frame, stage);
  const wholeScale = Math.max(1, Math.round(scale));
  element.style.transform = `translate3d(${point.x - sequence.anchor.x * wholeScale}px, ${point.y - sequence.anchor.y * wholeScale}px, 0)`;
}

/** Frame lookup supports individual durations and correct non-looping final frames. */
export function frameAt(sequence: Sequence, elapsedMs: number) {
  const duration = sequence.frameDurationMs.reduce((sum, ms) => sum + ms, 0);
  const time = sequence.loop ? elapsedMs % duration : Math.min(elapsedMs, duration);
  let end = 0;
  for (let index = 0; index < sequence.frameCount; index++) {
    end += sequence.frameDurationMs[index];
    if (time < end) return index;
  }
  return sequence.frameCount - 1;
}

/** Ease slightly into the collision; the sprite itself stays the same size. */
export function flightWorldPoint(start: { x: number; y: number }, end: { x: number; y: number }, t: number) {
  const clamped = Math.min(1, Math.max(0, t));
  const eased = clamped * clamped * (1.18 - 0.18 * clamped);
  return {
    x: start.x + (end.x - start.x) * eased,
    y: start.y + (end.y - start.y) * eased,
  };
}

/** CSS hook for the existing four .tl-check stars; remove after the pulse. */
export function pulseTimeline(timeline: HTMLElement) {
  timeline.classList.remove("meteor-pulse");
  // Force the second click to replay without a frame-by-frame particle system.
  void timeline.offsetWidth;
  timeline.classList.add("meteor-pulse");
  window.setTimeout(() => timeline.classList.remove("meteor-pulse"), 1600);
}
