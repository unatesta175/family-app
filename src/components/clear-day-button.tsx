"use client";

import { useState, useTransition } from "react";
import { Eraser } from "lucide-react";
import { setBulkStatusesAction } from "@/lib/actions";
import { PRAYER_ORDER } from "@/lib/prayers";

export function ClearDayButton({
  profileId,
  date,
  className,
}: {
  profileId: number;
  date: string;
  className?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function handleClick() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    startTransition(async () => {
      await setBulkStatusesAction({ profileId, dates: [date], clear: [...PRAYER_ORDER] });
      setConfirming(false);
    });
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={handleClick}
      onBlur={() => setConfirming(false)}
      className={
        className ??
        "flex h-9 items-center gap-1.5 rounded-full bg-neutral-100 px-3 text-xs font-semibold text-neutral-500 hover:bg-neutral-200 disabled:opacity-60"
      }
      aria-label="Clear this day's prayer statuses"
    >
      <Eraser className="h-3.5 w-3.5" />
      {isPending ? "Clearing…" : confirming ? "Tap to confirm" : "Clear day"}
    </button>
  );
}
