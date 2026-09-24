"use client";

import { useState, type ReactNode } from "react";
import { SquarePen } from "lucide-react";
import { EditDayDrawer } from "@/components/edit-day-drawer";
import type { DayLogMap } from "@/lib/streaks";

export function EditDayButton({
  profileId,
  date,
  dayLog,
  className,
  children,
  haydEnabled = false,
}: {
  profileId: number;
  date: string;
  dayLog: DayLogMap;
  className?: string;
  children?: ReactNode;
  haydEnabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
        }
        aria-label="Edit day records"
      >
        {children ?? <SquarePen className="h-4 w-4" />}
      </button>

      {open && (
        <EditDayDrawer
          profileId={profileId}
          date={date}
          dayLog={dayLog}
          onClose={() => setOpen(false)}
          haydEnabled={haydEnabled}
        />
      )}
    </>
  );
}
