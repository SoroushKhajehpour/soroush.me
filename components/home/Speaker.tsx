"use client";

import { useEffect, useRef, useSyncExternalStore, type CSSProperties } from "react";
import { boundsStyle, speaker } from "@/lib/coast/scene-manifest";
import { music, serverMusicState } from "@/lib/music/player";

type Button = keyof typeof speaker.buttons;
const pct = (b: Button): CSSProperties => {
  const g = speaker.buttons[b];
  return { left: `${g.left * 100}%`, top: `${g.top * 100}%`, width: `${g.width * 100}%`, height: `${g.height * 100}%` };
};

/**
 * The JBL on the beach, and the site's music controls: its three drawn buttons are
 * invisible hitboxes over the artwork. While music plays it bounces to the bass.
 */
export function Speaker() {
  const state = useSyncExternalStore(music.subscribe, music.get, serverMusicState);
  const bodyRef = useRef<HTMLDivElement>(null);
  const playing = state.playing;

  // Bounce: driven straight from the analyser in a frame loop, never through React.
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const body: HTMLDivElement = el;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0, t0 = 0, shown = 0;
    const wrap = body.parentElement!;
    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      t0 ||= now;
      const t = (now - t0) / 1000;
      const measured = music.energy();
      // Spotify gives no audio data, so it dances to its own beat: about 100 bpm, every
      // fourth beat harder, with a little irregularity so it never looks mechanical.
      const beat = t * 1.67;
      const accent = Math.floor(beat) % 4 === 0 ? 1 : .55 + .25 * Math.sin(Math.floor(beat) * 12.9898);
      const target = !music.get().playing ? 0
        : measured ?? (.18 + .82 * accent * Math.pow(Math.max(0, Math.cos(Math.PI * (beat % 1))), 10));
      shown += (target - shown) * (target > shown ? .5 : .12);
      if (!music.get().playing && shown < .002) { stop(); return; }
      // Movement scales with how big the speaker is drawn (it is ~270 scene px wide).
      const k = Math.min(2.5, Math.max(.6, wrap.clientWidth / 270));
      // Each bass hit kicks it up off the sand (1–3 px, 4–7 px on strong hits); it also
      // buzzes a little and rocks from side to side.
      const hit = Math.max(0, shown - .6) / .4;
      const jump = (1 + 2 * shown + 3 * hit * hit) * k * Math.min(1, shown * 2.5);
      const buzz = Math.sin(t * 61) * .35 * shown * k;
      const rock = Math.sin(t * 5.1) * 1.2 * shown + Math.sin(t * 13) * .4 * hit;   // degrees
      const squash = 1 - .03 * hit;
      body.style.transform = `translate3d(${buzz.toFixed(2)}px,${(-jump).toFixed(2)}px,0) rotate(${rock.toFixed(2)}deg) scale(${(2 - squash).toFixed(3)},${squash.toFixed(3)})`;
      wrap.style.setProperty("--beat", shown.toFixed(3));
    }
    function stop() {
      cancelAnimationFrame(raf); raf = 0; shown = 0;
      body.style.transform = "";
      wrap.style.setProperty("--beat", "0");
    }
    if (playing && !reduced.matches) raf = requestAnimationFrame(frame);
    else if (raf === 0 && body.style.transform) {
      // Settle back onto the sand.
      raf = requestAnimationFrame(frame);
    }
    return () => { cancelAnimationFrame(raf); };
  }, [playing]);

  const press = (b: Button) => () => {
    if (b === "playPause") music.toggle();
    if (b === "next") music.next();
    if (b === "previous") music.previous();
  };
  const title = state.tracks[state.index]?.title;
  return (
    <div className="speaker" data-playing={playing || undefined} style={boundsStyle(speaker.sprite)}>
      <div className="speaker-body" ref={bodyRef}
        style={{ transformOrigin: `${speaker.foot.x * 100}% ${speaker.foot.y * 100}%` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={speaker.sprite.src} width={speaker.sprite.imageWidth} height={speaker.sprite.imageHeight} alt="" draggable="false" />
        <span className="speaker-waves speaker-waves-left" aria-hidden="true" />
        <span className="speaker-waves speaker-waves-right" aria-hidden="true" />
      </div>
      {/* The buttons stay still while the speaker bounces, so they are always easy to hit. */}
      <button type="button" className="speaker-key" style={pct("previous")} onClick={press("previous")} aria-label="Previous song" />
      <button type="button" className="speaker-key" style={pct("playPause")} onClick={press("playPause")}
        aria-label={state.wanted ? `Pause${title ? `: ${title}` : ""}` : "Play music"} aria-pressed={state.wanted} />
      <button type="button" className="speaker-key" style={pct("next")} onClick={press("next")} aria-label="Next song" />
    </div>
  );
}
