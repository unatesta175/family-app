"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, ChevronLeft, ChevronRight, SkipForward, Undo2, X } from "lucide-react";
import { logHabitAction, saveHabitNoteAction } from "@/lib/habit-actions";
import {
  colorHex,
  targetLabel,
  targetMet,
  tint,
  WEEKDAY_SHORT,
  type ChecklistItem,
  type DayState,
} from "@/lib/habits";
import type { HabitEvalType, TargetOp } from "@/lib/db/schema";
import { Sheet } from "@/components/habits/sheet";
import { inputClass } from "@/components/habits/form-bits";
import { DurationInput, NumberInput } from "@/components/habits/form-fields";
import { Checkbox } from "@/components/habits/ui/checkbox";
import { parseIso } from "@/lib/date";
import { cn } from "@/lib/utils";

export type CalendarDay = {
  date: string;
  state: DayState;
  value: number;
  /** Checklist habits: ids of the ticked items. */
  checked: string[];
  note: string | null;
};

type GoalSpec = {
  evalType: HabitEvalType;
  targetOp: TargetOp;
  dailyTarget: number;
  unit: string | null;
  checklist: ChecklistItem[];
};

export function HabitCalendar({
  habitId,
  kind,
  color,
  evalType,
  targetOp,
  dailyTarget,
  unit,
  checklist,
  monthLabel,
  prevHref,
  nextHref,
  leadingBlanks,
  days,
  today,
  readOnly,
}: {
  habitId: number;
  kind: "build" | "break";
  color: string;
  evalType: HabitEvalType;
  targetOp: TargetOp;
  dailyTarget: number;
  unit: string | null;
  checklist: ChecklistItem[];
  monthLabel: string;
  prevHref: string;
  nextHref: string | null;
  leadingBlanks: number;
  days: CalendarDay[];
  today: string;
  readOnly: boolean;
}) {
  const hex = colorHex(color);
  const [selected, setSelected] = useState<CalendarDay | null>(null);

  return (
    <div className="h-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <Link href={prevHref} aria-label="Previous month" className="flex h-8 w-8 items-center justify-center rounded-full text-h-muted hover:bg-h-surface2">
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <p className="text-sm font-extrabold">{monthLabel}</p>
        {nextHref ? (
          <Link href={nextHref} aria-label="Next month" className="flex h-8 w-8 items-center justify-center rounded-full text-h-muted hover:bg-h-surface2">
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <span className="h-8 w-8" />
        )}
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center">
        {WEEKDAY_SHORT.map((d) => (
          <span key={d} className="pb-1 text-[10px] font-bold uppercase text-h-muted">
            {d[0]}
          </span>
        ))}
        {Array.from({ length: leadingBlanks }, (_, i) => (
          <span key={`b${i}`} />
        ))}
        {days.map((d) => {
          const dayNum = parseIso(d.date).getDate();
          const isToday = d.date === today;
          let style: React.CSSProperties = {};
          let extra = "";
          switch (d.state) {
            case "done":
              style = { background: hex, color: "#fff" };
              break;
            case "partial":
              style = { background: tint(hex, 0.3), color: hex };
              break;
            case "slipped":
              style = { background: "var(--h-bad)", color: "#fff" };
              break;
            case "skipped":
              style = { background: "var(--h-surface-2)", color: "var(--h-muted)" };
              extra = "line-through";
              break;
            case "missed":
              style = { background: "color-mix(in srgb, var(--h-bad) 12%, transparent)", color: "var(--h-bad)" };
              break;
            case "pending":
              style = { background: tint(hex, 0.1), color: hex };
              break;
            case "flex":
              style = { background: "var(--h-surface-2)" };
              break;
            case "upcoming":
            case "off":
              style = { color: "var(--h-muted)", opacity: 0.55 };
              break;
          }
          return (
            <button
              key={d.date}
              type="button"
              disabled={readOnly || d.date > today}
              onClick={() => setSelected(d)}
              aria-label={`${d.date}: ${d.state}`}
              style={style}
              className={cn(
                "relative flex aspect-square items-center justify-center rounded-xl text-xs font-bold transition-transform",
                extra,
                !readOnly && d.date <= today && "hover:scale-105 active:scale-95",
                isToday && "ring-2 ring-h-fg ring-offset-1 ring-offset-h-surface"
              )}
            >
              {dayNum}
              {d.note && <span className="absolute right-1 top-1 h-1 w-1 rounded-full bg-current opacity-70" />}
            </button>
          );
        })}
      </div>

      {selected && (
        <DayEditor
          key={selected.date}
          habitId={habitId}
          kind={kind}
          color={color}
          spec={{ evalType, targetOp, dailyTarget, unit, checklist }}
          day={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function DayEditor({
  habitId,
  kind,
  color,
  spec,
  day,
  onClose,
}: {
  habitId: number;
  kind: "build" | "break";
  color: string;
  spec: GoalSpec;
  day: CalendarDay;
  onClose: () => void;
}) {
  const hex = colorHex(color);
  const { evalType, dailyTarget, checklist } = spec;
  const measured = kind === "build" && (evalType === "numeric" || evalType === "timer");
  const isChecklist = kind === "build" && evalType === "checklist";
  const logged0 = day.state === "done" || day.state === "partial";
  // A sensible starting point: what was logged, or the full goal.
  const [value, setValue] = useState<number>(logged0 ? day.value : dailyTarget > 0 ? dailyTarget : 1);
  const [checked, setChecked] = useState<string[]>(logged0 ? day.checked : checklist.map((i) => i.id));
  const [note, setNote] = useState(day.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const logged = ["done", "partial", "slipped", "skipped"].includes(day.state);
  const complete = isChecklist
    ? checked.length >= checklist.length && checklist.length > 0
    : measured
      ? targetMet(spec, value)
      : true;
  const saveLabel = complete ? "Done" : "Save progress";

  const label = parseIso(day.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  function save(status: "done" | "slipped" | "skipped" | "clear") {
    setError(null);
    startTransition(async () => {
      try {
        await logHabitAction({
          habitId,
          date: day.date,
          status,
          value: status === "done" && measured ? value : undefined,
          checked: status === "done" && isChecklist ? checked : undefined,
        });
        // Persist the note alongside the entry (only meaningful when an entry exists).
        if (status !== "clear" && (note.trim() || day.note)) {
          const res = await saveHabitNoteAction({ habitId, date: day.date, note });
          if (!res.ok) {
            setError(res.error);
            return;
          }
        }
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save.");
      }
    });
  }

  return (
    <Sheet open onClose={onClose} title={label}>
      <div className="flex flex-col gap-4 pb-2 pt-1">
        {measured && (
          <div className="flex flex-col gap-2 rounded-xl bg-h-surface2 p-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-semibold">{evalType === "timer" ? "Time spent" : "Amount"}</span>
              <span className="text-[11px] font-bold text-h-muted">Goal {targetLabel(spec)}</span>
            </div>
            {evalType === "timer" ? (
              <DurationInput seconds={value} onChange={setValue} />
            ) : (
              <div className="flex items-center gap-2">
                <NumberInput value={value} min={0} onChange={(n) => setValue(n ?? 0)} className="max-w-32" />
                {spec.unit && <span className="text-sm font-semibold text-h-muted">{spec.unit}</span>}
              </div>
            )}
          </div>
        )}

        {isChecklist && (
          <ul className="flex flex-col gap-1.5 rounded-xl bg-h-surface2 p-2">
            {checklist.map((item) => {
              const on = checked.includes(item.id);
              return (
                <li key={item.id}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-h-surface">
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

        <div className={cn("grid gap-2", kind === "break" ? "grid-cols-3" : "grid-cols-2")}>
          <ActionBtn
            onClick={() => save("done")}
            disabled={pending}
            icon={Check}
            label={kind === "break" ? "Stayed clean" : saveLabel}
            style={{ background: hex, color: "#fff" }}
          />
          {kind === "break" && (
            <ActionBtn
              onClick={() => save("slipped")}
              disabled={pending}
              icon={X}
              label="Slipped"
              style={{ background: "var(--h-bad)", color: "#fff" }}
            />
          )}
          <ActionBtn onClick={() => save("skipped")} disabled={pending} icon={SkipForward} label="Skip day" />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wide text-h-muted">Note</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="How did it go? (saved with the entry)"
            className={inputClass}
          />
        </div>

        {error && <p className="text-xs font-semibold text-h-bad">{error}</p>}

        {logged && (
          <button
            type="button"
            disabled={pending}
            onClick={() => save("clear")}
            className="flex items-center justify-center gap-2 rounded-xl border border-h-border py-2.5 text-sm font-bold text-h-muted hover:text-h-fg"
          >
            <Undo2 className="h-4 w-4" />
            Clear this day
          </button>
        )}
      </div>
    </Sheet>
  );
}

function ActionBtn({
  onClick,
  disabled,
  icon: Icon,
  label,
  style,
}: {
  onClick: () => void;
  disabled: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={style}
      className={cn(
        "flex items-center justify-center gap-1.5 rounded-xl px-3 py-3 text-sm font-extrabold transition-opacity disabled:opacity-60",
        !style && "bg-h-surface2 text-h-fg"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
