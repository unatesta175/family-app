import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-10 w-full rounded-md border border-neutral-200 bg-transparent px-3 py-2 text-sm text-neutral-900 shadow-sm outline-none ring-offset-white transition-colors placeholder:text-neutral-400 focus-visible:border-emerald-600 focus-visible:ring-2 focus-visible:ring-emerald-600/30 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Input };
