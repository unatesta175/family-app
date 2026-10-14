"use client";

import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/finance/ui/dialog";

/** Thin wrapper around the shadcn Dialog primitive, keeping the existing call-site API stable. */
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
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className={cn("min-w-0 max-h-[90dvh] overflow-y-auto md:max-w-lg", className)}>
        <DialogHeader className="pr-6">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Bottom sheet on phones, centred dialog on larger screens, with a Cancel / Title / Save action
 * bar in place of a floating close button — matches the reference "Add Expense" sheet convention
 * (drag handle, text actions in the header) instead of the generic shadcn dialog chrome.
 */
export function FinanceSheet({
  open,
  onClose,
  title,
  onSave,
  saveLabel = "Save",
  saveDisabled,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  onSave?: () => void;
  saveLabel?: string;
  saveDisabled?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "top-auto bottom-0 left-0 right-0 translate-x-0 translate-y-0 gap-0 rounded-b-none rounded-t-3xl border-b-0 p-0",
          "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100",
          "max-h-[92dvh] w-full max-w-none overflow-hidden sm:top-[50%] sm:bottom-auto sm:left-[50%] sm:right-auto sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:border-b",
          className
        )}
      >
        <div className="flex justify-center pb-1 pt-2 sm:hidden">
          <span className="h-1 w-9 rounded-full bg-muted-foreground/25" />
        </div>
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <button type="button" onClick={onClose} className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
            Cancel
          </button>
          <DialogTitle className="text-base font-bold">{title}</DialogTitle>
          {onSave ? (
            <button
              type="button"
              onClick={onSave}
              disabled={saveDisabled}
              className="text-sm font-bold text-foreground transition-opacity disabled:opacity-40"
            >
              {saveLabel}
            </button>
          ) : (
            <span className="w-[42px]" />
          )}
        </div>
        <div className="overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
