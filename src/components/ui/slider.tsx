"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  trackClassName,
  rangeClassName,
  thumbClassName,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root> & {
  trackClassName?: string;
  rangeClassName?: string;
  thumbClassName?: string;
}) {
  const values = React.useMemo(
    () =>
      Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : [min, max],
    [value, defaultValue, min, max]
  );

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "relative flex w-full touch-none select-none items-center",
        "data-[disabled]:opacity-50",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className={cn(
          "relative h-1.5 w-full grow overflow-hidden rounded-full bg-neutral-200",
          trackClassName
        )}
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className={cn("absolute h-full bg-emerald-600", rangeClassName)}
        />
      </SliderPrimitive.Track>
      {values.map((_, i) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={i}
          className={cn(
            "block h-3.5 w-3.5 shrink-0 rounded-full border-2 border-white bg-white shadow-[0_1px_3px_rgba(0,0,0,0.35)] ring-0 transition-transform",
            "hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50",
            "disabled:pointer-events-none disabled:opacity-50",
            thumbClassName
          )}
        />
      ))}
    </SliderPrimitive.Root>
  );
}

export { Slider };
