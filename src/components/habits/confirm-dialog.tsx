"use client";

import { Sheet } from "@/components/habits/sheet";

/** A small "are you sure?" popup. Built on Sheet so it matches the other habit dialogs. */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onClose,
  destructive = true,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  destructive?: boolean;
}) {
  return (
    <Sheet
      open
      onClose={onClose}
      title={title}
      className="sm:max-w-sm"
      footer={
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-h-border bg-h-surface py-2.5 text-sm font-bold text-h-muted hover:text-h-fg"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            style={{ background: destructive ? "var(--h-bad)" : "var(--h-brand)" }}
            className="rounded-xl py-2.5 text-sm font-extrabold text-white"
          >
            {confirmLabel}
          </button>
        </div>
      }
    >
      <p className="pb-2 pt-1 text-sm leading-relaxed text-h-muted">{message}</p>
    </Sheet>
  );
}
