"use client";

import { useState, useTransition } from "react";
import { createTaskAction, updateTaskAction, type TaskFormInput } from "@/lib/habit-actions";
import { parseWeekdays, PRIORITY_META } from "@/lib/habits";
import { todayIso } from "@/lib/date";
import { Sheet } from "@/components/habits/sheet";
import { CategorySelect } from "@/components/habits/category-select";
import { Field, Segmented, WeekdayPicker, inputClass, type CategoryOption } from "@/components/habits/form-bits";
import type { TaskPriority, TaskRecurrence } from "@/lib/db/schema";

export type TaskFormValues = {
  id?: number;
  title: string;
  notes: string | null;
  categoryId: number | null;
  priority: TaskPriority;
  recurrence: TaskRecurrence;
  weekdays: string;
  dueDate: string | null;
};

export function emptyTask(recurrence: TaskRecurrence = "none"): TaskFormValues {
  return {
    title: "",
    notes: null,
    categoryId: null,
    priority: "medium",
    recurrence,
    weekdays: "",
    dueDate: todayIso(),
  };
}

export function TaskFormSheet({
  open,
  onClose,
  initial,
  categories: initialCategories,
}: {
  open: boolean;
  onClose: () => void;
  initial: TaskFormValues;
  categories: CategoryOption[];
}) {
  const editing = initial.id !== undefined;
  const [v, setV] = useState<TaskFormValues>(initial);
  const [days, setDays] = useState<number[]>(() => parseWeekdays(initial.weekdays));
  const [categories, setCategories] = useState(initialCategories);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof TaskFormValues>(key: K, value: TaskFormValues[K]) {
    setV((prev) => ({ ...prev, [key]: value }));
  }

  function submit() {
    setError(null);
    const payload: TaskFormInput = {
      title: v.title,
      notes: v.notes,
      categoryId: v.categoryId,
      priority: v.priority,
      recurrence: v.recurrence,
      weekdays: days,
      dueDate: v.dueDate,
    };
    startTransition(async () => {
      const res = editing ? await updateTaskAction(initial.id!, payload) : await createTaskAction(payload);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onClose();
    });
  }

  const recurring = v.recurrence !== "none";

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editing ? "Edit task" : "New task"}
      footer={
        <div className="flex flex-col gap-2">
          {error && <p className="text-xs font-semibold text-h-bad">{error}</p>}
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="w-full rounded-xl bg-h-brand py-3 text-sm font-extrabold text-h-brand-fg shadow-sm transition-opacity disabled:opacity-60"
          >
            {pending ? "Saving…" : editing ? "Save changes" : "Create task"}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-5 pt-1">
        <Field label="Task">
          <textarea
            value={v.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="e.g. Pay internet bill, Clean the room"
            maxLength={2000}
            rows={2}
            className={`${inputClass} resize-none`}
            autoFocus={!editing}
          />
        </Field>

        <Field label="Repeat">
          <Segmented<TaskRecurrence>
            value={v.recurrence}
            onChange={(r) => set("recurrence", r)}
            options={[
              { value: "none", label: "One-off" },
              { value: "daily", label: "Daily" },
              { value: "weekly", label: "Weekly" },
              { value: "monthly", label: "Monthly" },
            ]}
          />
          {v.recurrence === "weekly" && <WeekdayPicker value={days} onChange={setDays} color="#5b5bf0" />}
        </Field>

        <Field
          label={recurring ? "Starts on" : "Due date"}
          hint={recurring ? undefined : "Leave empty for a task with no deadline."}
        >
          <div className="flex gap-2">
            <input
              type="date"
              value={v.dueDate ?? ""}
              onChange={(e) => set("dueDate", e.target.value || null)}
              className={inputClass}
            />
            {!recurring && v.dueDate && (
              <button
                type="button"
                onClick={() => set("dueDate", null)}
                className="rounded-xl bg-h-surface2 px-3 text-xs font-bold text-h-muted"
              >
                Clear
              </button>
            )}
          </div>
        </Field>

        <Field label="Priority">
          <Segmented<TaskPriority>
            value={v.priority}
            onChange={(p) => set("priority", p)}
            options={(["high", "medium", "low"] as const).map((p) => ({ value: p, label: PRIORITY_META[p].label }))}
          />
        </Field>

        <Field label="Category">
          <CategorySelect
            categories={categories}
            value={v.categoryId}
            onChange={(id) => set("categoryId", id)}
            onCreated={(c) => setCategories((prev) => [...prev, c])}
            fallbackColor="indigo"
          />
        </Field>

        <Field label="Notes (optional)">
          <textarea
            value={v.notes ?? ""}
            onChange={(e) => set("notes", e.target.value)}
            rows={2}
            maxLength={2000}
            className={inputClass}
            placeholder="Anything to remember?"
          />
        </Field>
      </div>
    </Sheet>
  );
}
