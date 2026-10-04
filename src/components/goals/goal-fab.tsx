"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LayoutTemplate, Plus, Sparkles, Target } from "lucide-react";
import { createFromTemplateAction } from "@/lib/goal-actions";
import { GOAL_TEMPLATES } from "@/lib/goals";
import { GoalFormSheet, emptyGoal } from "@/components/goals/goal-form";
import { GoalTile } from "@/components/goals/goal-parts";
import { Sheet } from "@/components/habits/sheet";
import { Switch } from "@/components/habits/ui/switch";
import { cn } from "@/lib/utils";

/** The "+" button: a blank goal, or one started from a template. */
export function GoalFab() {
  const [menu, setMenu] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    function onDown(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenu(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [menu]);

  return (
    <>
      <div ref={ref} className="no-print pointer-events-none fixed bottom-24 right-4 z-30 flex flex-col items-end gap-2 md:bottom-8 md:right-8">
        {menu && (
          <div className="habit-sheet-in pointer-events-auto flex flex-col gap-1 rounded-2xl border border-h-border bg-h-surface p-1.5 shadow-xl">
            <button
              type="button"
              onClick={() => {
                setMenu(false);
                setFormOpen(true);
              }}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold hover:bg-h-surface2"
            >
              <Target className="h-4 w-4 text-h-brand" />
              New goal
            </button>
            <button
              type="button"
              onClick={() => {
                setMenu(false);
                setTemplatesOpen(true);
              }}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold hover:bg-h-surface2"
            >
              <LayoutTemplate className="h-4 w-4 text-h-brand" />
              From a template
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => setMenu((v) => !v)}
          aria-label="Add a goal"
          className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-h-brand text-h-brand-fg shadow-lg shadow-h-brand/30 transition-transform active:scale-95"
        >
          <Plus className={cn("h-6 w-6 transition-transform", menu && "rotate-45")} strokeWidth={2.5} />
        </button>
      </div>

      {formOpen && <GoalFormSheet open onClose={() => setFormOpen(false)} initial={emptyGoal()} />}
      {templatesOpen && <TemplatesSheet onClose={() => setTemplatesOpen(false)} />}
    </>
  );
}

function TemplatesSheet({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [withHabits, setWithHabits] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function use(key: string) {
    setError(null);
    setBusy(key);
    startTransition(async () => {
      const res = await createFromTemplateAction({ key, withHabits });
      setBusy(null);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onClose();
      router.push(`/goals/${res.data.id}`);
    });
  }

  return (
    <Sheet open onClose={onClose} title="Start from a template" className="sm:max-w-lg">
      <div className="flex flex-col gap-3 pb-2 pt-1">
        <label className="flex items-center justify-between gap-3 rounded-xl bg-h-surface2 px-3 py-2.5">
          <span>
            <span className="flex items-center gap-1.5 text-sm font-bold">
              <Sparkles className="h-3.5 w-3.5 text-h-brand" />
              Also create the suggested habits
            </span>
            <span className="block text-[11px] text-h-muted">They&apos;re linked to the goal and appear in Habits.</span>
          </span>
          <Switch checked={withHabits} onCheckedChange={setWithHabits} aria-label="Also create the suggested habits" />
        </label>
        {error && <p className="text-xs font-semibold text-h-bad">{error}</p>}
        <ul className="flex flex-col gap-2">
          {GOAL_TEMPLATES.map((t) => (
            <li key={t.key}>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => use(t.key)}
                className="flex w-full items-start gap-3 rounded-2xl border border-h-border bg-h-surface p-3 text-left transition-colors hover:bg-h-surface2 disabled:opacity-60"
              >
                <GoalTile icon={t.icon} color={t.color} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-extrabold leading-tight">{t.title}</span>
                  <span className="mt-0.5 block text-xs leading-snug text-h-muted">{t.why}</span>
                  <span className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] font-semibold text-h-muted">
                    <span>{t.area}</span>
                    {t.milestones.length > 0 && <span>{t.milestones.length} milestones</span>}
                    {t.habits.length > 0 && <span>{t.habits.length} habit{t.habits.length === 1 ? "" : "s"}</span>}
                    <span>{t.months} months</span>
                  </span>
                </span>
                <span className="self-center text-xs font-bold text-h-brand">{busy === t.key ? "Adding…" : "Use"}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Sheet>
  );
}
