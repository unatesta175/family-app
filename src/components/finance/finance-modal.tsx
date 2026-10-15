"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/finance/ui/dialog";

/**
 * The shared finance modal shell — rounded-3xl card, bold title with a circular close button,
 * generously spaced body, and (optionally) a right-aligned Cancel/primary pill footer. Every
 * finance form (bills, transactions, accounts, trips, templates, reminders, lending, transfers)
 * renders through this so every popup in the module looks and behaves the same way.
 */
export function FinanceModal({
  open,
  onClose,
  title,
  children,
  className,
  onSave,
  saveLabel = "Save",
  saveDisabled,
  cancelLabel = "Cancel",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
  /** When given, renders a Cancel / primary action footer bar instead of leaving it to `children`. */
  onSave?: () => void;
  saveLabel?: string;
  saveDisabled?: boolean;
  cancelLabel?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "min-w-0 max-h-[90dvh] gap-5 overflow-x-hidden overflow-y-auto rounded-[22px] border-border p-7 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.3),0_4px_12px_rgba(0,0,0,0.06)] duration-150 sm:max-w-md md:max-w-lg",
          className
        )}
      >
        <DialogHeader className="flex-row items-center justify-between gap-3 space-y-0 pr-0 text-left">
          <DialogTitle className="text-xl font-bold tracking-tight">{title}</DialogTitle>
          <DialogClose className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </DialogHeader>
        <div className="min-w-0 flex flex-col gap-5">{children}</div>
        {onSave && (
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-full border border-border bg-card px-5 text-sm font-bold text-foreground transition-colors hover:bg-muted"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saveDisabled}
              className="h-11 rounded-full bg-foreground px-6 text-sm font-bold text-background transition-opacity disabled:opacity-40"
            >
              {saveLabel}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * A field label + input/control pair matching the reference modal: small bold label above a
 * tall, rounded-xl, softly-filled control. Pass the control as `children`.
 */
export function FinanceField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-2", className)}>
      <span className="text-sm font-semibold text-foreground">{label}</span>
      {children}
    </label>
  );
}
