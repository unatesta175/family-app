"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { addProgressAction, deleteProgressAction } from "@/lib/goal-actions";
import { formatNumber } from "@/lib/habits";
import { shortDate } from "@/lib/goals";
import { Caption, NumberInput } from "@/components/habits/form-fields";
import { inputClass } from "@/components/habits/form-bits";

export type ProgressEntry = { id: number; value: number; note: string | null; date: string; who: string; mine: boolean };

/** Log an amount towards a measurable goal, and see the timeline of entries. */
export function ProgressPanel({
  goalId,
  unit,
  entries,
  today,
  canLog,
  isOwner,
}: {
  goalId: number;
  unit: string | null;
  entries: ProgressEntry[];
  today: string;
  canLog: boolean;
  isOwner: boolean;
}) {
  const [value, setValue] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(today);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const suffix = unit ? ` ${unit}` : "";

  function add() {
    setError(null);
    startTransition(async () => {
      const res = await addProgressAction({ goalId, value: value ?? 0, note: note || null, date });
      if (!res.ok) return setError(res.error);
      setValue(null);
      setNote("");
      setDate(today);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {canLog && (
        <div className="grid grid-cols-[1fr_auto] gap-2 rounded-xl bg-h-surface2 p-3 sm:grid-cols-[8rem_1fr_9rem_auto]">
          <label className="flex flex-col gap-1">
            <Caption>Amount{unit ? ` (${unit})` : ""}</Caption>
            <NumberInput value={value} min={0} onChange={setValue} placeholder="0" aria-label="Amount" />
          </label>
          <label className="col-span-2 flex flex-col gap-1 sm:col-span-1">
            <Caption>Note (optional)</Caption>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What did you do?" maxLength={240} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1">
            <Caption>Date</Caption>
            <input type="date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} className={inputClass} />
          </label>
          <button
            type="button"
            onClick={add}
            disabled={pending || !value}
            aria-label="Log progress"
            className="flex h-10 items-center justify-center gap-1 self-end rounded-xl bg-h-brand px-4 text-sm font-bold text-h-brand-fg disabled:opacity-40"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Log
          </button>
        </div>
      )}
      {error && <p className="text-xs font-semibold text-h-bad">{error}</p>}

      {entries.length === 0 ? (
        <p className="text-xs text-h-muted">Nothing logged yet.</p>
      ) : (
        <ol className="relative flex flex-col gap-3 border-l-2 border-h-border pl-4">
          {entries.map((e) => (
            <li key={e.id} className="relative">
              <span className="absolute -left-[1.45rem] top-1 h-2.5 w-2.5 rounded-full border-2 border-h-surface bg-h-brand" />
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold leading-tight">
                    +{formatNumber(e.value)}
                    {suffix}
                    <span className="ml-2 text-[11px] font-semibold text-h-muted">
                      {shortDate(e.date)}
                      {!e.mine && ` · ${e.who}`}
                    </span>
                  </p>
                  {e.note && <p className="mt-0.5 break-words text-xs text-h-muted">{e.note}</p>}
                </div>
                {(e.mine || isOwner) && (
                  <button
                    type="button"
                    aria-label="Delete entry"
                    onClick={() => startTransition(() => deleteProgressAction(e.id))}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-h-muted hover:bg-h-surface2 hover:text-h-bad"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
