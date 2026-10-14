"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useHiddenHabits } from "@/components/hidden-habits-context";
import { ConfirmDialog } from "@/components/habits/confirm-dialog";

/** Eye toggle for habits marked "hidden", for this device only. Sits next to the Week/Month/Heatmap pill. */
export function HiddenHabitsToggle() {
  const { revealed, reveal, conceal } = useHiddenHabits();
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => (revealed ? conceal() : setConfirming(true))}
        aria-label={revealed ? "Hide concealed habits" : "Show concealed habits"}
        title={revealed ? "Hide concealed habits" : "Show concealed habits"}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-h-border bg-h-surface text-h-muted shadow-sm hover:text-h-fg"
      >
        {revealed ? <Eye className="h-[18px] w-[18px]" /> : <EyeOff className="h-[18px] w-[18px]" />}
      </button>
      {confirming && (
        <ConfirmDialog
          title="Show hidden habits?"
          message="This reveals every habit you've hidden from your own display, on this device, until you tap this again."
          confirmLabel="Show them"
          destructive={false}
          onConfirm={reveal}
          onClose={() => setConfirming(false)}
        />
      )}
    </>
  );
}
