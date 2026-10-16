import * as React from "react"
import { cn } from "cn"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-24 w-full rounded-sm border border-border bg-surface px-3.5 py-3 text-[15px] font-normal shadow-none transition-[background-color,border-color,box-shadow] outline-none placeholder:font-normal placeholder:text-muted-foreground hover:border-border-strong focus-visible:border-foreground/25 focus-visible:bg-background focus-visible:ring-4 focus-visible:ring-foreground/[0.06] disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-[15px]",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
