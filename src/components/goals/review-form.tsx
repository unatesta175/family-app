"use client";

import { useState, useTransition } from "react";
import { Check, Trash2 } from "lucide-react";
import { deleteReviewAction, saveReviewAction } from "@/lib/goal-actions";
import { Caption } from "@/components/habits/form-fields";
import { inputClass } from "@/components/habits/form-bits";
import { cn } from "@/lib/utils";

export type ReviewValues = { moved: string; stalled: string; change: string };

/** The three weekly-review questions. Saving again for the same week updates it. */
export function ReviewForm({ weekStart, initial, saved }: { weekStart: string; initial: ReviewValues; saved: boolean }) {
  const [v, setV] = useState<ReviewValues>(initial);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function set(key: keyof ReviewValues, value: string) {
    setDone(false);
    setV((prev) => ({ ...prev, [key]: value }));
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await saveReviewAction({ weekStart, ...v });
      if (!res.ok) return setError(res.error);
      setDone(true);
    });
  }

  const fields: { key: keyof ReviewValues; label: string; placeholder: string }[] = [
    { key: "moved", label: "What moved this week?", placeholder: "Wins, steps taken, things you are proud of" },
    { key: "stalled", label: "What stalled?", placeholder: "What got in the way, honestly?" },
    { key: "change", label: "One thing to change next week", placeholder: "A single, small, specific change" },
  ];

  return (
    <div className="flex flex-col gap-3">
      {fields.map((f) => (
        <label key={f.key} className="flex flex-col gap-1.5">
          <Caption>{f.label}</Caption>
          <textarea
            value={v[f.key]}
            onChange={(e) => set(f.key, e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder={f.placeholder}
            className={cn(inputClass, "resize-none")}
          />
        </label>
      ))}
      {error && <p className="text-xs font-semibold text-h-bad">{error}</p>}
      <div className="flex items-center gap-3">
        <button type="button" onClick={save} disabled={pending} className="rounded-xl bg-h-brand px-5 py-2.5 text-sm font-extrabold text-h-brand-fg disabled:opacity-60">
          {pending ? "Saving…" : saved || done ? "Update review" : "Save review"}
        </button>
        {done && (
          <span className="flex items-center gap-1 text-xs font-bold text-h-good">
            <Check className="h-4 w-4" />
            Saved
          </span>
        )}
      </div>
    </div>
  );
}

export function DeleteReviewButton({ weekStart }: { weekStart: string }) {
  const [, startTransition] = useTransition();
  return (
    <button
      type="button"
      aria-label="Delete review"
      onClick={() => startTransition(() => deleteReviewAction(weekStart))}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-h-muted hover:bg-h-surface2 hover:text-h-bad"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}
