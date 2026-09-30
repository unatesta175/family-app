"use client";

import { useTransition } from "react";
import { Eye } from "lucide-react";
import { switchActiveProfile } from "@/lib/actions";
import { Ring } from "@/components/habits/ring";
import { cn } from "@/lib/utils";

export type FamilyMember = {
  id: number;
  name: string;
  done: number;
  due: number;
  bestStreak: number;
  bestStreakName: string | null;
};

/** Household view: everyone's progress for the selected day. Tapping a member switches to their (read-only) board. */
export function FamilyStrip({ members, activeId }: { members: FamilyMember[]; activeId: number }) {
  const [pending, startTransition] = useTransition();
  if (members.length < 2) return null;

  return (
    <section className="flex flex-col gap-2">
      <h3 className="px-1 text-xs font-extrabold uppercase tracking-wider text-h-muted">Family</h3>
      <div className="grid grid-cols-2 gap-2">
        {members.map((m) => {
          const pct = m.due === 0 ? 0 : Math.round((m.done / m.due) * 100);
          const active = m.id === activeId;
          return (
            <button
              key={m.id}
              type="button"
              disabled={pending}
              onClick={() => !active && startTransition(() => switchActiveProfile(m.id))}
              className={cn(
                "h-card flex items-center gap-3 p-3 text-left transition-colors",
                active ? "ring-2 ring-h-brand" : "hover:bg-h-surface2"
              )}
            >
              <Ring pct={pct} size={48} stroke={6}>
                <span className="text-[11px] font-extrabold tabular-nums">{pct}%</span>
              </Ring>
              <div className="min-w-0">
                <p className="flex items-center gap-1 truncate text-sm font-extrabold">
                  {m.name}
                  {!active && <Eye className="h-3 w-3 text-h-muted" />}
                </p>
                <p className="text-[11px] font-medium text-h-muted">
                  {m.done}/{m.due} today
                </p>
                {m.bestStreak > 0 && m.bestStreakName && (
                  <p className="truncate text-[10px] font-semibold text-h-break">
                    🔥 {m.bestStreak} · {m.bestStreakName}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
