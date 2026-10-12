"use client";

import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/finance/ui/dialog";

/** Finance's shared modal shell, built on the real shadcn/ui Dialog. */
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
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        className={cn(
          "max-h-[92dvh] overflow-y-auto border-h-border bg-h-surface text-h-fg sm:max-w-lg",
          className
        )}
      >
        <DialogHeader>
          <DialogTitle className="text-base font-extrabold">{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
