"use client";

import { useState, useTransition } from "react";
import { Check as DoneIcon, Eraser } from "lucide-react";
import { setDayStatusesAction } from "@/lib/actions";
import { PRAYER_ORDER, PRAYER_META, STATUS_ORDER, STATUS_ICON, STATUS_META } from "@/lib/prayers";
import type { Prayer, Status } from "@/lib/db/schema";
import type { DayLogMap } from "@/lib/streaks";
import { cn } from "@/lib/utils";

type EditStatus = Exclude<Status, "not_yet"> | null;

const TONE: Record<Exclude<Status, "not_yet"> | "pending", { row: string; icon: string; label: string }> = {
  on_time_jamaah: { row: "bg-emerald-50", icon: "bg-emerald-100", label: "text-emerald-700" },
  on_time: { row: "bg-emerald-50", icon: "bg-emerald-100", label: "text-emerald-700" },
  jamaah: { row: "bg-sky-50", icon: "bg-sky-100", label: "text-sky-700" },
  late: { row: "bg-amber-50", icon: "bg-amber-100", label: "text-amber-700" },
  qada: { row: "bg-violet-50", icon: "bg-violet-100", label: "text-violet-700" },
  missed: { row: "bg-rose-50", icon: "bg-rose-100", label: "text-rose-600" },
  excused: { row: "bg-pink-50", icon: "bg-pink-100", label: "text-pink-700" },
  pending: { row: "bg-neutral-50", icon: "bg-neutral-100", label: "text-neutral-400" },
};

function initialStatuses(dayLog: DayLogMap): Record<Prayer, EditStatus> {
  const result = {} as Record<Prayer, EditStatus>;
  for (const prayer of PRAYER_ORDER) {
    const status = dayLog[prayer] ?? "not_yet";
    result[prayer] = status === "not_yet" ? null : status;
  }
  return result;
}

export function EditDayDrawer({
  profileId,
  date,
  dayLog,
  onClose,
  haydEnabled = false,
}: {
  profileId: number;
  date: string;
  dayLog: DayLogMap;
  onClose: () => void;
  haydEnabled?: boolean;
}) {
  const [statuses, setStatuses] = useState<Record<Prayer, EditStatus>>(() => initialStatuses(dayLog));
  const [isPending, startTransition] = useTransition();
  const options = haydEnabled ? ([...STATUS_ORDER, "excused"] as const) : STATUS_ORDER;

  const allSame = PRAYER_ORDER.every((p) => statuses[p] === statuses[PRAYER_ORDER[0]])
    ? statuses[PRAYER_ORDER[0]]
    : null;

  function setAll(value: Exclude<EditStatus, null>) {
    setStatuses(() => {
      const next = {} as Record<Prayer, EditStatus>;
      for (const prayer of PRAYER_ORDER) next[prayer] = value;
      return next;
    });
  }

  function setRow(prayer: Prayer, value: Exclude<EditStatus, null>) {
    setStatuses((prev) => ({ ...prev, [prayer]: value }));
  }

  function clearAll() {
    setStatuses(() => {
      const next = {} as Record<Prayer, EditStatus>;
      for (const prayer of PRAYER_ORDER) next[prayer] = null;
      return next;
    });
  }

  function handleDone() {
    const payload: Partial<Record<Prayer, Status>> = {};
    for (const prayer of PRAYER_ORDER) {
      const value = statuses[prayer];
      if (value) payload[prayer] = value;
    }
    startTransition(async () => {
      await setDayStatusesAction({ profileId, date, statuses: payload });
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="scrollbar-hide flex max-h-[85vh] w-full max-w-md flex-col overflow-y-auto rounded-t-3xl bg-white px-5 pb-8 pt-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-neutral-200" />
        <div className="flex items-center justify-center gap-2">
          <p className="text-center text-[11px] font-bold uppercase tracking-widest text-neutral-400">
            Edit Day Records
          </p>
          <button
            type="button"
            onClick={clearAll}
            className="flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-neutral-500 hover:bg-neutral-200"
            aria-label="Clear all prayer statuses for this day"
          >
            <Eraser className="h-3 w-3" />
            Clear all
          </button>
        </div>

        <div className={cn("mt-4 grid gap-1 rounded-full bg-black/5 p-1", haydEnabled ? "grid-cols-7" : "grid-cols-6")}>
          {options.map((value) => {
            const Icon = STATUS_ICON[value];
            const active = allSame === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setAll(value)}
                className={cn(
                  "flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-full px-1 py-2 text-[9px] font-bold uppercase tracking-wide transition-colors",
                  active ? "bg-emerald-700 text-white shadow-sm" : "text-neutral-500 hover:bg-white/60"
                )}
              >
                <Icon className="h-3 w-3 shrink-0" strokeWidth={2.5} />
                <span className="truncate">{STATUS_META[value].short}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-col gap-2.5">
          {PRAYER_ORDER.map((prayer) => {
            const meta = PRAYER_META[prayer];
            const Icon = meta.icon;
            const value = statuses[prayer];
            const toneKey = value ?? "pending";
            const tone = TONE[toneKey];

            return (
              <div key={prayer} className={cn("flex items-center gap-3 rounded-2xl px-3.5 py-3", tone.row)}>
                <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", tone.icon)}>
                  <Icon className="h-5 w-5 text-neutral-700" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-neutral-900">{meta.label}</p>
                  <p className={cn("text-xs font-medium", tone.label)}>
                    {value ? STATUS_META[value].label : "Pending"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1 rounded-full bg-white/70 p-1">
                  {options.map((v) => {
                    const OptIcon = STATUS_ICON[v];
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setRow(prayer, v)}
                        aria-label={`${meta.label} ${STATUS_META[v].label}`}
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-full transition-colors",
                          value === v ? "bg-emerald-700 text-white" : "bg-neutral-100 text-neutral-400"
                        )}
                      >
                        <OptIcon className="h-3.5 w-3.5" />
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleDone}
          disabled={isPending}
          className="mt-5 flex items-center justify-center gap-2 rounded-full bg-emerald-700 py-3.5 text-sm font-bold text-white transition-colors hover:bg-emerald-800 disabled:opacity-60"
        >
          <DoneIcon className="h-4 w-4" />
          {isPending ? "Saving..." : "Done"}
        </button>
      </div>
    </div>
  );
}
