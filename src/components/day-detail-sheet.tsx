"use client";

import { Check, X as XIcon, Circle, Clock, X } from "lucide-react";
import { PRAYER_ORDER, PRAYER_META } from "@/lib/prayers";
import type { DayLogMap } from "@/lib/streaks";
import { isPerformed } from "@/lib/prayers";
import { parseIso } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { Status } from "@/lib/db/schema";

function detailLabel(status: Status): string {
  switch (status) {
    case "on_time_jamaah":
      return "Ontime + Jamaah";
    case "on_time":
      return "Ontime";
    case "jamaah":
      return "Prayed";
    case "late":
      return "Late";
    case "qada":
      return "Qada";
    case "missed":
      return "Missed";
    default:
      return "Pending";
  }
}

function rowTone(status: Status): "done" | "missed" | "pending" {
  if (status === "missed") return "missed";
  if (status === "not_yet") return "pending";
  return "done";
}

const TONE_STYLES = {
  done: {
    row: "border-emerald-100 bg-emerald-50/50 hover:bg-emerald-50",
    badge: "border border-emerald-200 bg-emerald-50 text-emerald-700",
    icon: "bg-emerald-500",
  },
  missed: {
    row: "border-rose-100 bg-rose-50/50 hover:bg-rose-50",
    badge: "border border-rose-200 bg-rose-50 text-rose-600",
    icon: "bg-rose-500",
  },
  pending: {
    row: "border-neutral-200 bg-white hover:bg-neutral-50",
    badge: "border border-neutral-200 bg-white text-neutral-500",
    icon: "border-2 border-neutral-300",
  },
} as const;

export function DayDetailSheet({
  date,
  log,
  hasLog,
  isToday,
  onClose,
}: {
  date: string;
  log: DayLogMap;
  hasLog: boolean;
  isToday: boolean;
  onClose: () => void;
}) {
  const showBreakdown = hasLog || isToday;
  const performedCount = PRAYER_ORDER.filter((p) => isPerformed(log[p] ?? "not_yet")).length;
  const pct = Math.round((performedCount / PRAYER_ORDER.length) * 100);
  const dateLabel = parseIso(date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="scrollbar-hide flex max-h-[80vh] w-full max-w-md flex-col overflow-y-auto rounded-t-[28px] border-t border-neutral-200 bg-white px-5 pb-8 pt-3 shadow-[0_-12px_40px_rgba(15,23,22,0.16)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 shrink-0 rounded-full bg-neutral-200" />

        <div className="flex items-start justify-between">
          <div>
            <p className="text-lg font-bold tracking-tight text-neutral-900">{dateLabel}</p>
            <p className="text-xs text-neutral-400">
              {performedCount} of {PRAYER_ORDER.length} prayers completed
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-bold text-emerald-700">
              {pct}%
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-full border border-neutral-200 p-1.5 text-neutral-400 transition-colors hover:bg-neutral-50 hover:text-neutral-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {showBreakdown ? (
          <div className="mt-5 flex flex-col gap-2">
            {PRAYER_ORDER.map((prayer) => {
              const status = log[prayer] ?? "not_yet";
              const tone = rowTone(status);
              const styles = TONE_STYLES[tone];
              const meta = PRAYER_META[prayer];
              return (
                <div
                  key={prayer}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border px-4 py-3.5 transition-colors",
                    styles.row
                  )}
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      styles.icon
                    )}
                  >
                    {tone === "done" && <Check className="h-4 w-4 text-white" strokeWidth={2.5} />}
                    {tone === "missed" && <XIcon className="h-4 w-4 text-white" strokeWidth={2.5} />}
                    {tone === "pending" && <Circle className="h-3 w-3 text-neutral-300" />}
                  </div>
                  <p className="flex-1 text-sm font-semibold text-neutral-900">{meta.label}</p>
                  <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", styles.badge)}>
                    {detailLabel(status)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-neutral-100 bg-neutral-50/60 py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50">
              <Clock className="h-6 w-6 text-emerald-300" strokeWidth={1.5} strokeDasharray="2 3" />
            </div>
            <p className="text-base font-bold text-neutral-900">Unlogged Day</p>
            <p className="max-w-xs text-sm text-neutral-400">
              No prayers were recorded for this date. Spiritual journeys are rarely linear &mdash; keep
              moving forward.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
