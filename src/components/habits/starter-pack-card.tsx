"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { applyStarterPackAction } from "@/lib/habit-actions";
import { STARTER_HABITS } from "@/lib/habit-starter";
import { colorHex, tint } from "@/lib/habits";
import { habitIcon } from "@/lib/habit-icons";

/** Empty-state onboarding: one tap adds a curated set of habits, all ordinary editable rows afterwards. */
export function StarterPackCard() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="h-card flex flex-col gap-4 p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-h-brand-soft text-h-brand">
          <Sparkles className="h-5 w-5" />
        </span>
        <div>
          <p className="text-base font-extrabold leading-tight">Start with a ready-made set</p>
          <p className="text-xs text-h-muted">Edit, rename or delete any of them afterwards.</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {STARTER_HABITS.map((h) => {
          const Icon = habitIcon(h.icon);
          const hex = colorHex(h.color);
          return (
            <span
              key={h.name}
              style={{ background: tint(hex, 0.12), color: hex }}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold"
            >
              <Icon className="h-3.5 w-3.5" />
              {h.name}
            </span>
          );
        })}
      </div>
      {error && <p className="text-xs font-semibold text-h-bad">{error}</p>}
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await applyStarterPackAction();
            if (!res.ok) setError(res.error);
          })
        }
        className="rounded-xl bg-h-brand py-3 text-sm font-extrabold text-h-brand-fg shadow-sm disabled:opacity-60"
      >
        {pending ? "Adding…" : "Add these habits"}
      </button>
      <p className="text-center text-[11px] text-h-muted">Or use the + button to create your own from scratch.</p>
    </div>
  );
}
