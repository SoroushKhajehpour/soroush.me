"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";

const TABS = ["/", "/projects", "/experience", "/resume"] as const;

export default function TopScrollProgress() {
  const pathname = usePathname();

  const progress = useMemo(() => {
    const base =
      pathname === "/" ? "/" : `/${pathname.split("/").filter(Boolean)[0]}`;
    const idx = (TABS as readonly string[]).indexOf(base);
    const safeIdx = idx >= 0 ? idx : 0;
    return (safeIdx + 1) / TABS.length;
  }, [pathname]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed left-0 right-0 top-0 z-60 h-[2px]"
    >
      <div
        className="h-full origin-left bg-[#93c5fd] transition-transform duration-300 ease-out"
        style={{
          transform: `scaleX(${progress})`,
        }}
      />
    </div>
  );
}
