"use client";

import { useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Carousel({ items }: { items: ReactNode[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  function onScroll() {
    const el = trackRef.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    setActive(index);
  }

  function goTo(index: number) {
    const el = trackRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(items.length - 1, index));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
    setActive(clamped);
  }

  return (
    <div>
      <div className="group/carousel relative">
        <div
          ref={trackRef}
          onScroll={onScroll}
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto scrollbar-hide"
        >
          {items.map((item, i) => (
            <div key={i} className="w-full shrink-0 snap-center">
              {item}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => goTo(active - 1)}
          disabled={active === 0}
          aria-label="Previous"
          className="absolute left-1 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/90 p-1.5 text-neutral-700 opacity-0 shadow-md transition-opacity hover:bg-white disabled:pointer-events-none disabled:opacity-0 sm:block sm:group-hover/carousel:opacity-100"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => goTo(active + 1)}
          disabled={active === items.length - 1}
          aria-label="Next"
          className="absolute right-1 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/90 p-1.5 text-neutral-700 opacity-0 shadow-md transition-opacity hover:bg-white disabled:pointer-events-none disabled:opacity-0 sm:block sm:group-hover/carousel:opacity-100"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex items-center justify-center gap-1.5">
        {items.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Go to item ${i + 1}`}
            className={cn(
              "h-1.5 cursor-pointer rounded-full transition-all",
              active === i ? "w-4 bg-emerald-700" : "w-1.5 bg-neutral-300 hover:bg-neutral-400"
            )}
          />
        ))}
      </div>
    </div>
  );
}
