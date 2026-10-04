"use client";

import { useOptimistic, useState, useTransition } from "react";
import { CalendarClock, Pencil, Plus, Trash2, X } from "lucide-react";
import { addMilestoneAction, deleteMilestoneAction, toggleMilestoneAction, updateMilestoneAction } from "@/lib/goal-actions";
import { daysUntil, shortDate } from "@/lib/goals";
import { colorHex } from "@/lib/habits";
import { Checkbox } from "@/components/habits/ui/checkbox";
import { inputClass } from "@/components/habits/form-bits";
import { cn } from "@/lib/utils";

export type MilestoneItem = { id: number; title: string; dueDate: string | null; doneAt: string | null };

/** The goal's steps: tick them off, add dates, rename, remove. Only the goal's owner can edit. */
export function MilestoneList({
  goalId,
  color,
  milestones,
  today,
  canEdit,
}: {
  goalId: number;
  color: string;
  milestones: MilestoneItem[];
  today: string;
  canEdit: boolean;
}) {
  const hex = colorHex(color);
  const [items, setOptimistic] = useOptimistic<MilestoneItem[], { id: number; done: boolean }>(milestones, (state, a) =>
    state.map((m) => (m.id === a.id ? { ...m, doneAt: a.done ? today : null } : m))
  );
  const [, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState({ title: "", due: "" });
  const [error, setError] = useState<string | null>(null);

  function toggle(m: MilestoneItem, done: boolean) {
    startTransition(async () => {
      setOptimistic({ id: m.id, done });
      await toggleMilestoneAction({ id: m.id, done });
    });
  }

  function add() {
    setError(null);
    startTransition(async () => {
      const res = await addMilestoneAction({ goalId, title, dueDate: due || null });
      if (!res.ok) return setError(res.error);
      setTitle("");
      setDue("");
    });
  }

  function saveEdit(id: number) {
    setError(null);
    startTransition(async () => {
      const res = await updateMilestoneAction({ id, title: draft.title, dueDate: draft.due || null });
      if (!res.ok) return setError(res.error);
      setEditingId(null);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {items.length === 0 && <p className="text-xs text-h-muted">No milestones yet. Break the goal into steps you can tick off.</p>}
      <ul className="flex flex-col divide-y divide-h-border">
        {items.map((m) => {
          const done = !!m.doneAt;
          const left = m.dueDate ? daysUntil(m.dueDate, today) : null;
          if (editingId === m.id) {
            return (
              <li key={m.id} className="flex flex-col gap-2 py-2.5">
                <input value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} maxLength={160} className={inputClass} aria-label="Milestone title" />
                <div className="flex items-center gap-2">
                  <input type="date" value={draft.due} onChange={(e) => setDraft((d) => ({ ...d, due: e.target.value }))} className={cn(inputClass, "max-w-44")} aria-label="Due date" />
                  <button type="button" onClick={() => saveEdit(m.id)} className="rounded-xl bg-h-brand px-3 py-2 text-xs font-bold text-h-brand-fg">
                    Save
                  </button>
                  <button type="button" onClick={() => setEditingId(null)} className="rounded-xl px-3 py-2 text-xs font-bold text-h-muted">
                    Cancel
                  </button>
                </div>
              </li>
            );
          }
          return (
            <li key={m.id} className="flex items-center gap-3 py-2.5">
              <Checkbox color={hex} checked={done} disabled={!canEdit} onCheckedChange={(c) => toggle(m, c === true)} aria-label={`Complete ${m.title}`} />
              <div className="min-w-0 flex-1">
                <p className={cn("break-words text-sm font-semibold leading-snug", done && "text-h-muted line-through")}>{m.title}</p>
                {(m.dueDate || m.doneAt) && (
                  <p className={cn("mt-0.5 flex items-center gap-1 text-[11px] font-semibold", !done && left !== null && left < 0 ? "text-h-bad" : "text-h-muted")}>
                    <CalendarClock className="h-3 w-3" />
                    {done
                      ? `Done ${shortDate(m.doneAt!)}`
                      : left === null
                        ? ""
                        : left < 0
                          ? `${-left} day${left === -1 ? "" : "s"} overdue`
                          : left === 0
                            ? "Due today"
                            : `Due ${shortDate(m.dueDate!)}`}
                  </p>
                )}
              </div>
              {canEdit && (
                <div className="flex shrink-0 items-center">
                  <button
                    type="button"
                    aria-label={`Edit ${m.title}`}
                    onClick={() => {
                      setEditingId(m.id);
                      setDraft({ title: m.title, due: m.dueDate ?? "" });
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-h-muted hover:bg-h-surface2 hover:text-h-fg"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${m.title}`}
                    onClick={() => startTransition(() => deleteMilestoneAction(m.id))}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-h-muted hover:bg-h-surface2 hover:text-h-bad"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {canEdit && (
        <div className="flex flex-col gap-2 rounded-xl bg-h-surface2 p-2.5">
          <div className="flex gap-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  add();
                }
              }}
              placeholder="Add a milestone…"
              maxLength={160}
              className={inputClass}
            />
            <button
              type="button"
              onClick={add}
              disabled={!title.trim()}
              aria-label="Add milestone"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-h-brand text-h-brand-fg disabled:opacity-40"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={cn(inputClass, "max-w-44")} aria-label="Due date (optional)" />
            {due && (
              <button type="button" aria-label="Clear date" onClick={() => setDue("")} className="flex h-8 w-8 items-center justify-center rounded-full text-h-muted hover:bg-h-border">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <span className="text-[11px] text-h-muted">Due date is optional. Dated milestones show on your Habits Today page.</span>
          </div>
        </div>
      )}
      {error && <p className="text-xs font-semibold text-h-bad">{error}</p>}
    </div>
  );
}
