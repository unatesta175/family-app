"use client";

import { useState, useTransition } from "react";
import { CheckCheck, X } from "lucide-react";
import { setBulkStatusesAction } from "@/lib/actions";
import { PRAYER_ORDER, PRAYER_META, STATUS_ORDER, STATUS_ICON, STATUS_META } from "@/lib/prayers";
import type { Prayer, Status } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

/** null = leave as is, "clear" = remove the status (back to no status). */
type EditStatus = Exclude<Status, "not_yet"> | "clear" | null;

const TONE: Record<Exclude<Status, "not_yet"> | "clear" | "pending", { row: string; icon: string; label: string }> = {
  on_time_jamaah: { row: "bg-emerald-50", icon: "bg-emerald-100", label: "text-emerald-700" },
  on_time: { row: "bg-emerald-50", icon: "bg-emerald-100", label: "text-emerald-700" },
  jamaah: { row: "bg-sky-50", icon: "bg-sky-100", label: "text-sky-700" },
  late: { row: "bg-amber-50", icon: "bg-amber-100", label: "text-amber-700" },
  qada: { row: "bg-violet-50", icon: "bg-violet-100", label: "text-violet-700" },
  missed: { row: "bg-rose-50", icon: "bg-rose-100", label: "text-rose-600" },
  excused: { row: "bg-pink-50", icon: "bg-pink-100", label: "text-pink-700" },
  clear: { row: "bg-neutral-100", icon: "bg-neutral-200", label: "text-neutral-600" },
  pending: { row: "bg-neutral-50", icon: "bg-neutral-100", label: "text-neutral-400" },
};

export function BulkLogDrawer({
  profileId,
  dates,
  onClose,
  onSaved,
  haydEnabled = false,
}: {
  profileId: number;
  dates: string[];
  onClose: () => void;
  onSaved: () => void;
  haydEnabled?: boolean;
}) {
  const [statuses, setStatuses] = useState<Record<Prayer, EditStatus>>(() => {
    const init = {} as Record<Prayer, EditStatus>;
    for (const prayer of PRAYER_ORDER) init[prayer] = null;
    return init;
  });
  const [isPending, startTransition] = useTransition();
  const options = haydEnabled ? ([...STATUS_ORDER, "excused"] as const) : STATUS_ORDER;

  const allSame = PRAYER_ORDER.every((p) => statuses[p] === statuses[PRAYER_ORDER[0]])
    ? statuses[PRAYER_ORDER[0]]
    : null;

  const anySet = PRAYER_ORDER.some((p) => statuses[p] !== null);

  function setAll(value: NonNullable<EditStatus>) {
    setStatuses(() => {
      const next = {} as Record<Prayer, EditStatus>;
      for (const prayer of PRAYER_ORDER) next[prayer] = value;
      return next;
    });
  }

  function setRow(prayer: Prayer, value: NonNullable<EditStatus>) {
    setStatuses((prev) => ({ ...prev, [prayer]: value }));
  }

  function handleSave() {
    const payload: Partial<Record<Prayer, Status>> = {};
    const clear: Prayer[] = [];
    for (const prayer of PRAYER_ORDER) {
      const value = statuses[prayer];
      if (value === "clear") clear.push(prayer);
      else if (value) payload[prayer] = value;
    }
    if (Object.keys(payload).length === 0 && clear.length === 0) return;
    startTransition(async () => {
      await setBulkStatusesAction({ profileId, dates, statuses: payload, clear });
      onSaved();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="scrollbar-hide flex max-h-[85vh] w-full max-w-md flex-col overflow-y-auto rounded-t-3xl bg-white px-5 pb-8 pt-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-neutral-200" />
        <p className="text-center text-[11px] font-bold uppercase tracking-widest text-neutral-400">
          Bulk Log: {dates.length} Day{dates.length === 1 ? "" : "s"}
        </p>
        <p className="mt-0.5 text-center text-xs text-neutral-400">Applied to all selected dates. Use ✕ to clear a status.</p>

        <div className={cn("mt-4 grid gap-1 rounded-full bg-black/5 p-1", haydEnabled ? "grid-cols-8" : "grid-cols-7")}>
          {([...options, "clear"] as const).map((value) => {
            const Icon = value === "clear" ? X : STATUS_ICON[value];
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
                <span className="truncate">{value === "clear" ? "Clear" : STATUS_META[value].short}</span>
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
                    {value === "clear" ? "Will be cleared" : value ? STATUS_META[value].label : "Unchanged"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1 rounded-full bg-white/70 p-1">
                  <button
                    type="button"
                    onClick={() => setRow(prayer, "clear")}
                    aria-label={`${meta.label} clear status`}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full transition-colors",
                      value === "clear" ? "bg-neutral-700 text-white" : "bg-neutral-100 text-neutral-400"
                    )}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
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
          onClick={handleSave}
          disabled={isPending || !anySet}
          className="mt-5 flex items-center justify-center gap-2 rounded-full bg-emerald-700 py-3.5 text-sm font-bold text-white transition-colors hover:bg-emerald-800 disabled:opacity-60"
        >
          <CheckCheck className="h-4 w-4" />
          {isPending ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
