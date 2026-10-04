"use client";

import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useModuleTheme } from "@/lib/use-module-theme";

/**
 * Bottom sheet on phones, centred dialog on larger screens. Portals to <body> (so no ancestor
 * stacking context can trap it) and re-applies the `habits-theme` token scope, since portalled
 * content sits outside the layout's themed wrapper.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  // false on the server / first render, true on the client — portals need document.body.
  const theme = useModuleTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className={cn(theme, "fixed inset-0 z-[100] flex items-end justify-center sm:items-center")}>
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "habit-sheet-in relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-h-surface text-h-fg shadow-2xl sm:max-w-lg sm:rounded-3xl",
          className
        )}
      >
        <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-4">
          <h2 className="text-base font-extrabold tracking-tight">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-h-surface2 text-h-muted transition-colors hover:text-h-fg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-4">{children}</div>
        {footer && (
          <div className="border-t border-h-border px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">{footer}</div>
        )}
      </div>
    </div>,
    document.body
  );
}
