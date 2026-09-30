"use client";

import { useState, useTransition } from "react";
import { Ban, Sprout } from "lucide-react";
import { createHabitAction, updateHabitAction, type HabitFormInput } from "@/lib/habit-actions";
import { colorHex, parseWeekdays } from "@/lib/habits";
import { todayIso } from "@/lib/date";
import { cn } from "@/lib/utils";
import { Sheet } from "@/components/habits/sheet";
import { CategorySelect } from "@/components/habits/category-select";
import {
  ColorPicker,
  Field,
  IconPicker,
  Segmented,
  Stepper,
  WeekdayPicker,
  inputClass,
  type CategoryOption,
} from "@/components/habits/form-bits";
import type { HabitKind, HabitSchedule } from "@/lib/db/schema";

export type HabitFormValues = {
  id?: number;
  name: string;
  description: string | null;
  categoryId: number | null;
  kind: HabitKind;
  icon: string;
  color: string;
  schedule: HabitSchedule;
  weekdays: string;
  weeklyTarget: number;
  dailyTarget: number;
  unit: string | null;
  startDate: string;
};

export function emptyHabit(): HabitFormValues {
  return {
    name: "",
    description: null,
    categoryId: null,
    kind: "build",
    icon: "target",
    color: "indigo",
    schedule: "daily",
    weekdays: "1,2,3,4,5",
    weeklyTarget: 3,
    dailyTarget: 1,
    unit: null,
    startDate: todayIso(),
  };
}

