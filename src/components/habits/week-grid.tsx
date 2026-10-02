"use client";

import { useOptimistic, useTransition } from "react";
import Link from "next/link";
import { Check, Minus, X } from "lucide-react";
import { logHabitAction } from "@/lib/habit-actions";
import { colorHex, formatNumber, tint, WEEKDAY_SHORT, type DayState } from "@/lib/habits";
import type { HabitEvalType, PeriodUnit } from "@/lib/db/schema";
import { habitIcon } from "@/lib/habit-icons";
import { cn } from "@/lib/utils";
import { parseIso } from "@/lib/date";

export type WeekCell = { date: string; state: DayState; value: number };
export type WeekRow = {
  id: number;
  name: string;
  kind: "build" | "break";
  color: string;
  icon: string;
  evalType: HabitEvalType;
  dailyTarget: number;
  checklistIds: string[];
  /** "Some days per period" habit: the Wk column shows days done this period / needed. */
  isPeriod: boolean;
  periodUnit: PeriodUnit;
  periodTarget: number;
  periodDone: number;
  cells: WeekCell[];
};

/** What a one-tap "done" logs for this habit: the full goal. */
function doneEntry(row: WeekRow): { value: number; checked?: string[] } {
  if (row.evalType === "checklist") return { value: row.checklistIds.length, checked: row.checklistIds };
  if (row.evalType === "yes_no") return { value: 1 };
  return { value: row.dailyTarget > 0 ? row.dailyTarget : 1 };
}

function partialText(row: WeekRow, value: number): string {
  if (row.evalType === "timer") return `${Math.max(1, Math.round(value / 60))}m`;
  if (row.evalType === "checklist") return `${value}/${row.checklistIds.length}`;
  return formatNumber(value);
}

type Change = { habitId: number; date: string; state: DayState; value: number };

type Next = { status: "done" | "slipped" | "clear"; state: DayState; value: number; checked?: string[] };

function nextForClick(row: WeekRow, cell: WeekCell): Next {
  const complete = cell.state === "done";
  if (row.kind === "break") {
    // none -> clean -> slipped -> none
    if (cell.state === "done") return { status: "slipped", state: "slipped", value: 0 };
    if (cell.state === "slipped") return { status: "clear", state: "flex", value: 0 };
    return { status: "done", state: "done", ...doneEntry(row) };
  }
  if (complete || cell.state === "slipped" || cell.state === "skipped" || cell.state === "partial") {
    return { status: "clear", state: "flex", value: 0 };
  }
  return { status: "done", state: "done", ...doneEntry(row) };
}

