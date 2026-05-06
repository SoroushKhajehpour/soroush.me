"use client";

import { useEffect, useState } from "react";

const START_FILL_AT_ABOUT = 0.38;

function clamp01(value: number) {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export default function TopScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let ticking = false;

    const measure = () => {
      const scrollTop = window.scrollY || window.pageYOffset || 0;
      const aboutEl = document.getElementById("about");
      const resumeEl = document.getElementById("resume");
      const viewportHeight = window.innerHeight;
      const maxScrollable =
        document.documentElement.scrollHeight - document.documentElement.clientHeight;

      let next = 0;

      if (aboutEl && resumeEl) {
        const aboutTop = aboutEl.getBoundingClientRect().top + scrollTop;
        const resumeTop = resumeEl.getBoundingClientRect().top + scrollTop;
        const start = aboutTop - viewportHeight * 0.2;
        const end = Math.max(start + 1, resumeTop - viewportHeight * 0.25);
        const between = clamp01((scrollTop - start) / (end - start));

        if (between > 0) {
          next = START_FILL_AT_ABOUT + between * (1 - START_FILL_AT_ABOUT);
        } else {
          next = 0;
        }
      } else if (maxScrollable > 0) {
        next = clamp01(scrollTop / maxScrollable);
      }

      setProgress(next);
      ticking = false;
    };

    const requestMeasure = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(measure);
    };

    requestMeasure();
    window.addEventListener("scroll", requestMeasure, { passive: true });
    window.addEventListener("resize", requestMeasure);

    return () => {
      window.removeEventListener("scroll", requestMeasure);
      window.removeEventListener("resize", requestMeasure);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed left-0 right-0 top-0 z-60 h-[2px] bg-sky-200/25"
    >
      <div
        className="h-full origin-left bg-sky-300/95 transition-transform duration-150 ease-out"
        style={{
          transform: `scaleX(${Math.max(progress, 0.03)})`,
          boxShadow: "0 0 8px rgba(125, 211, 252, 0.45)",
        }}
      />
    </div>
  );
}
