"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ListTodo, Plus, Sprout } from "lucide-react";
import { HabitFormSheet, emptyHabit } from "@/components/habits/habit-form";
import { emptyTimerHabit, type HabitFormValues } from "@/lib/habit-form-values";
import { TaskFormSheet, emptyTask } from "@/components/habits/task-form";
import type { CategoryOption } from "@/components/habits/form-bits";
import { cn } from "@/lib/utils";

/** Global "+" (habit or task). Only rendered when the viewer is looking at their own data. */
export function AddFab({
  categories,
  circleSize = 1,
  goals = [],
}: {
  categories: CategoryOption[];
  circleSize?: number;
  goals?: { id: number; title: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Another module (e.g. Focus's "create a timer habit on the go") can open this sheet pre-filled
  // via a query param on first load — read it once, lazily, instead of reacting to it in an effect.
  const openedFromQuery = searchParams.get("newTimerHabit") === "1";
  const [menu, setMenu] = useState(false);
  const [habitOpen, setHabitOpen] = useState(openedFromQuery);
  const [taskOpen, setTaskOpen] = useState(false);
  const [habitInitial, setHabitInitial] = useState<HabitFormValues>(openedFromQuery ? emptyTimerHabit : emptyHabit);
  // Opened from Focus's "on the go" flow: the habit can only be a timer, so lock that choice in.
  const [lockEvalType, setLockEvalType] = useState(openedFromQuery);
  // On save, hop straight back to whichever module opened this sheet instead of leaving the user on Habits.
  const [returnTo, setReturnTo] = useState<string | null>(() => {
    if (!openedFromQuery) return null;
    const back = searchParams.get("returnTo");
    return back && back.startsWith("/") ? back : "/focus";
  });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (openedFromQuery) router.replace("/habits", { scroll: false });
    // Only ever react to the query params this page was first loaded with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      <div ref={ref} className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-4 z-30 flex flex-col items-end gap-2 md:bottom-8 md:right-8">
        {menu && (
          <div className="habit-sheet-in flex flex-col gap-1.5 rounded-2xl border border-h-border bg-h-surface p-1.5 shadow-xl">
            <button
              type="button"
              onClick={() => {
                setMenu(false);
                setHabitInitial(emptyHabit());
                setLockEvalType(false);
                setReturnTo(null);
                setHabitOpen(true);
              }}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold hover:bg-h-surface2"
            >
              <Sprout className="h-4 w-4 text-h-brand" />
              New habit
            </button>
            <button
              type="button"
              onClick={() => {
                setMenu(false);
                setTaskOpen(true);
              }}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold hover:bg-h-surface2"
            >
              <ListTodo className="h-4 w-4 text-h-brand" />
              New task
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => setMenu((v) => !v)}
          aria-label="Add habit or task"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-h-brand text-h-brand-fg shadow-lg shadow-h-brand/30 transition-transform active:scale-95"
        >
          <Plus className={cn("h-6 w-6 transition-transform", menu && "rotate-45")} strokeWidth={2.5} />
        </button>
      </div>

      {habitOpen && (
        <HabitFormSheet
          open
          onClose={() => setHabitOpen(false)}
          onSaved={returnTo ? () => router.push(returnTo) : undefined}
          initial={habitInitial}
          categories={categories}
          circleSize={circleSize}
          goals={goals}
          lockEvalType={lockEvalType}
        />
      )}
      {taskOpen && (
        <TaskFormSheet open onClose={() => setTaskOpen(false)} initial={emptyTask()} categories={categories} />
      )}
    </>
  );
}
