"use client";

import { useState } from "react";
import { Ban, Check, Minus, Plus, RotateCcw, SkipForward } from "lucide-react";
import { colorHex, formatDuration, formatTimeOfDay, targetLabel, targetMet, timeOffGoal, tint } from "@/lib/habits";
import type { HabitEvalType, TargetOp } from "@/lib/db/schema";
import { Sheet } from "@/components/habits/sheet";
import { ConfirmDialog } from "@/components/habits/confirm-dialog";
import { DurationInput, NumberInput, TimeOfDayInput } from "@/components/habits/form-fields";
import { Checkbox } from "@/components/habits/ui/checkbox";
import { cn } from "@/lib/utils";

export type ProgressSpec = {
  evalType: HabitEvalType;
  targetOp: TargetOp;
  dailyTarget: number;
  unit: string | null;
  checklist: { id: string; title: string }[];
};

/**
 * Adjust one day's progress for a numeric, timer or checklist habit. The day only counts as done when
 * the entry meets the habit's daily requirement; anything less is saved as progress.
 */
export function ProgressDialog({
  name,
  dateLabel,
  color,
  spec,
  initialValue,
  initialChecked,
  onClose,
  onSave,
  onMissed,
  onSkip,
  onReset,
  breakHabit = false,
}: {
  name: string;
  dateLabel: string;
  color: string;
  spec: ProgressSpec;
  initialValue: number;
  initialChecked: string[];
  onClose: () => void;
  /** `value` for numeric/timer habits, `checked` ids for checklists. */
  onSave: (entry: { value?: number; checked?: string[] }) => void;
  onMissed: () => void;
  onSkip: () => void;
  onReset: () => void;
  /** A break habit: the "Missed" button reads "Slipped" (the caller logs it as slipped). */
  breakHabit?: boolean;
}) {
  const hex = colorHex(color);
  const { evalType, checklist } = spec;
  const isTime = evalType === "time_of_day";
  // Nothing logged yet: start the clock at the goal time so a small change reaches the real one.
  const [value, setValue] = useState(isTime && initialValue === 0 ? spec.dailyTarget : initialValue);
  const [checked, setChecked] = useState<string[]>(initialChecked);
  const [confirmReset, setConfirmReset] = useState(false);

  const isChecklist = evalType === "checklist";
  const progress = isChecklist ? checked.length : value;
  const complete = isChecklist ? checklist.length > 0 && checked.length >= checklist.length : targetMet(spec, value);
  const empty = isChecklist ? checked.length === 0 : !isTime && value === 0 && spec.targetOp !== "at_most";
  const off = isTime ? timeOffGoal(spec, value) : null;
  const atMost = spec.targetOp === "at_most" && !isChecklist;

  let status: string;
  if (complete) status = "Goal met — this day will be marked done.";
  else if (empty) status = "Nothing logged — saving will leave this day empty.";
  else if (off) {
    const gap = formatDuration(off.minutes * 60);
    status = `${off.kind === "late" ? `Late by ${gap}` : off.kind === "early" ? `${gap} too early` : `${gap} off the goal time`} — saved as progress, not marked done.`;
  } else if (atMost) status = "Over the limit — saved as progress, not marked done.";
  else if (isChecklist) status = `${checklist.length - checked.length} item${checklist.length - checked.length === 1 ? "" : "s"} left — saved as progress until every item is ticked.`;
  else status = `Below the goal (${targetLabel(spec)}) — saved as progress, not marked done.`;

  function step(delta: number) {
    setValue((v) => Math.max(0, Math.round((v + delta) * 100) / 100));
  }

  return (
    <>
      <Sheet
        open
        onClose={onClose}
        title={name}
        className="sm:max-w-md"
        footer={
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                onSave(isChecklist ? { checked } : { value });
                onClose();
              }}
              style={{ background: hex }}
              className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-extrabold text-white"
            >
              <Check className="h-4 w-4" strokeWidth={3} />
              {complete ? "Save & mark done" : empty ? "Save" : "Save progress"}
            </button>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  onMissed();
                  onClose();
                }}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-h-border py-2.5 text-xs font-bold text-h-bad hover:bg-h-bad/10"
              >
                <Ban className="h-3.5 w-3.5" />
                {breakHabit ? "Slipped" : "Missed"}
              </button>
              <button
                type="button"
                onClick={() => {
                  onSkip();
                  onClose();
                }}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-h-border py-2.5 text-xs font-bold text-h-muted hover:text-h-fg"
              >
                <SkipForward className="h-3.5 w-3.5" />
                Skip
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-h-border py-2.5 text-xs font-bold text-h-muted hover:text-h-fg"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </button>
            </div>
          </div>
        }
      >
        <div className="flex flex-col gap-4 pb-2 pt-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-h-muted">{dateLabel}</p>
            {!isChecklist && spec.targetOp !== "any" && (
              <p className="text-xs font-bold text-h-muted">Goal {targetLabel(spec)}</p>
            )}
            {isChecklist && (
              <p className="text-xs font-bold text-h-muted">
                {checked.length}/{checklist.length} ticked
              </p>
            )}
          </div>

          {evalType === "numeric" && (
            <div className="flex items-center justify-center gap-3 rounded-2xl bg-h-surface2 p-4">
              <button
                type="button"
                aria-label="Decrease"
                onClick={() => step(-1)}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-h-surface text-h-fg shadow-sm"
              >
                <Minus className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2">
                <NumberInput
                  value={value}
                  min={0}
                  onChange={(n) => setValue(n ?? 0)}
                  aria-label="Amount achieved"
                  className="w-24 text-center text-lg font-extrabold"
                />
                {spec.unit && <span className="text-sm font-semibold text-h-muted">{spec.unit}</span>}
              </div>
              <button
                type="button"
                aria-label="Increase"
                onClick={() => step(1)}
                style={{ background: tint(hex, 0.16), color: hex }}
                className="flex h-11 w-11 items-center justify-center rounded-full"
              >
                <Plus className="h-5 w-5" strokeWidth={2.5} />
              </button>
            </div>
          )}

          {isTime && (
            <div className="flex flex-col items-center gap-2 rounded-2xl bg-h-surface2 p-4">
              <p className="text-xs font-semibold text-h-muted">What time was it?</p>
              <TimeOfDayInput minutes={value} onChange={setValue} aria-label="Time" className="w-40 text-center text-lg font-extrabold" />
              <p className="text-[11px] font-medium text-h-muted">{formatTimeOfDay(value)}</p>
            </div>
          )}

          {evalType === "timer" && (
            <div className="rounded-2xl bg-h-surface2 p-4">
              <DurationInput seconds={value} onChange={setValue} />
            </div>
          )}

          {isChecklist && (
            <ul className="flex flex-col gap-0.5 rounded-2xl bg-h-surface2 p-2">
              {checklist.map((item) => {
                const on = checked.includes(item.id);
                return (
                  <li key={item.id}>
                    <label className="flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2.5 hover:bg-h-surface">
                      <Checkbox
                        color={hex}
                        checked={on}
                        onCheckedChange={(c) =>
                          setChecked((prev) => (c ? [...prev, item.id] : prev.filter((id) => id !== item.id)))
                        }
                      />
                      <span className={cn("text-sm font-semibold", on && "text-h-muted line-through")}>{item.title}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}

          <p
            className={cn(
              "rounded-xl px-3 py-2 text-xs font-semibold leading-snug",
              complete ? "bg-h-good/15 text-h-good" : off || (progress > 0 && atMost) ? "bg-h-bad/10 text-h-bad" : "bg-h-surface2 text-h-muted"
            )}
          >
            {status}
          </p>
        </div>
      </Sheet>

      {confirmReset && (
        <ConfirmDialog
          title="Reset progress?"
          message={`This clears everything logged for ${name} on ${dateLabel}. You can't undo it.`}
          confirmLabel="Reset"
          onClose={() => setConfirmReset(false)}
          onConfirm={() => {
            onReset();
            onClose();
          }}
        />
      )}
    </>
  );
}
