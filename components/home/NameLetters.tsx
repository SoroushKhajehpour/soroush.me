"use client";

import { useEffect, useRef, useState } from "react";

/*
  The bitmap name, made interactive. Each word image is cut into letters (cut columns
  measured from the PNGs, in source px) and every letter is a window onto the same image,
  so idle it is pixel-for-pixel the original. Near the cursor letters lean toward it on a
  spring, snapped to device pixels; entering a letter can briefly slip one band of it
  sideways. Only on fine pointers with motion allowed; otherwise the plain images stay.
*/
const WORDS = [
  { cls: "name-first", src: "/coast/name-first.png", width: 379, cuts: [0, 56, 109, 163, 217, 271, 324, 379] },
  { cls: "name-last", src: "/coast/name-last.png", width: 539, cuts: [0, 55, 109, 162, 215, 268, 321, 374, 429, 482, 539] },
] as const;
const HEIGHT = 65;

// The feel.
const MAX_SHIFT = 3;        // CSS px a letter can move
const RADIUS = 1.6;         // reach, in letter heights from the cursor
const STIFFNESS = 260, DAMPING = 22;
const GLITCH_MS = 120, GLITCH_PX = 2, GLITCH_COOLDOWN = 650;

export function NameLetters() {
  const [live, setLive] = useState(false);
  const root = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setLive(fine.matches && !calm.matches);
    sync();
    fine.addEventListener("change", sync); calm.addEventListener("change", sync);
    return () => { fine.removeEventListener("change", sync); calm.removeEventListener("change", sync); };
  }, []);

  useEffect(() => {
    if (!live || !root.current) return;
    const letters = [...root.current.querySelectorAll<HTMLElement>(".name-letter")];
    const st = letters.map(() => ({ x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0 }));
    let raf = 0, last = 0, hovered = -1, lastGlitch = 0;
    const dpr = () => window.devicePixelRatio || 1;
    const snap = (v: number) => Math.round(v * dpr()) / dpr();

    function onMove(e: PointerEvent) {
      const rects = letters.map(l => l.getBoundingClientRect());
      const h = rects[0]?.height || 1;
      let under = -1;
      rects.forEach((r, i) => {
        // Rest position: undo the letter's current offset.
        const cx = r.left + r.width / 2 - st[i].x, cy = r.top + r.height / 2 - st[i].y;
        const dx = e.clientX - cx, dy = e.clientY - cy, d = Math.hypot(dx, dy);
        const k = Math.max(0, 1 - d / (RADIUS * h));
        const pull = MAX_SHIFT * k * k;
        st[i].tx = d ? dx / d * pull : 0; st[i].ty = d ? dy / d * pull : 0;
        if (e.clientX >= r.left && e.clientX < r.right && e.clientY >= r.top && e.clientY < r.bottom) under = i;
      });
      if (under !== hovered) {
        hovered = under;
        const now = performance.now();
        if (under >= 0 && now - lastGlitch > GLITCH_COOLDOWN && Math.abs(e.movementX) + Math.abs(e.movementY) > 2) {
          lastGlitch = now;
          glitch(letters[under]);
        }
      }
      if (!raf) { last = 0; raf = requestAnimationFrame(step); }
    }
    function glitch(el: HTMLElement) {
      const top = 15 + Math.floor(Math.random() * 55);           // % from the top
      el.style.setProperty("--g-top", `${top}%`);
      el.style.setProperty("--g-bot", `${Math.min(95, top + 10 + Math.floor(Math.random() * 12))}%`);
      el.style.setProperty("--g-dx", `${(Math.random() < .5 ? -1 : 1) * GLITCH_PX}px`);
      el.dataset.glitch = "";
      window.setTimeout(() => { delete el.dataset.glitch; }, GLITCH_MS);
    }
    function step(now: number) {
      const dt = last ? Math.min(.033, (now - last) / 1000) : 1 / 60;
      last = now;
      let moving = false;
      st.forEach((s, i) => {
        s.vx += ((s.tx - s.x) * STIFFNESS - s.vx * DAMPING) * dt;
        s.vy += ((s.ty - s.y) * STIFFNESS - s.vy * DAMPING) * dt;
        s.x += s.vx * dt; s.y += s.vy * dt;
        if (Math.abs(s.tx - s.x) > .02 || Math.abs(s.vx) > .05 || Math.abs(s.ty - s.y) > .02 || Math.abs(s.vy) > .05) moving = true;
        else { s.x = s.tx; s.y = s.ty; s.vx = s.vy = 0; }
        const x = snap(s.x), y = snap(s.y);
        letters[i].style.transform = x || y ? `translate3d(${x}px,${y}px,0)` : "";
      });
      raf = moving ? requestAnimationFrame(step) : 0;
    }
    function release() { st.forEach(s => { s.tx = 0; s.ty = 0; }); hovered = -1; if (!raf) { last = 0; raf = requestAnimationFrame(step); } }
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", release);
    window.addEventListener("blur", release);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", release);
      window.removeEventListener("blur", release);
      letters.forEach(l => { l.style.transform = ""; delete l.dataset.glitch; });
    };
  }, [live]);

  return (
    <span className="name-words" ref={root} data-live={live || undefined} aria-hidden="true">
      {WORDS.map(w => (
        <span key={w.cls} className={`name-word ${w.cls}`}>
          {/* Native images preserve authored pixels; Next image resizing would resample them. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="name-base" src={w.src} width={w.width} height={HEIGHT} alt="" />
          {live && w.cuts.slice(0, -1).map((x0, i) => {
            const x1 = w.cuts[i + 1];
            return (
              <span key={x0} className="name-letter" style={{ left: `${x0 / w.width * 100}%`, width: `${(x1 - x0) / w.width * 100}%` }}>
                {[0, 1].map(k => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={k} className={k ? "name-slip" : "name-ink"} src={w.src} alt="" draggable="false"
                    style={{ width: `${w.width / (x1 - x0) * 100}%`, left: `${-x0 / (x1 - x0) * 100}%` }} />
                ))}
              </span>
            );
          })}
        </span>
      ))}
    </span>
  );
}
