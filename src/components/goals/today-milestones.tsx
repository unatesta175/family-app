"use client";

import { useOptimistic, useTransition } from "react";
import Link from "next/link";
import { AlarmClock, Check, Flag } from "lucide-react";
import { toggleMilestoneAction } from "@/lib/goal-actions";
import { colorHex } from "@/lib/habits";
import { cn } from "@/lib/utils";

export type TodayMilestone = {
  id: number;
  title: string;
  goalId: number;
  goalTitle: string;
  color: string;
  overdue: boolean;
  done: boolean;
};

/** Goal milestones that are due (or overdue) today, so they sit next to your habits and tasks. */
export function TodayMilestones({ items, canEdit }: { items: TodayMilestone[]; canEdit: boolean }) {
  const [rows, toggle] = useOptimistic<TodayMilestone[], { id: number; done: boolean }>(items, (state, a) =>
    state.map((m) => (m.id === a.id ? { ...m, done: a.done } : m))
  );
  const [, startTransition] = useTransition();
  if (rows.length === 0) return null;

  return (
    <section className="flex flex-col gap-2" aria-label="Goal milestones">
      <h3 className="flex items-center gap-2 px-1 text-xs font-extrabold uppercase tracking-wider text-h-muted">
        Goal milestones
        <span className="rounded-full bg-h-surface2 px-2 py-0.5 text-[10px]">{rows.filter((r) => !r.done).length}</span>
      </h3>
      <div className="flex flex-col gap-2">
        {rows.map((m) => {
          const hex = colorHex(m.color);
          return (
            <div key={m.id} className="h-card flex items-center gap-3 p-3">
              <button
                type="button"
                disabled={!canEdit}
                aria-label={m.done ? `Undo ${m.title}` : `Complete ${m.title}`}
                onClick={() =>
                  startTransition(async () => {
                    toggle({ id: m.id, done: !m.done });
                    await toggleMilestoneAction({ id: m.id, done: !m.done });
                  })
                }
                style={m.done ? { background: hex, borderColor: hex } : { borderColor: hex }}
                className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors", !canEdit && "cursor-default")}
              >
                {m.done && <Check className="habit-pop h-3.5 w-3.5 text-white" strokeWidth={3.5} />}
              </button>
              <div className="min-w-0 flex-1">
                <p className={cn("break-words text-sm font-bold leading-snug", m.done && "text-h-muted line-through")}>{m.title}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] font-medium text-h-muted">
                  <span className="inline-flex items-center gap-1 rounded-md bg-h-surface2 px-1.5 py-px font-bold">
                    <Flag className="h-3 w-3" />
                    Milestone
                  </span>
                  <Link href={`/goals/${m.goalId}`} className="truncate font-semibold hover:text-h-brand">
                    {m.goalTitle}
                  </Link>
                  {m.overdue && !m.done && (
                    <span className="flex items-center gap-0.5 font-bold text-h-bad">
                      <AlarmClock className="h-3 w-3" />
                      Overdue
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
