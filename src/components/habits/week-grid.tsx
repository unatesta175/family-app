"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { Check, ChevronRight, Layers, Minus, MoreHorizontal, RotateCcw, X } from "lucide-react";
import { logHabitAction, resetHabitProgressAction } from "@/lib/habit-actions";
import { colorHex, formatNumber, formatTimeOfDay, STATUS_COLOR, statusStyle, targetMet, tint, WEEKDAY_SHORT, type DayState } from "@/lib/habits";
import type { HabitEvalType, PeriodUnit, TargetOp } from "@/lib/db/schema";
import { habitIcon } from "@/lib/habit-icons";
import { Sheet } from "@/components/habits/sheet";
import { ConfirmDialog } from "@/components/habits/confirm-dialog";
import { ProgressDialog } from "@/components/habits/progress-dialog";
import { cn } from "@/lib/utils";
import { parseIso } from "@/lib/date";

/** `logged` = an entry exists for the day (as opposed to a day that is just empty). */
export type WeekCell = { date: string; state: DayState; value: number; checked: string[]; logged: boolean };
export type WeekRow = {
  id: number;
  name: string;
  kind: "build" | "break";
  color: string;
  icon: string;
  categoryName: string | null;
  evalType: HabitEvalType;
  targetOp: TargetOp;
  dailyTarget: number;
  unit: string | null;
  checklist: { id: string; title: string }[];
  /** "Some days per period" habit: the Wk column shows days done this period / needed. */
  isPeriod: boolean;
  periodUnit: PeriodUnit;
  periodTarget: number;
  periodDone: number;
  cells: WeekCell[];
};

/** What a one-tap "done" logs for this habit: the full goal. */
function doneEntry(row: WeekRow): { value: number; checked?: string[] } {
  if (row.evalType === "checklist") {
    const ids = row.checklist.map((i) => i.id);
    return { value: ids.length, checked: ids };
  }
  if (row.evalType === "yes_no") return { value: 1 };
  return { value: row.dailyTarget > 0 ? row.dailyTarget : 1 };
}

function partialText(row: WeekRow, value: number): string {
  if (row.evalType === "time_of_day") return formatTimeOfDay(value).replace(" ", "").toLowerCase();
  if (row.evalType === "timer") return `${Math.max(1, Math.round(value / 60))}m`;
  if (row.evalType === "checklist") return `${value}/${row.checklist.length}`;
  return formatNumber(value);
}

type Change = { habitId: number; date: string; state: DayState; value: number; checked: string[]; logged: boolean };

type Next = { status: "done" | "slipped" | "missed" | "skipped" | "clear"; state: DayState; value: number; checked?: string[] };

/**
 * One tap on a day cell cycles: empty -> done -> slipped -> missed -> skipped -> empty. (Numeric, timer
 * and checklist habits open the progress dialog instead, see onCell.) A day that only *looks* missed
 * because nothing was logged has no entry yet, so its next step is done.
 */
function nextForClick(row: WeekRow, cell: WeekCell): Next {
  switch (cell.state) {
    case "done":
      return { status: "slipped", state: "slipped", value: 0 };
    case "slipped":
      return { status: "missed", state: "missed", value: 0 };
    case "missed":
      return cell.logged
        ? { status: "skipped", state: "skipped", value: 0 }
        : { status: "done", state: "done", ...doneEntry(row) };
    case "skipped":
    case "partial":
      return { status: "clear", state: "flex", value: 0 };
    default:
      return { status: "done", state: "done", ...doneEntry(row) };
  }
}

/** The state a cell shows once its entry is cleared (or if it was never logged). */
function emptyState(row: WeekRow, date: string, today: string): DayState {
  return row.isPeriod ? "flex" : date === today ? "pending" : "missed";
}

