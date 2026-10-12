import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-10 w-full rounded-md border border-h-border bg-h-surface px-3 py-2 text-sm text-h-fg shadow-sm outline-none transition-colors placeholder:text-h-muted focus-visible:border-h-brand focus-visible:ring-2 focus-visible:ring-h-brand/30 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Input };
