"use client";

import { lazy, Suspense, useState } from "react";
import { FaStar } from "react-icons/fa6";
import { cn } from "@/lib/utils";

const TiltCard = lazy(() => import("@/components/ui/tilt-card"));

export function StarTiltReveal() {
  const [open, setOpen] = useState(false);
  const [hasLoadedCard, setHasLoadedCard] = useState(false);

  const toggle = () => {
    setHasLoadedCard(true);
    setOpen((v) => !v);
  };

  return (
    <div className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-40 md:bottom-8 md:right-8">
      <div className="relative inline-flex flex-col items-end">
        <div
          className={cn(
            "absolute right-0 bottom-full z-10 mb-1 flex w-[min(156px,58vw)] max-w-[min(156px,calc(100vw-1.5rem))] -translate-x-1 -translate-y-0.5 flex-col transition-opacity duration-200",
            open && hasLoadedCard
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none opacity-0",
          )}
          aria-hidden={!open}
        >
          {hasLoadedCard && (
            <Suspense fallback={null}>
              <div className="h-[min(164px,min(25vh,calc(100vh-6rem)))] w-full shrink-0 max-h-[calc(100vh-6rem)]">
                <TiltCard
                  className="h-full w-full"
                  image={{
                    src: "/little-me.png",
                    alt: "Little me on the beach",
                  }}
                  imageObjectPosition="center"
                />
              </div>
            </Suspense>
          )}
        </div>

        <div className="flex items-center justify-end gap-2">
          {open && hasLoadedCard && (
            <p className="max-w-[min(220px,55vw)] text-right font-serif text-[12px] leading-snug text-blue-200">
              You found little me!
            </p>
          )}
          <button
            type="button"
            onClick={toggle}
            className="shrink-0 cursor-pointer rounded-sm p-1 text-blue-300 transition-colors hover:text-blue-200"
            aria-label={open ? "Hide photo" : "Show photo"}
            aria-expanded={open}
          >
            <FaStar className="size-2.5" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
