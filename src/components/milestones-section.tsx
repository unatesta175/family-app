"use client";

import { useState } from "react";
import { Lock, Play, ChevronDown } from "lucide-react";
import type { Milestone } from "@/lib/milestones";
import { cn } from "@/lib/utils";

const DIFFICULTY_BADGE: Record<Milestone["difficulty"], string> = {
  easy: "border border-emerald-200 bg-emerald-50 text-emerald-700",
  medium: "border border-amber-200 bg-amber-50 text-amber-700",
  hard: "border border-rose-200 bg-rose-50 text-rose-700",
};

const COLLAPSED_COUNT = 4;

export function MilestonesSection({ milestones }: { milestones: Milestone[] }) {
  const [expanded, setExpanded] = useState(false);
  const lockedCount = milestones.filter((m) => !m.unlocked).length;
  const visible = expanded ? milestones : milestones.slice(0, COLLAPSED_COUNT);

  return (
    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-neutral-400">Milestones</p>
      <div className="grid grid-cols-2 gap-3">
        {visible.map((m) => (
          <div
            key={m.id}
            className={cn(
              "relative rounded-2xl border p-4 shadow-sm transition-colors",
              m.unlocked
                ? "border-emerald-200 bg-emerald-50/50"
                : "border-neutral-200 bg-white hover:border-neutral-300"
            )}
          >
            <span
              className={cn(
                "absolute right-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize",
                DIFFICULTY_BADGE[m.difficulty]
              )}
            >
              {m.difficulty}
            </span>
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full",
                m.unlocked ? "bg-emerald-500" : "border border-neutral-200 bg-neutral-50"
              )}
            >
              {m.unlocked ? (
                <Play className="h-4 w-4 fill-white text-white" />
              ) : (
                <Lock className="h-4 w-4 text-neutral-400" />
              )}
            </div>
            <p className="mt-3 text-sm font-bold text-neutral-900">{m.title}</p>
            <p className="mt-0.5 text-xs text-neutral-400">{m.description}</p>
          </div>
        ))}
      </div>

      {!expanded && lockedCount > 0 && milestones.length > COLLAPSED_COUNT && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-4 flex w-full flex-col items-center gap-1 rounded-2xl border border-dashed border-neutral-200 py-3 text-xs font-semibold text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-700"
        >
          Show all {lockedCount} locked
          <ChevronDown className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
