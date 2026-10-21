"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Reveals its `[data-reveal]` children as they come into view (they rise and fade in,
 * staggered along each row by their `--i`). Each reveals once. With reduced motion, or
 * without IntersectionObserver, everything is simply shown. While the camera only passes
 * through its section (`data-passing`, components/home/Panorama.tsx) nothing reveals;
 * once that ends, whatever is in view then reveals as usual.
 */
export function Reveal({ as: Tag = "div", className, children, self = false, threshold = .15 }: {
  as?: "div" | "ol" | "ul"; className?: string; children: ReactNode;
  /** Reveal the container itself, as one piece (its CSS sequences what's inside). */
  self?: boolean; threshold?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const items = self ? [root] : [...root.querySelectorAll<HTMLElement>("[data-reveal]")];
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      items.forEach(el => el.setAttribute("data-shown", ""));
      return;
    }
    root.setAttribute("data-armed", "");
    const section = root.closest<HTMLElement>("[data-zone]");
    const passing = () => section?.hasAttribute("data-passing") ?? false;
    const observer = new IntersectionObserver(entries => {
      if (passing()) return;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.setAttribute("data-shown", "");
        observer.unobserve(entry.target);
      }
    }, { threshold, rootMargin: "0px 0px -6% 0px" });
    items.forEach(el => observer.observe(el));
    // Observing again reports the current intersection, for anything passed over meanwhile.
    const watch = new MutationObserver(() => {
      if (passing()) return;
      for (const el of items) if (!el.hasAttribute("data-shown")) { observer.unobserve(el); observer.observe(el); }
    });
    if (section) watch.observe(section, { attributeFilter: ["data-passing"] });
    return () => { observer.disconnect(); watch.disconnect(); };
  }, [self, threshold]);
  return <Tag ref={ref as never} className={className}>{children}</Tag>;
}
