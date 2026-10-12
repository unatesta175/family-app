"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Minimal hand-rolled modal (no Radix Dialog dep in this repo) — matches the app's existing sheet conventions. */
export function FinanceModal({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm md:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0" onClick={onClose} />
      <div
        className={cn(
          "habit-sheet-in relative z-10 flex max-h-[92dvh] w-full flex-col gap-4 overflow-y-auto rounded-t-3xl border border-h-border bg-h-surface p-5 shadow-2xl md:max-w-lg md:rounded-3xl",
          className
        )}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-h-muted hover:bg-h-surface2 hover:text-h-fg" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
