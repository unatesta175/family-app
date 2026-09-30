"use client";

import { useState, useTransition } from "react";
import { AlarmClock, CalendarClock, Check, Pencil, Repeat, Trash2 } from "lucide-react";
import { deleteTaskAction, toggleTaskAction } from "@/lib/habit-actions";
import { colorHex, PRIORITY_META, tint } from "@/lib/habits";
import { TaskFormSheet, type TaskFormValues } from "@/components/habits/task-form";
import type { CategoryOption } from "@/components/habits/form-bits";
import type { TaskPriority, TaskRecurrence } from "@/lib/db/schema";
import { parseIso } from "@/lib/date";
import { cn } from "@/lib/utils";

export type TaskItem = {
  id: number;
  title: string;
  notes: string | null;
  priority: TaskPriority;
  categoryId: number | null;
  recurrence: TaskRecurrence;
  weekdays: string;
  recurrenceLabel: string;
  dueDate: string | null;
  completedAt: string | null;
  doneToday: boolean; // recurring: ticked for today
  timesCompleted: number; // recurring: lifetime completions
  lastDone: string | null;
};

type Tab = "todo" | "recurring" | "done";

function fmtDate(iso: string) {
  return parseIso(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function TaskManager({
  tasks,
  categories,
  today,
  readOnly,
}: {
  tasks: TaskItem[];
  categories: CategoryOption[];
  today: string;
  readOnly: boolean;
}) {
  const [tab, setTab] = useState<Tab>("todo");
  const [editing, setEditing] = useState<TaskItem | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [, startTransition] = useTransition();
  const catMap = new Map(categories.map((c) => [c.id, c]));

  const single = tasks.filter((t) => t.recurrence === "none");
  const open = single.filter((t) => !t.completedAt);
  const doneSingles = single.filter((t) => t.completedAt).sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
  const recurring = tasks.filter((t) => t.recurrence !== "none");

  const groups = [
    { title: "Overdue", tone: "text-h-bad", items: open.filter((t) => t.dueDate && t.dueDate < today) },
    { title: "Today", tone: "", items: open.filter((t) => t.dueDate === today) },
    {
      title: "Upcoming",
      tone: "",
      items: open.filter((t) => t.dueDate && t.dueDate > today).sort((a, b) => a.dueDate!.localeCompare(b.dueDate!)),
    },
    { title: "Anytime", tone: "", items: open.filter((t) => !t.dueDate) },
  ].filter((g) => g.items.length > 0);

  function toggle(t: TaskItem, done: boolean) {
    startTransition(async () => {
      await toggleTaskAction({ taskId: t.id, date: today, done });
    });
  }

  function remove(id: number) {
    startTransition(async () => {
      await deleteTaskAction(id);
      setConfirmId(null);
    });
  }

  function renderTask(t: TaskItem) {
    const pr = PRIORITY_META[t.priority];
    const cat = t.categoryId ? catMap.get(t.categoryId) : null;
    const isRecurring = t.recurrence !== "none";
    const done = isRecurring ? t.doneToday : !!t.completedAt;
    const overdue = !isRecurring && !t.completedAt && t.dueDate !== null && t.dueDate < today;

    return (
      <div key={t.id} className="h-card flex items-start gap-3 p-3">
        <button
          type="button"
          disabled={readOnly}
          onClick={() => toggle(t, !done)}
          aria-label={done ? "Mark not done" : "Mark done"}
          style={done ? { background: "var(--h-brand)", borderColor: "var(--h-brand)" } : { borderColor: pr.color }}
          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2"
        >
          {done && <Check className="h-3.5 w-3.5 text-h-brand-fg" strokeWidth={3.5} />}
        </button>
        <div className="min-w-0 flex-1">
          <p className={cn("text-sm font-bold leading-tight", done && !isRecurring && "text-h-muted line-through")}>
            {t.title}
          </p>
          {t.notes && <p className="mt-0.5 line-clamp-2 text-xs text-h-muted">{t.notes}</p>}
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium text-h-muted">
            {isRecurring && (
              <span className="flex items-center gap-0.5 font-bold text-h-brand">
                <Repeat className="h-3 w-3" />
                {t.recurrenceLabel}
              </span>
            )}
            {!isRecurring && t.dueDate && (
              <span className={cn("flex items-center gap-0.5", overdue && "font-bold text-h-bad")}>
                {overdue ? <AlarmClock className="h-3 w-3" /> : <CalendarClock className="h-3 w-3" />}
                {t.dueDate === today ? "Today" : fmtDate(t.dueDate)}
              </span>
            )}
            {cat && (
              <span
                className="rounded-md px-1.5 py-px font-bold"
                style={{ background: tint(colorHex(cat.color), 0.14), color: colorHex(cat.color) }}
              >
                {cat.name}
              </span>
            )}
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: pr.color }} />
              {pr.label}
            </span>
            {isRecurring && (
              <span>
                Done {t.timesCompleted}×{t.lastDone ? ` · last ${fmtDate(t.lastDone)}` : ""}
              </span>
            )}
            {!isRecurring && t.completedAt && <span>Completed {fmtDate(t.completedAt)}</span>}
          </div>
        </div>
        {!readOnly && (
          <div className="flex shrink-0 items-center gap-0.5">
            {confirmId === t.id ? (
              <>
                <button
                  type="button"
                  onClick={() => remove(t.id)}
                  className="rounded-full bg-h-bad px-2.5 py-1 text-[11px] font-bold text-white"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmId(null)}
                  className="rounded-full px-2 py-1 text-[11px] font-bold text-h-muted"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  aria-label="Edit task"
                  onClick={() => setEditing(t)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-h-muted hover:bg-h-surface2 hover:text-h-fg"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Delete task"
                  onClick={() => setConfirmId(t.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-h-muted hover:bg-h-surface2 hover:text-h-bad"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "todo", label: "One-off", count: open.length },
    { key: "recurring", label: "Recurring", count: recurring.length },
    { key: "done", label: "Completed", count: doneSingles.length },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 rounded-2xl bg-h-surface2 p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "flex-1 rounded-xl px-2 py-2 text-xs font-bold transition-all",
              tab === t.key ? "bg-h-surface text-h-fg shadow-sm" : "text-h-muted hover:text-h-fg"
            )}
          >
            {t.label}
            <span className="ml-1.5 opacity-60">{t.count}</span>
          </button>
        ))}
      </div>

      {tab === "todo" &&
        (groups.length === 0 ? (
          <Empty text="No open tasks. Use the + button to add one." />
        ) : (
          groups.map((g) => (
            <section key={g.title} className="flex flex-col gap-2">
              <h3 className={cn("px-1 text-xs font-extrabold uppercase tracking-wider text-h-muted", g.tone)}>
                {g.title} · {g.items.length}
              </h3>
              {g.items.map(renderTask)}
            </section>
          ))
        ))}

      {tab === "recurring" &&
        (recurring.length === 0 ? (
          <Empty text="No recurring tasks yet. Create a task and choose Daily, Weekly or Monthly." />
        ) : (
          <div className="flex flex-col gap-2">{recurring.map(renderTask)}</div>
        ))}

      {tab === "done" &&
        (doneSingles.length === 0 ? (
          <Empty text="Completed one-off tasks will show up here." />
        ) : (
          <div className="flex flex-col gap-2">{doneSingles.map(renderTask)}</div>
        ))}

      {editing && (
        <TaskFormSheet
          open
          onClose={() => setEditing(null)}
          categories={categories}
          initial={
            {
              id: editing.id,
              title: editing.title,
              notes: editing.notes,
              categoryId: editing.categoryId,
              priority: editing.priority,
              recurrence: editing.recurrence,
              weekdays: editing.weekdays,
              dueDate: editing.dueDate,
            } satisfies TaskFormValues
          }
        />
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="h-card p-6 text-center text-sm text-h-muted">{text}</p>;
}