export function WeekGrid({
  rows,
  dates,
  today,
  readOnly,
}: {
  rows: WeekRow[];
  dates: string[];
  today: string;
  readOnly: boolean;
}) {
  const [optimistic, applyChange] = useOptimistic<WeekRow[], Change>(rows, (state, c) =>
    state.map((r) =>
      r.id !== c.habitId
        ? r
        : { ...r, cells: r.cells.map((cell) => (cell.date === c.date ? { ...cell, state: c.state, value: c.value } : cell)) }
    )
  );
  const [, startTransition] = useTransition();

  function onCell(row: WeekRow, cell: WeekCell) {
    if (readOnly || cell.date > today) return;
    const next = nextForClick(row, cell);
    // "Cleared" lands back on the natural empty state for that day, matching the server.
    const clearedState: DayState =
      row.isPeriod ? "flex" : cell.date === today ? "pending" : "missed";
    const state = next.status === "clear" ? clearedState : next.state;
    startTransition(async () => {
      applyChange({ habitId: row.id, date: cell.date, state, value: next.value });
      await logHabitAction({
        habitId: row.id,
        date: cell.date,
        status: next.status,
        value: next.value,
        checked: next.checked,
      });
    });
  }

  // Bottom totals: how many habits were done each day.
  const totals = dates.map((d) => {
    let done = 0;
    let due = 0;
    for (const r of optimistic) {
      const cell = r.cells.find((c) => c.date === d)!;
      if (cell.state === "off" || cell.state === "upcoming" || cell.state === "skipped") continue;
      if (cell.state === "flex") continue;
      due += 1;
      if (cell.state === "done") done += 1;
    }
    return { done, due };
  });

  return (
    <div className="h-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse">
          <thead>
            <tr className="border-b border-h-border">
              <th className="sticky left-0 z-10 w-[38%] bg-h-surface px-3 py-2 text-left text-[10px] font-extrabold uppercase tracking-wider text-h-muted">
                Habit
              </th>
              {dates.map((d) => {
                const dt = parseIso(d);
                const isToday = d === today;
                return (
                  <th key={d} className="px-0.5 py-2 text-center">
                    <div className={cn("text-[10px] font-bold uppercase", isToday ? "text-h-brand" : "text-h-muted")}>
                      {WEEKDAY_SHORT[dt.getDay()]}
                    </div>
                    <div
                      className={cn(
                        "mx-auto mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-extrabold",
                        isToday && "bg-h-brand text-h-brand-fg"
                      )}
                    >
                      {dt.getDate()}
                    </div>
                  </th>
                );
              })}
              <th className="w-12 px-2 py-2 text-right text-[10px] font-extrabold uppercase tracking-wider text-h-muted">
                Wk
              </th>
            </tr>
          </thead>
          <tbody>
            {optimistic.map((row) => {
              const hex = colorHex(row.color);
              const Icon = habitIcon(row.icon);
              const doneCount = row.cells.filter((c) => c.state === "done").length;
              const dueCount = row.isPeriod
                ? row.periodTarget
                : row.cells.filter((c) => c.state !== "off" && c.state !== "skipped" && c.state !== "flex").length;
              const shownDone = row.isPeriod ? row.periodDone : doneCount;
              const suffix = row.isPeriod && row.periodUnit !== "week" ? (row.periodUnit === "month" ? "/mo" : "/yr") : "";
              return (
                <tr key={row.id} className="border-b border-h-border/60 last:border-b-0">
                  <td className="sticky left-0 z-10 bg-h-surface px-3 py-2">
                    <Link href={`/habits/${row.id}`} className="flex items-center gap-2">
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                        style={{ background: tint(hex, 0.14), color: hex }}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-bold leading-tight">{row.name}</span>
                        <span className="block text-[10px] font-medium leading-tight text-h-muted">
                          {row.kind === "break" ? "Break" : "Build"}
                        </span>
                      </span>
                    </Link>
                  </td>
                  {row.cells.map((cell) => (
                    <td key={cell.date} className="px-0.5 py-1.5 text-center">
                      <CellButton
                        cell={cell}
                        hex={hex}
                        row={row}
                        disabled={readOnly || cell.date > today}
                        onClick={() => onCell(row, cell)}
                      />
                    </td>
                  ))}
                  <td className="px-2 py-2 text-right">
                    <span
                      className={cn(
                        "text-xs font-extrabold tabular-nums",
                        dueCount > 0 && shownDone >= dueCount ? "text-h-good" : "text-h-muted"
                      )}
                    >
                      {shownDone}/{dueCount}
                      {suffix && <span className="ml-0.5 text-[9px] font-bold opacity-70">{suffix}</span>}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-h-border bg-h-surface2/60">
              <td className="sticky left-0 z-10 bg-h-surface2 px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-h-muted">
                Day total
              </td>
              {totals.map((t, i) => (
                <td key={dates[i]} className="px-0.5 py-2 text-center text-[11px] font-extrabold tabular-nums">
                  {dates[i] > today || t.due === 0 ? (
                    <span className="text-h-muted/50">–</span>
                  ) : (
                    <span className={t.done === t.due ? "text-h-good" : ""}>
                      {t.done}/{t.due}
                    </span>
                  )}
                </td>
              ))}
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function CellButton({
  cell,
  hex,
  row,
  disabled,
  onClick,
}: {
  cell: WeekCell;
  hex: string;
  row: WeekRow;
  disabled: boolean;
  onClick: () => void;
}) {
  const base =
    "mx-auto flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-extrabold transition-transform";
  let style: React.CSSProperties = {};
  let content: React.ReactNode = null;
  let extra = "";

  switch (cell.state) {
    case "done":
      style = { background: hex, color: "#fff" };
      content = <Check className="habit-pop h-4 w-4" strokeWidth={3} />;
      break;
    case "partial":
      style = { background: tint(hex, 0.25), color: hex };
      content = partialText(row, cell.value);
      break;
    case "slipped":
      style = { background: "var(--h-bad)", color: "#fff" };
      content = <X className="h-4 w-4" strokeWidth={3} />;
      break;
    case "skipped":
      style = { background: "var(--h-surface-2)", color: "var(--h-muted)" };
      content = <Minus className="h-3.5 w-3.5" />;
      break;
    case "missed":
      style = { background: "color-mix(in srgb, var(--h-bad) 10%, transparent)" };
      extra = "border border-dashed border-h-bad/30";
      break;
    case "pending":
      style = { borderColor: hex, background: tint(hex, 0.08) };
      extra = "border-2";
      break;
    case "flex":
      style = { background: "var(--h-surface-2)" };
      break;
    case "upcoming":
      extra = "border border-dashed border-h-border";
      break;
    case "off":
      content = <span className="h-1 w-1 rounded-full bg-h-border" />;
      break;
  }

  return (
    <button
      type="button"
      disabled={disabled || cell.state === "off"}
      onClick={onClick}
      aria-label={`${row.name} on ${cell.date}: ${cell.state}`}
      style={style}
      className={cn(base, extra, !disabled && cell.state !== "off" && "hover:scale-110 active:scale-90", disabled && "cursor-default")}
    >
      {content}
    </button>
  );
}