export function HabitFormSheet({
  open,
  onClose,
  initial,
  categories: initialCategories,
}: {
  open: boolean;
  onClose: () => void;
  initial: HabitFormValues;
  categories: CategoryOption[];
}) {
  const editing = initial.id !== undefined;
  const [v, setV] = useState<HabitFormValues>(initial);
  const [days, setDays] = useState<number[]>(() => parseWeekdays(initial.weekdays));
  const [counter, setCounter] = useState(initial.dailyTarget > 1);
  const [categories, setCategories] = useState(initialCategories);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const hex = colorHex(v.color);

  function set<K extends keyof HabitFormValues>(key: K, value: HabitFormValues[K]) {
    setV((prev) => ({ ...prev, [key]: value }));
  }

  function pickKind(kind: HabitKind) {
    setV((prev) => ({
      ...prev,
      kind,
      // Nudge the default colour/icon to match the kind, but only while they're still untouched defaults.
      color:
        prev.color === "indigo" && kind === "break"
          ? "orange"
          : prev.color === "orange" && kind === "build"
            ? "indigo"
            : prev.color,
      icon:
        prev.icon === "target" && kind === "break"
          ? "ban"
          : prev.icon === "ban" && kind === "build"
            ? "target"
            : prev.icon,
      dailyTarget: kind === "break" ? 1 : prev.dailyTarget,
    }));
    if (kind === "break") setCounter(false);
  }

  function submit() {
    setError(null);
    const payload: HabitFormInput = {
      name: v.name,
      description: v.description,
      categoryId: v.categoryId,
      kind: v.kind,
      icon: v.icon,
      color: v.color,
      schedule: v.schedule,
      weekdays: days,
      weeklyTarget: v.weeklyTarget,
      dailyTarget: counter && v.kind === "build" ? v.dailyTarget : 1,
      unit: counter && v.kind === "build" ? v.unit : null,
      startDate: v.startDate,
    };
    startTransition(async () => {
      const res = editing ? await updateHabitAction(initial.id!, payload) : await createHabitAction(payload);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onClose();
    });
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editing ? "Edit habit" : "New habit"}
      footer={
        <div className="flex flex-col gap-2">
          {error && <p className="text-xs font-semibold text-h-bad">{error}</p>}
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            style={{ background: hex }}
            className="w-full rounded-xl py-3 text-sm font-extrabold text-white shadow-sm transition-opacity disabled:opacity-60"
          >
            {pending ? "Saving…" : editing ? "Save changes" : "Create habit"}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-5 pt-1">
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { kind: "build", title: "Build", sub: "Something I want to do", icon: Sprout },
              { kind: "break", title: "Break", sub: "Something I want to stop", icon: Ban },
            ] as const
          ).map(({ kind, title, sub, icon: Icon }) => {
            const active = v.kind === kind;
            const accent = kind === "build" ? "#5b5bf0" : "#f97316";
            return (
              <button
                key={kind}
                type="button"
                onClick={() => pickKind(kind)}
                style={active ? { borderColor: accent, background: `${accent}14` } : undefined}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-2xl border-2 p-3 text-left transition-colors",
                  active ? "" : "border-h-border bg-h-surface hover:bg-h-surface2"
                )}
              >
                <Icon className="h-5 w-5" style={{ color: accent }} />
                <span className="text-sm font-extrabold">{title}</span>
                <span className="text-[11px] leading-tight text-h-muted">{sub}</span>
              </button>
            );
          })}
        </div>

        <Field label="Name">
          <input
            value={v.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder={v.kind === "build" ? "e.g. Study, Workout, Read" : "e.g. Stop gaming, Stop doomscrolling"}
            maxLength={60}
            className={inputClass}
            autoFocus={!editing}
          />
        </Field>

        <Field label="Note (optional)">
          <input
            value={v.description ?? ""}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Why does this matter to you?"
            maxLength={200}
            className={inputClass}
          />
        </Field>

        <Field label="Category">
          <CategorySelect
            categories={categories}
            value={v.categoryId}
            onChange={(id) => set("categoryId", id)}
            onCreated={(c) => setCategories((prev) => [...prev, c])}
            fallbackColor={v.color}
          />
        </Field>

        <Field label="Repeat">
          <Segmented<HabitSchedule>
            value={v.schedule}
            onChange={(s) => set("schedule", s)}
            options={[
              { value: "daily", label: "Every day" },
              { value: "weekdays", label: "Specific days" },
              { value: "weekly_count", label: "X per week" },
            ]}
          />
          {v.schedule === "weekdays" && <WeekdayPicker value={days} onChange={setDays} color={hex} />}
          {v.schedule === "weekly_count" && (
            <div className="flex items-center justify-between rounded-xl bg-h-surface2 px-3 py-2">
              <span className="text-sm font-semibold">Times per week</span>
              <Stepper value={v.weeklyTarget} onChange={(n) => set("weeklyTarget", n)} min={1} max={7} />
            </div>
          )}
        </Field>

        {v.kind === "build" && (
          <Field label="Daily goal" hint="Turn on for things you count, like glasses of water or pages read.">
            <div className="flex flex-col gap-2 rounded-xl bg-h-surface2 px-3 py-2">
              <label className="flex items-center justify-between text-sm font-semibold">
                Count towards a target
                <input
                  type="checkbox"
                  checked={counter}
                  onChange={(e) => {
                    setCounter(e.target.checked);
                    if (e.target.checked && v.dailyTarget < 2) set("dailyTarget", 2);
                  }}
                  className="h-4 w-4 accent-[var(--h-brand)]"
                />
              </label>
              {counter && (
                <div className="flex items-center justify-between gap-3">
                  <Stepper value={v.dailyTarget} onChange={(n) => set("dailyTarget", n)} min={2} max={999} />
                  <input
                    value={v.unit ?? ""}
                    onChange={(e) => set("unit", e.target.value)}
                    placeholder="unit (glasses, pages…)"
                    maxLength={20}
                    className={cn(inputClass, "max-w-44")}
                  />
                </div>
              )}
            </div>
          </Field>
        )}

        <Field label="Colour">
          <ColorPicker value={v.color} onChange={(c) => set("color", c)} />
        </Field>
        <Field label="Icon">
          <IconPicker value={v.icon} onChange={(i) => set("icon", i)} color={hex} />
        </Field>

        <Field label="Start date" hint="Days before this never count against your streak.">
          <input
            type="date"
            value={v.startDate}
            max={todayIso()}
            onChange={(e) => e.target.value && set("startDate", e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>
    </Sheet>
  );
}
