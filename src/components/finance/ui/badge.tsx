import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold w-fit whitespace-nowrap shrink-0",
  {
    variants: {
      variant: {
        default: "border-transparent bg-h-brand-soft text-h-brand",
        secondary: "border-transparent bg-h-surface2 text-h-muted",
        outline: "border-h-border bg-h-surface text-h-fg",
        success: "border-transparent bg-h-good/15 text-h-good",
        warning: "border-transparent bg-h-break-soft text-h-break",
        destructive: "border-transparent bg-h-bad/15 text-h-bad",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span data-slot="badge" className={cn(badgeVariants({ variant, className }))} {...props} />
  );
}

export { Badge, badgeVariants };
