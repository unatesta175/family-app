"use client";

import { useState, useTransition } from "react";
import { Ban, Sprout, Users, X } from "lucide-react";
import { createHabitAction, updateHabitAction, type HabitFormInput } from "@/lib/habit-actions";
import { colorHex } from "@/lib/habits";
import { emptyHabit, type HabitFormValues } from "@/lib/habit-form-values";
import { cn } from "@/lib/utils";
import { Sheet } from "@/components/habits/sheet";
import { CategorySelect } from "@/components/habits/category-select";
import { EvaluationFields } from "@/components/habits/eval-fields";
import { FrequencyFields } from "@/components/habits/frequency-fields";
import { Caption, FormSection, NumberInput, ToggleRow } from "@/components/habits/form-fields";
import { Switch } from "@/components/habits/ui/switch";
import {
  ColorPicker,
  Field,
  IconPicker,
  inputClass,
  type CategoryOption,
} from "@/components/habits/form-bits";
import type { HabitKind } from "@/lib/db/schema";

// Re-exported so existing imports keep working.
export { emptyHabit };
export type { HabitFormValues };

export function HabitFormSheet({
  open,
  onClose,
  initial,
  categories: initialCategories,
  circleSize = 1,
}: {
  open: boolean;
  onClose: () => void;
  initial: HabitFormValues;
  categories: CategoryOption[];
  /** Number of people in the family circle, including the user. The share option shows when above 1. */
  circleSize?: number;
}) {
  const editing = initial.id !== undefined;
  const [v, setV] = useState<HabitFormValues>(initial);
  const [categories, setCategories] = useState(initialCategories);
  const [forEveryone, setForEveryone] = useState(false);
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
      // Break habits are a plain clean / slipped check-in.
      evalType: kind === "break" ? "yes_no" : prev.evalType,
      goals: kind === "break" ? [] : prev.goals,
    }));
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
      evalType: v.evalType,
      targetOp: v.targetOp,
      dailyTarget: v.dailyTarget,
      unit: v.unit,
      checklist: v.checklist,
      goals: v.goals,
      schedule: v.schedule,
      weekdays: v.weekdays,
      monthDays: v.monthDays,
      yearDays: v.yearDays,
      periodUnit: v.periodUnit,
      weeklyTarget: v.weeklyTarget,
      repeatEvery: v.repeatEvery,
      alternate: v.alternate,
      flexible: v.flexible,
      startDate: v.startDate,
      endDate: v.endDate,
      priority: v.priority,
      forEveryone,
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
      className="sm:max-w-xl"
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
      <div className="flex flex-col gap-4 pt-1">
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

        <FormSection title="Basics">
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

          <Field label="Description (optional)">
            <textarea
              value={v.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Why does this matter to you?"
              maxLength={200}
              rows={2}
              className={cn(inputClass, "resize-none")}
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

          <Field label="Colour">
            <ColorPicker value={v.color} onChange={(c) => set("color", c)} />
          </Field>
          <Field label="Icon">
            <IconPicker value={v.icon} onChange={(i) => set("icon", i)} color={hex} />
          </Field>
        </FormSection>

        {v.kind === "build" && (
          <FormSection title="How do you evaluate it?" description="Choose how a day counts as done.">
            <EvaluationFields v={v} set={set} hex={hex} />
          </FormSection>
        )}

        <FormSection title="Frequency" description="How often does this come up?">
          <FrequencyFields v={v} set={set} hex={hex} />
        </FormSection>

        <FormSection title="Schedule & priority">
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <Caption>Start date</Caption>
              <input
                type="date"
                value={v.startDate}
                onChange={(e) => e.target.value && set("startDate", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1">
              <Caption>End date (optional)</Caption>
              <div className="relative">
                <input
                  type="date"
                  value={v.endDate ?? ""}
                  min={v.startDate}
                  onChange={(e) => set("endDate", e.target.value || null)}
                  className={cn(inputClass, v.endDate && "pr-9")}
                />
                {v.endDate && (
                  <button
                    type="button"
                    aria-label="Clear end date"
                    onClick={() => set("endDate", null)}
                    className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-h-muted hover:bg-h-border hover:text-h-fg"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </label>
          </div>
          <p className="-mt-1 text-[11px] leading-snug text-h-muted">Days before the start or after the end never count against you.</p>

          <label className="flex flex-col gap-1">
            <Caption>Priority (optional)</Caption>
            <NumberInput
              integer
              min={1}
              max={99}
              value={v.priority > 0 ? v.priority : null}
              placeholder="None"
              onChange={(n) => set("priority", n ?? 0)}
              className="max-w-28"
            />
            <span className="text-[11px] leading-snug text-h-muted">1 is the highest priority and sits at the top of your list.</span>
          </label>
        </FormSection>

        {circleSize > 1 && (
          <FormSection title="Family circle">
            <ToggleRow
              title={editing ? "Also add for everyone" : "Create for everyone"}
              description={
                editing
                  ? `Adds this habit for the ${circleSize - 1} other ${circleSize === 2 ? "person" : "people"} in your circle who don't have it yet. Anyone who already has a habit with this name keeps theirs.`
                  : `Creates this habit for the ${circleSize - 1} other ${circleSize === 2 ? "person" : "people"} in your circle too. Everyone tracks their own copy and can change it.`
              }
            >
              <Switch checked={forEveryone} onCheckedChange={setForEveryone} aria-label="Create for everyone in my circle" />
            </ToggleRow>
            {forEveryone && (
              <p className="-mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-h-brand">
                <Users className="h-3.5 w-3.5" />
                Shared with {circleSize - 1} {circleSize === 2 ? "person" : "people"} when you save.
              </p>
            )}
          </FormSection>
        )}
      </div>
    </Sheet>
  );
}