/** The state a saved numeric / timer / checklist entry lands on: done only if it meets the goal. */
function entryState(row: WeekRow, date: string, today: string, entry: { value?: number; checked?: string[] }): DayState {
  if (row.evalType === "checklist") {
    const n = entry.checked?.length ?? 0;
    if (n === 0) return emptyState(row, date, today);
    return n >= row.checklist.length ? "done" : "partial";
  }
  const value = entry.value ?? 0;
  if (value === 0 && row.targetOp !== "at_most" && row.evalType !== "time_of_day") return emptyState(row, date, today);
  return targetMet(row, value) ? "done" : "partial";
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
        : {
            ...r,
            cells: r.cells.map((cell) =>
              cell.date === c.date ? { ...cell, state: c.state, value: c.value, checked: c.checked, logged: c.logged } : cell
            ),
          }
    )
  );
  const [, startTransition] = useTransition();
  // Which cell's progress dialog / which row's options and reset confirmation are open.
  const [adjusting, setAdjusting] = useState<{ rowId: number; date: string } | null>(null);
  const [optionsFor, setOptionsFor] = useState<number | null>(null);
  const [confirmWeekFor, setConfirmWeekFor] = useState<number | null>(null);
  // Category filter, same as the Today page: "All categories" can group rows under headings.
  const [category, setCategory] = useState<string | null>(null);
  const [grouped, setGrouped] = useState(false);

  function send(row: WeekRow, date: string, status: Next["status"], state: DayState, value: number, checked?: string[]) {
    startTransition(async () => {
      applyChange({ habitId: row.id, date, state, value, checked: checked ?? [], logged: status !== "clear" });
      await logHabitAction({ habitId: row.id, date, status, value, checked });
    });
  }

  function onCell(row: WeekRow, cell: WeekCell) {
    if (readOnly || cell.date > today) return;
    // Numeric, timer and checklist habits: adjust the amount in a dialog.
    if (row.evalType !== "yes_no") {
      setAdjusting({ rowId: row.id, date: cell.date });
      return;
    }
    const next = nextForClick(row, cell);
    // "Cleared" lands back on the natural empty state for that day, matching the server.
    const state = next.status === "clear" ? emptyState(row, cell.date, today) : next.state;
    send(row, cell.date, next.status, state, next.value, next.checked);
  }

  function resetWeek(row: WeekRow) {
    startTransition(async () => {
      for (const cell of row.cells) {
        applyChange({ habitId: row.id, date: cell.date, state: emptyState(row, cell.date, today), value: 0, checked: [], logged: false });
      }
      await resetHabitProgressAction({ habitId: row.id, from: dates[0], to: dates[dates.length - 1] });
    });
  }

  const chips = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of optimistic) counts.set(r.categoryName ?? "", (counts.get(r.categoryName ?? "") ?? 0) + 1);
    return {
      named: [...counts.entries()].filter(([n]) => n !== "").sort((a, b) => a[0].localeCompare(b[0])),
      none: counts.get("") ?? 0,
    };
  }, [optimistic]);
  const visible = optimistic.filter((r) => category === null || (r.categoryName ?? "") === category);
  const useGroups = grouped && category === null && chips.named.length > 0;
  // A flat list of rows, with a heading entry before each category when grouped.
  type Entry = { type: "head"; name: string; count: number } | { type: "row"; row: WeekRow };
  const entries: Entry[] = useGroups
    ? [...chips.named.map(([n]) => n), ""].flatMap((n) => {
        const rows = visible.filter((r) => (r.categoryName ?? "") === n);
        return rows.length
          ? [{ type: "head" as const, name: n || "No category", count: rows.length }, ...rows.map((row) => ({ type: "row" as const, row }))]
          : [];
      })
    : visible.map((row) => ({ type: "row" as const, row }));

  const adjustRow = adjusting ? optimistic.find((r) => r.id === adjusting.rowId) : undefined;
  const adjustCell = adjustRow?.cells.find((c) => c.date === adjusting?.date);
  const optionsRow = optionsFor !== null ? optimistic.find((r) => r.id === optionsFor) : undefined;
  const confirmRow = confirmWeekFor !== null ? optimistic.find((r) => r.id === confirmWeekFor) : undefined;

  // Bottom totals: how many habits were done each day.
  const totals = dates.map((d) => {
    let done = 0;
    let due = 0;
    for (const r of visible) {
      const cell = r.cells.find((c) => c.date === d)!;
      if (cell.state === "off" || cell.state === "upcoming" || cell.state === "skipped" || cell.state === "prestart") continue;
      if (cell.state === "flex") continue;
      due += 1;
      if (cell.state === "done") done += 1;
    }
    return { done, due };
  });

  return (
    <>
    {chips.named.length > 0 && (
      <div className="scrollbar-hide -mx-4 mb-3 flex items-center gap-1.5 overflow-x-auto px-4 md:mx-0 md:px-0" aria-label="Filter by category">
        {[
          { key: null as string | null, label: "All categories", n: null as number | null },
          ...chips.named.map(([name, n]) => ({ key: name as string | null, label: name, n })),
          ...(chips.none > 0 ? [{ key: "" as string | null, label: "No category", n: chips.none }] : []),
        ].map((c) => (
          <button
            key={c.key ?? "all"}
            type="button"
            aria-pressed={category === c.key}
            title={c.key === null ? (category === null && grouped ? "Grouped by category — tap to ungroup" : "Tap to group by category") : undefined}
            onClick={() => {
              if (c.key === null) {
                if (category === null) setGrouped((g) => !g);
                else {
                  setCategory(null);
                  setGrouped(true);
                }
              } else setCategory(c.key);
            }}
            className={cn(
              "shrink-0 rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-colors",
              category === c.key ? "border-h-fg bg-h-fg text-h-bg" : "border-h-border bg-h-surface text-h-muted hover:text-h-fg"
            )}
          >
            {c.key === null && category === null && grouped && <Layers className="mr-1 inline h-3 w-3 align-[-1px]" />}
            {c.label}
            {c.n !== null && <span className="ml-1 opacity-60">{c.n}</span>}
          </button>
        ))}
      </div>
    )}
    <div className="h-card hidden overflow-hidden md:block">
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
            {entries.map((entry) => {
              if (entry.type === "head") {
                return (
                  <tr key={`h-${entry.name}`} className="border-b border-h-border bg-h-surface2/60">
                    <td colSpan={9} className="sticky left-0 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-h-muted">
                      {entry.name} <span className="opacity-60">· {entry.count}</span>
                    </td>
                  </tr>
                );
              }
              const row = entry.row;
              const hex = colorHex(row.color);
              const Icon = habitIcon(row.icon);
              const doneCount = row.cells.filter((c) => c.state === "done").length;
              const dueCount = row.isPeriod
                ? row.periodTarget
                : row.cells.filter((c) => c.state !== "off" && c.state !== "skipped" && c.state !== "flex" && c.state !== "prestart").length;
              const shownDone = row.isPeriod ? row.periodDone : doneCount;
              const suffix = row.isPeriod && row.periodUnit !== "week" ? (row.periodUnit === "month" ? "/mo" : "/yr") : "";
              return (
                <tr key={row.id} className="border-b border-h-border/60 last:border-b-0">
                  <td className="sticky left-0 z-10 bg-h-surface px-3 py-2">
                    <div className="flex items-center gap-1">
                      <Link href={`/habits/${row.id}`} className="flex min-w-0 flex-1 items-center gap-2">
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
                      {!readOnly && (
                        <button
                          type="button"
                          aria-label={`Options for ${row.name}`}
                          onClick={() => setOptionsFor(row.id)}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-h-muted hover:bg-h-surface2 hover:text-h-fg"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                  {row.cells.map((cell) => (
                    <td key={cell.date} className="px-0.5 py-1.5 text-center">
                      <CellButton
                        cell={cell}
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

    {/* Phones: one card per habit with its seven days in an even strip (the table needs sideways scrolling). */}
    <div className="flex flex-col gap-2.5 md:hidden">
      {entries.map((entry) => {
        if (entry.type === "head") {
          return (
            <h3 key={`h-${entry.name}`} className="mt-1 flex items-center gap-2 px-1 text-xs font-extrabold uppercase tracking-wider text-h-muted">
              {entry.name}
              <span className="rounded-full bg-h-surface2 px-2 py-0.5 text-[10px]">{entry.count}</span>
            </h3>
          );
        }
        const row = entry.row;
        const hex = colorHex(row.color);
        const Icon = habitIcon(row.icon);
        const doneCount = row.cells.filter((c) => c.state === "done").length;
        const dueCount = row.isPeriod
          ? row.periodTarget
          : row.cells.filter((c) => !["off", "skipped", "flex", "prestart"].includes(c.state)).length;
        const shownDone = row.isPeriod ? row.periodDone : doneCount;
        const pct = dueCount > 0 ? Math.min(100, (shownDone / dueCount) * 100) : 0;
        const suffix = row.isPeriod && row.periodUnit !== "week" ? (row.periodUnit === "month" ? " /mo" : " /yr") : "";
        return (
          <section key={row.id} className="h-card p-3">
            <div className="flex items-start gap-2.5">
              <Link href={`/habits/${row.id}`} className="flex min-w-0 flex-1 items-start gap-2.5">
                <span
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: tint(hex, 0.14), color: hex }}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="line-clamp-2 break-words text-sm font-bold leading-snug">{row.name}</span>
                  <span className="block text-[11px] font-medium text-h-muted">{row.kind === "break" ? "Break" : "Build"}</span>
                </span>
              </Link>
              <span
                className={cn(
                  "mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-extrabold tabular-nums",
                  dueCount > 0 && shownDone >= dueCount ? "bg-h-good/15 text-h-good" : "bg-h-surface2 text-h-muted"
                )}
              >
                {shownDone}/{dueCount}
                {suffix}
              </span>
              {!readOnly && (
                <button
                  type="button"
                  aria-label={`Options for ${row.name}`}
                  onClick={() => setOptionsFor(row.id)}
                  className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-h-muted hover:bg-h-surface2"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-h-surface2">
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: shownDone >= dueCount && dueCount > 0 ? "var(--h-good)" : hex }} />
            </div>

            <div className="mt-2.5 grid grid-cols-7 gap-1">
              {row.cells.map((cell) => {
                const dt = parseIso(cell.date);
                const isToday = cell.date === today;
                return (
                  <div key={cell.date} className="flex flex-col items-center gap-1">
                    <span className={cn("text-[10px] font-bold uppercase", isToday ? "text-h-brand" : "text-h-muted")}>
                      {WEEKDAY_SHORT[dt.getDay()][0]}
                    </span>
                    <CellButton
                      cell={cell}
                      row={row}
                      disabled={readOnly || cell.date > today}
                      onClick={() => onCell(row, cell)}
                    />
                    <span
                      className={cn(
                        "flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-extrabold tabular-nums",
                        isToday ? "bg-h-brand text-h-brand-fg" : "text-h-muted"
                      )}
                    >
                      {dt.getDate()}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <div className="h-card grid grid-cols-7 gap-1 bg-h-surface2/60 p-3">
        {totals.map((t, i) => (
          <div key={dates[i]} className="flex flex-col items-center gap-0.5">
            <span className="text-[10px] font-bold uppercase text-h-muted">{WEEKDAY_SHORT[parseIso(dates[i]).getDay()][0]}</span>
            {dates[i] > today || t.due === 0 ? (
              <span className="text-[11px] font-extrabold text-h-muted/50">–</span>
            ) : (
              <span className={cn("text-[11px] font-extrabold tabular-nums", t.done === t.due && "text-h-good")}>
                {t.done}/{t.due}
              </span>
            )}
          </div>
        ))}
      </div>
      <p className="px-1 text-center text-[10px] font-bold uppercase tracking-wider text-h-muted">Day total</p>
    </div>

    {adjustRow && adjustCell && (
      <ProgressDialog
        name={adjustRow.name}
        dateLabel={parseIso(adjustCell.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        color={adjustRow.color}
        spec={{
          evalType: adjustRow.evalType,
          targetOp: adjustRow.targetOp,
          dailyTarget: adjustRow.dailyTarget,
          unit: adjustRow.unit,
          checklist: adjustRow.checklist,
        }}
        initialValue={adjustRow.evalType === "checklist" ? 0 : adjustCell.value}
        initialChecked={adjustCell.checked}
        onClose={() => setAdjusting(null)}
        onSave={(entry) => {
          const state = entryState(adjustRow, adjustCell.date, today, entry);
          send(adjustRow, adjustCell.date, "done", state, entry.value ?? entry.checked?.length ?? 0, entry.checked);
        }}
        breakHabit={adjustRow.kind === "break"}
        onMissed={() => (adjustRow.kind === "break" ? send(adjustRow, adjustCell.date, "slipped", "slipped", 0) : send(adjustRow, adjustCell.date, "missed", "missed", 0))}
        onSkip={() => send(adjustRow, adjustCell.date, "skipped", "skipped", 0)}
        onReset={() => send(adjustRow, adjustCell.date, "clear", emptyState(adjustRow, adjustCell.date, today), 0)}
      />
    )}

    {optionsRow && (
      <Sheet open onClose={() => setOptionsFor(null)} title={optionsRow.name} className="sm:max-w-sm">
        <div className="flex flex-col gap-2 pb-2 pt-1">
          <button
            type="button"
            onClick={() => {
              setConfirmWeekFor(optionsRow.id);
              setOptionsFor(null);
            }}
            className="flex items-center gap-3 rounded-xl border border-h-border px-4 py-3 text-left text-sm font-bold hover:bg-h-surface2"
          >
            <RotateCcw className="h-4 w-4 text-h-bad" />
            <span className="flex-1">
              Reset this week
              <span className="block text-[11px] font-medium text-h-muted">Clears every entry for this habit in the week shown.</span>
            </span>
          </button>
          <Link
            href={`/habits/${optionsRow.id}`}
            className="flex items-center gap-3 rounded-xl border border-h-border px-4 py-3 text-sm font-bold hover:bg-h-surface2"
          >
            <ChevronRight className="h-4 w-4 text-h-muted" />
            Details & history
          </Link>
        </div>
      </Sheet>
    )}

    {confirmRow && (
      <ConfirmDialog
        title="Reset this week?"
        message={`This clears every entry for ${confirmRow.name} from ${parseIso(dates[0]).toLocaleDateString("en-US", { month: "short", day: "numeric" })} to ${parseIso(dates[dates.length - 1]).toLocaleDateString("en-US", { month: "short", day: "numeric" })}. You can't undo it.`}
        confirmLabel="Reset week"
        onClose={() => setConfirmWeekFor(null)}
        onConfirm={() => resetWeek(confirmRow)}
      />
    )}
    </>
  );
}

function CellButton({
  cell,
  row,
  disabled,
  onClick,
}: {
  cell: WeekCell;
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
      style = statusStyle("done", true);
      content = <Check className="habit-pop h-4 w-4" strokeWidth={3} />;
      break;
    case "partial":
      style = statusStyle("partial", false);
      content = partialText(row, cell.value);
      break;
    case "slipped":
      style = statusStyle("slipped", true);
      content = <X className="h-4 w-4" strokeWidth={3} />;
      break;
    case "skipped":
      style = statusStyle("skipped", false);
      content = <Minus className="h-3.5 w-3.5" />;
      break;
    case "missed":
      // A deliberate "missed" gets a solid outline; an empty past day keeps the dashed one.
      style = { ...statusStyle("missed", false), borderColor: cell.logged ? STATUS_COLOR.missed : `${STATUS_COLOR.missed}66` };
      extra = cell.logged ? "border-2" : "border border-dashed";
      content = <X className="h-3.5 w-3.5 opacity-70" strokeWidth={2.5} />;
      break;
    case "pending":
      style = { borderColor: STATUS_COLOR.pending, background: tint(STATUS_COLOR.pending, 0.08) };
      extra = "border-2";
      break;
    case "flex":
      style = { background: "var(--h-surface-2)" };
      break;
    case "upcoming":
      extra = "border border-dashed border-h-border";
      break;
    case "prestart":
      // Before the start date: faint, but tappable (logging it pulls the start date back).
      extra = "border border-dashed border-h-border/70";
      content = <span className="h-1 w-1 rounded-full bg-h-border" />;
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
