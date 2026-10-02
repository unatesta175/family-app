"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** shadcn/ui Checkbox, themed with the habit module's tokens. `color` tints the checked state. */
function Checkbox({
  className,
  color,
  style,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root> & { color?: string }) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      style={color ? ({ "--cb": color, ...style } as React.CSSProperties) : style}
      className={cn(
        "peer flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 border-h-border bg-h-surface outline-none transition-colors focus-visible:ring-2 focus-visible:ring-h-brand/40 disabled:cursor-not-allowed disabled:opacity-50",
        color
          ? "data-[state=checked]:border-[var(--cb)] data-[state=checked]:bg-[var(--cb)]"
          : "data-[state=checked]:border-h-brand data-[state=checked]:bg-h-brand",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator>
        <Check className="h-3.5 w-3.5 text-white" strokeWidth={3.5} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
