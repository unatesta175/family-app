"use client";

import { useEffect, useRef, useState } from "react";
import { ListTodo, Plus, Sprout } from "lucide-react";
import { HabitFormSheet, emptyHabit } from "@/components/habits/habit-form";
import { TaskFormSheet, emptyTask } from "@/components/habits/task-form";
import type { CategoryOption } from "@/components/habits/form-bits";
import { cn } from "@/lib/utils";

/** Global "+" (habit or task). Only rendered when the viewer is looking at their own data. */
export function AddFab({ categories, circleSize = 1 }: { categories: CategoryOption[]; circleSize?: number }) {
  const [menu, setMenu] = useState(false);
  const [habitOpen, setHabitOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
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
      <div ref={ref} className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-4 z-30 flex flex-col items-end gap-2 md:bottom-8 md:right-8">
        {menu && (
          <div className="habit-sheet-in flex flex-col gap-1.5 rounded-2xl border border-h-border bg-h-surface p-1.5 shadow-xl">
            <button
              type="button"
              onClick={() => {
                setMenu(false);
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
          initial={emptyHabit()}
          categories={categories}
          circleSize={circleSize}
        />
      )}
      {taskOpen && (
        <TaskFormSheet open onClose={() => setTaskOpen(false)} initial={emptyTask()} categories={categories} />
      )}
    </>
  );
}
