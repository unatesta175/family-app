"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Flame, Link2, Plus, Unlink } from "lucide-react";
import { createLinkedHabitAction, linkHabitAction, unlinkHabitAction } from "@/lib/goal-actions";
import type { LinkedHabit } from "@/lib/goal-data";
import { GoalTile } from "@/components/goals/goal-parts";
import { inputClass } from "@/components/habits/form-bits";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/habits/ui/select";

/** Habits that feed this goal. Anyone who can see a shared goal can link their own habits. */
export function LinkedHabits({
  goalId,
  habits,
  linkable,
  canContribute,
  isOwner,
}: {
  goalId: number;
  habits: LinkedHabit[];
  /** The viewer's own habits that aren't linked to this goal yet. */
  linkable: { id: number; name: string }[];
  canContribute: boolean;
  isOwner: boolean;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function link(habitId: number) {
    setError(null);
    startTransition(async () => {
      const res = await linkHabitAction({ goalId, habitId });
      if (!res.ok) setError(res.error);
    });
  }

  function create() {
    setError(null);
    startTransition(async () => {
      const res = await createLinkedHabitAction({ goalId, name });
      if (!res.ok) return setError(res.error);
      setName("");
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {habits.length === 0 ? (
        <p className="text-xs text-h-muted">No habits linked yet. Habits are the daily steps that move this goal forward.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-h-border">
          {habits.map((h) => (
            <li key={h.habitId} className="flex items-center gap-3 py-2.5">
              <GoalTile icon={h.icon} color={h.color} size="sm" />
              <div className="min-w-0 flex-1">
                <Link href={`/habits/${h.habitId}`} className="block break-words text-sm font-bold leading-tight hover:text-h-brand">
                  {h.name}
                </Link>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[11px] font-semibold text-h-muted">
                  {!h.mine && <span>{h.ownerName}</span>}
                  <span>{h.checkins} check-ins</span>
                  {h.streak > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-h-break">
                      <Flame className="h-3 w-3" />
                      {h.streak}d
                    </span>
                  )}
                </p>
              </div>
              {(h.mine || isOwner) && (
                <button
                  type="button"
                  aria-label={`Unlink ${h.name}`}
                  title="Unlink (the habit is kept)"
                  onClick={() => startTransition(() => unlinkHabitAction({ goalId, habitId: h.habitId }))}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-h-muted hover:bg-h-surface2 hover:text-h-bad"
                >
                  <Unlink className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canContribute && (
        <div className="flex flex-col gap-2 rounded-xl bg-h-surface2 p-2.5">
          {linkable.length > 0 && (
            <Select value="" onValueChange={(v) => link(Number(v))}>
              <SelectTrigger aria-label="Link an existing habit" className="border-dashed text-h-brand data-[placeholder]:text-h-brand [&>svg]:text-h-brand">
                <span className="flex items-center gap-2 font-bold">
                  <Link2 className="h-4 w-4" />
                  Link one of my habits
                </span>
              </SelectTrigger>
              <SelectContent>
                {linkable.map((h) => (
                  <SelectItem key={h.id} value={String(h.id)}>
                    {h.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  create();
                }
              }}
              placeholder="…or create a new daily habit for this goal"
              maxLength={60}
              className={inputClass}
            />
            <button
              type="button"
              onClick={create}
              disabled={!name.trim()}
              aria-label="Create habit"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-h-brand text-h-brand-fg disabled:opacity-40"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}
      {error && <p className="text-xs font-semibold text-h-bad">{error}</p>}
    </div>
  );
}
