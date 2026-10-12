import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-16 w-full rounded-md border border-h-border bg-h-surface px-3 py-2 text-sm text-h-fg shadow-sm outline-none transition-colors placeholder:text-h-muted focus-visible:border-h-brand focus-visible:ring-2 focus-visible:ring-h-brand/30 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
