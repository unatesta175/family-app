"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, ChevronLeft, ChevronRight, Minus, SkipForward, Undo2, X } from "lucide-react";
import { logHabitAction, saveHabitNoteAction } from "@/lib/habit-actions";
import {
  colorHex,
  STATUS_COLOR,
  statusStyle,
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
import { DurationInput, NumberInput, TimeOfDayInput } from "@/components/habits/form-fields";
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
          let icon: React.ReactNode = null;
          let extra = "";
          switch (d.state) {
            case "done":
              style = statusStyle("done", true);
              icon = <Check className="h-4 w-4" strokeWidth={3.5} />;
              break;
            case "partial":
              style = statusStyle("partial", false);
              icon = <Minus className="h-4 w-4" strokeWidth={3.5} />;
              break;
            case "slipped":
              style = statusStyle("slipped", true);
              icon = <X className="h-4 w-4" strokeWidth={3.5} />;
              break;
            case "missed":
              style = statusStyle("missed", false);
              icon = <X className="h-4 w-4" strokeWidth={3} />;
              break;
            case "skipped":
              style = statusStyle("skipped", false);
              icon = <SkipForward className="h-3.5 w-3.5" />;
              break;
            case "pending":
            case "flex":
              // Due but not logged yet: a dashed outline in the habit's colour with a dot.
              style = { ...statusStyle("pending", false), background: tint(STATUS_COLOR.pending, 0.06), borderColor: STATUS_COLOR.pending };
              extra = "border-dashed";
              icon = <span className="h-1.5 w-1.5 rounded-full bg-current" />;
              break;
            case "upcoming":
            case "off":
              style = { color: "var(--h-muted)", opacity: 0.5, borderColor: "transparent" };
              break;
            case "prestart":
              // Before the habit's start date: still loggable (saving pulls the start date back).
              style = { color: "var(--h-muted)", opacity: 0.8, borderColor: "transparent" };
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
                "relative flex aspect-square flex-col items-center justify-center gap-0.5 rounded-xl border-2 text-[11px] font-bold leading-none transition-transform",
                extra,
                !readOnly && d.date <= today && "hover:scale-105 active:scale-95",
                isToday && "ring-2 ring-h-fg ring-offset-1 ring-offset-h-surface"
              )}
            >
              <span className="tabular-nums">{dayNum}</span>
              <span className="flex h-4 items-center justify-center">{icon}</span>
              {d.note && <span className="absolute right-1 top-1 h-1 w-1 rounded-full bg-current opacity-70" />}
            </button>
          );
        })}
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-h-border pt-3 text-[11px] font-semibold text-h-muted sm:grid-cols-3">
        <LegendItem label={kind === "break" ? "Clean" : "Done"}>
          <span className="flex h-5 w-5 items-center justify-center rounded-md" style={{ background: STATUS_COLOR.done, color: "#fff" }}>
            <Check className="h-3 w-3" strokeWidth={3.5} />
          </span>
        </LegendItem>
        {kind === "break" && (
          <LegendItem label="Slipped">
            <span className="flex h-5 w-5 items-center justify-center rounded-md" style={{ background: STATUS_COLOR.slipped, color: "#fff" }}>
              <X className="h-3 w-3" strokeWidth={3.5} />
            </span>
          </LegendItem>
        )}
        <LegendItem label="Missed">
          <span className="flex h-5 w-5 items-center justify-center rounded-md border-2" style={statusStyle("missed", false)}>
            <X className="h-3 w-3" strokeWidth={3} />
          </span>
        </LegendItem>
        <LegendItem label="Pending">
          <span className="flex h-5 w-5 items-center justify-center rounded-md border-2 border-dashed" style={{ borderColor: STATUS_COLOR.pending, color: STATUS_COLOR.pending, background: tint(STATUS_COLOR.pending, 0.06) }}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
          </span>
        </LegendItem>
        <LegendItem label="Partial">
          <span className="flex h-5 w-5 items-center justify-center rounded-md border-2" style={statusStyle("partial", false)}>
            <Minus className="h-3 w-3" strokeWidth={3.5} />
          </span>
        </LegendItem>
        <LegendItem label="Skipped">
          <span className="flex h-5 w-5 items-center justify-center rounded-md border-2" style={statusStyle("skipped", false)}>
            <SkipForward className="h-3 w-3" />
          </span>
        </LegendItem>
        <LegendItem label="Not due / future">
          <span className="flex h-5 w-5 items-center justify-center rounded-md text-[10px] opacity-60">1</span>
        </LegendItem>
      </ul>

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

function LegendItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      {children}
      {label}
    </li>
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
  const measured = evalType === "numeric" || evalType === "timer" || evalType === "time_of_day";
  const isChecklist = evalType === "checklist";
  const logged0 = day.state === "done" || day.state === "partial";
  // A sensible starting point: what was logged, or the full goal.
  const [value, setValue] = useState<number>(logged0 ? day.value : dailyTarget > 0 ? dailyTarget : 1);
  const [checked, setChecked] = useState<string[]>(logged0 ? day.checked : checklist.map((i) => i.id));
  const [note, setNote] = useState(day.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const logged = ["done", "partial", "slipped", "skipped", "missed"].includes(day.state);
  const complete = isChecklist
    ? checked.length >= checklist.length && checklist.length > 0
    : measured
      ? targetMet(spec, value)
      : true;
  const saveLabel = complete ? "Done" : evalType === "time_of_day" ? (kind === "break" ? "Save as slipped" : "Save as missed") : "Save progress";

  const label = parseIso(day.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  function save(status: "done" | "slipped" | "skipped" | "missed" | "clear") {
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
              <span className="text-sm font-semibold">{evalType === "timer" ? "Time spent" : evalType === "time_of_day" ? "What time was it?" : "Amount"}</span>
              <span className="text-[11px] font-bold text-h-muted">Goal {targetLabel(spec)}</span>
            </div>
            {evalType === "timer" ? (
              <DurationInput seconds={value} onChange={setValue} />
            ) : evalType === "time_of_day" ? (
              <TimeOfDayInput minutes={value} onChange={setValue} aria-label="Time" className="max-w-40" />
            ) : (
              <div className="flex items-center gap-2">
                <NumberInput value={value} min={-1_000_000_000} onChange={(n) => setValue(n ?? 0)} className="max-w-32" />
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

        <div className="grid grid-cols-3 gap-2">
          <ActionBtn
            onClick={() => save("done")}
            disabled={pending}
            icon={Check}
            label={kind === "break" && complete ? "Stayed clean" : saveLabel}
            style={{ background: hex, color: "#fff" }}
          />
          {kind === "break" ? (
            <ActionBtn
              onClick={() => save("slipped")}
              disabled={pending}
              icon={X}
              label="Slipped"
              style={{ background: "var(--h-bad)", color: "#fff" }}
            />
          ) : (
            <ActionBtn
              onClick={() => save("missed")}
              disabled={pending}
              icon={X}
              label="Missed"
              style={{
                background: "color-mix(in srgb, var(--h-bad) 14%, transparent)",
                color: "var(--h-bad)",
              }}
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
