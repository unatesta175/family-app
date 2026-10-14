"use client";

import { EyeOff } from "lucide-react";
import { useHiddenHabits } from "@/components/hidden-habits-context";

/** Blocks a hidden habit's own detail page from leaking its name/data until the owner reveals hidden habits on this device. */
export function HiddenHabitGate({ hidden, children }: { hidden: boolean; children: React.ReactNode }) {
  const { revealed } = useHiddenHabits();
  if (hidden && !revealed) {
    return (
      <div className="h-card flex flex-col items-center gap-2 p-8 text-center">
        <EyeOff className="h-6 w-6 text-h-muted" />
        <p className="text-sm font-bold">This habit is hidden on this device</p>
        <p className="text-xs text-h-muted">Use the eye icon on the Progress page to reveal it.</p>
      </div>
    );
  }
  return <>{children}</>;
}
