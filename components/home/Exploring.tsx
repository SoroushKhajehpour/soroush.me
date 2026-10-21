"use client";

import { useEffect, useRef } from "react";
import { exploring } from "@/lib/coast/scene-config";

/*
  "exploring <topic>", where the topic types itself, holds, deletes and moves on to the
  next, with a pixel block cursor. Characters are written straight into the DOM, so React
  never re-renders per keystroke. Screen readers get one stable sentence with every topic;
  with reduced motion the first topic simply stays.
*/
export function Exploring() {
  const out = useRef<HTMLSpanElement>(null);
  const cursor = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = out.current, caret = cursor.current;
    if (!el || !caret) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const { topics, typeMs, holdMs, deleteMs, gapMs } = exploring;
    let topic = 0, shown = topics[0].length, phase: "hold" | "delete" | "gap" | "type" = "hold", timer = 0;

    const show = () => { el.textContent = topics[topic].slice(0, shown); };
    // Blinks only while still (holding or between topics), solid while typing or deleting.
    const blink = (on: boolean) => caret.toggleAttribute("data-blink", on);
    function tick() {
      if (phase === "hold") { phase = "delete"; blink(false); }
      if (phase === "delete") {
        if (shown > 0) { shown--; show(); timer = window.setTimeout(tick, deleteMs); return; }
        phase = "gap"; blink(true); timer = window.setTimeout(tick, gapMs); return;
      }
      if (phase === "gap") { topic = (topic + 1) % topics.length; phase = "type"; blink(false); }
      if (shown < topics[topic].length) { shown++; show(); timer = window.setTimeout(tick, typeMs); return; }
      phase = "hold"; blink(true); timer = window.setTimeout(tick, holdMs);
    }
    function start() {
      window.clearTimeout(timer);
      if (calm.matches || document.hidden) { topic = 0; shown = topics[0].length; show(); blink(!calm.matches); return; }
      timer = window.setTimeout(tick, holdMs);
    }
    show(); blink(true); start();
    const onVisible = () => (document.hidden ? window.clearTimeout(timer) : start());
    document.addEventListener("visibilitychange", onVisible);
    calm.addEventListener("change", start);
    return () => { window.clearTimeout(timer); document.removeEventListener("visibilitychange", onVisible); calm.removeEventListener("change", start); };
  }, []);

  return (
    <>
      <span className="sr-only">exploring {exploring.topics.join(", ")}</span>
      <span aria-hidden="true">exploring <span className="bio-topic" ref={out}>{exploring.topics[0]}</span><span className="bio-cursor" ref={cursor} data-blink="" /></span>
    </>
  );
}
