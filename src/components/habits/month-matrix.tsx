"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { Check, Minus, X } from "lucide-react";
import { logHabitAction } from "@/lib/habit-actions";
import { ProgressDialog } from "@/components/habits/progress-dialog";
import { emptyState, entryState, nextForClick, type WeekRow } from "@/components/habits/week-grid";
import { parseIso } from "@/lib/date";
import { HabitIcon } from "@/components/habits/habit-icon";
import { RankChip } from "@/components/habits/rank-chip";
import { MonthChart } from "@/components/habits/month-chart";
import { PERIOD_DAYS, STATUS_COLOR, colorHex, tint, type DayState } from "@/lib/habits";
import { cn } from "@/lib/utils";

type Change = { habitId: number; date: string; state: DayState; value: number; checked: string[]; logged: boolean };

const COUNTED: DayState[] = ["done", "partial", "missed", "slipped", "pending"];

/** A square that grows and shrinks with its grid cell (never past 1.75rem), so any month fits any screen. */
const SQUARE: React.CSSProperties = { width: "min(100cqw, 100cqh, 1.75rem)", height: "min(100cqw, 100cqh, 1.75rem)" };
const GLYPH = "h-[62%] w-[62%]";

function Square({ state }: { state: DayState }) {
  const base = "flex items-center justify-center rounded-[22%]";
  switch (state) {
    case "done":
      return (
        <span className={base} style={{ ...SQUARE, background: STATUS_COLOR.done, color: "#fff" }}>
          <Check className={GLYPH} strokeWidth={3.5} />
        </span>
      );
    case "partial":
      return (
        <span className={base} style={{ ...SQUARE, background: STATUS_COLOR.partial, color: "#fff" }}>
          <Minus className={GLYPH} strokeWidth={3.5} />
        </span>
      );
    case "slipped":
      return (
        <span className={base} style={{ ...SQUARE, background: STATUS_COLOR.slipped, color: "#fff" }}>
          <X className={GLYPH} strokeWidth={3.5} />
        </span>
      );
    case "missed":
      return (
        <span className={base} style={{ ...SQUARE, background: tint(STATUS_COLOR.missed, 0.2), color: STATUS_COLOR.missed }}>
          <X className={GLYPH} strokeWidth={3} />
        </span>
      );
    case "skipped":
      return (
        <span className={base} style={{ ...SQUARE, background: tint(STATUS_COLOR.skipped, 0.25), color: STATUS_COLOR.skipped }}>
          <Minus className={GLYPH} strokeWidth={3} />
        </span>
      );
    case "pending":
    case "flex":
      return <span className={base} style={{ ...SQUARE, boxShadow: `inset 0 0 0 2px ${STATUS_COLOR.pending}`, background: tint(STATUS_COLOR.pending, 0.08) }} />;
    case "upcoming":
      return <span className={base} style={{ ...SQUARE, boxShadow: "inset 0 0 0 1px var(--h-border)" }} />;
    default:
      return <span style={SQUARE} />;
  }
}

/** Productivity of one day as a coloured pill: green when everything got done, fading to grey. */
function pctStyle(pct: number): React.CSSProperties {
  if (pct >= 100) return { background: STATUS_COLOR.done, color: "#fff" };
  if (pct >= 70) return { background: tint(STATUS_COLOR.done, 0.22), color: STATUS_COLOR.done };
  if (pct >= 40) return { background: tint(STATUS_COLOR.partial, 0.22), color: "#b45309" };
  return { background: "var(--h-surface-2)", color: "var(--h-muted)" };
}

/** One grid cell that centres its content and lets squares size themselves from the cell. */
function Cell({ children, className, style, row }: { children?: React.ReactNode; className?: string; style?: React.CSSProperties; row: number }) {
  return (
    <div className={cn("flex min-h-0 min-w-0 items-center justify-center", className)} style={{ containerType: "size", fontSize: "clamp(8px, 58cqh, 13px)", gridRow: row, ...style }}>
      {children}
    </div>
  );
}

const label = "text-[10px] font-bold uppercase tracking-wide text-h-muted";

/**
 * The whole month on one screen. On a laptop (lg and up) it fills the space under the header: habits
 * as rows, days as columns, and the daily chart underneath, all sized to fit so nothing scrolls. On
 * smaller screens the table keeps a readable minimum width and scrolls sideways. Squares open that day
 * on the Today page.
 */
export function MonthMatrix({
  month,
  days,
  today,
  rows: serverRows,
  readOnly,
}: {
  /** yyyy-mm */
  month: string;
  days: number;
  today: string;
  /** One row per habit, with a cell for every day of the month. */
  rows: WeekRow[];
  readOnly: boolean;
}) {
  const [rows, applyChange] = useOptimistic<WeekRow[], Change>(serverRows, (state, c) =>
    state.map((r) =>
      r.id !== c.habitId ? r : { ...r, cells: r.cells.map((cell) => (cell.date === c.date ? { ...cell, state: c.state, value: c.value, checked: c.checked, logged: c.logged } : cell)) }
    )
  );
  const [, startTransition] = useTransition();
  const [adjusting, setAdjusting] = useState<{ rowId: number; date: string } | null>(null);
  // Sort by category (grouped under headings) and/or show a single category.
  const [sort, setSort] = useState<"default" | "category">("default");
  const [category, setCategory] = useState<string | null>(null);

  function send(row: WeekRow, date: string, status: "done" | "slipped" | "missed" | "skipped" | "clear", state: DayState, value: number, checked?: string[]) {
    startTransition(async () => {
      applyChange({ habitId: row.id, date, state, value, checked: checked ?? [], logged: status !== "clear" });
      await logHabitAction({ habitId: row.id, date, status, value, checked });
    });
  }

  /** Same tap as the Week grid: plain habits cycle done, slipped, missed, skipped, empty; the rest open a dialog. */
  function onCell(row: WeekRow, cell: WeekRow["cells"][number]) {
    if (readOnly || cell.date > today || cell.state === "off") return;
    if (row.evalType !== "yes_no") {
      setAdjusting({ rowId: row.id, date: cell.date });
      return;
    }
    const next = nextForClick(row, cell);
    const state = next.status === "clear" ? emptyState(row, cell.date, today) : next.state;
    send(row, cell.date, next.status, state, next.value, next.checked);
  }

  const adjustRow = adjusting ? rows.find((r) => r.id === adjusting.rowId) : undefined;
  const adjustCell = adjustRow?.cells.find((c) => c.date === adjusting?.date);

  // "" stands for "no category"; named categories sort A to Z with "no category" last.
  const catOf = (r: WeekRow) => r.categoryName ?? "";
  const categoryChips = (() => {
    const counts = new Map<string, number>();
    for (const r of rows) counts.set(catOf(r), (counts.get(catOf(r)) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => (a[0] === "" ? 1 : b[0] === "" ? -1 : a[0].localeCompare(b[0])));
  })();
  const activeCategory = category !== null && categoryChips.some(([n]) => n === category) ? category : null;
  const shown = rows
    .filter((r) => activeCategory === null || catOf(r) === activeCategory)
    .map((r, i) => ({ r, i }))
    .sort((a, b) => {
      if (sort !== "category") return a.i - b.i;
      const ca = catOf(a.r);
      const cb = catOf(b.r);
      if (ca !== cb) return ca === "" ? 1 : cb === "" ? -1 : ca.localeCompare(cb);
      return a.i - b.i;
    })
    .map((x) => x.r);
  type Item = { kind: "group"; name: string } | { kind: "row"; r: WeekRow };
  const items: Item[] = [];
  shown.forEach((r, i) => {
    if (sort === "category" && activeCategory === null && (i === 0 || catOf(shown[i - 1]) !== catOf(r))) items.push({ kind: "group", name: catOf(r) || "No category" });
    items.push({ kind: "row", r });
  });

  const dayNumbers = Array.from({ length: days }, (_, i) => i + 1);
  const dateOf = (d: number) => `${month}-${String(d).padStart(2, "0")}`;

  // Per-day totals across every habit.
  const perDay = dayNumbers.map((d) => {
    const i = d - 1;
    let completed = 0;
    let counted = 0;
    for (const r of shown) {
      const s = r.cells[i].state;
      if (s === "done") completed += 1;
      if (COUNTED.includes(s)) counted += 1;
    }
    const reached = dateOf(d) <= today;
    return { d, reached, completed, notCompleted: counted - completed, pct: reached && counted > 0 ? Math.round((completed / counted) * 100) : null };
  });
  const doneOf = (r: WeekRow) => r.cells.filter((c) => c.state === "done").length;
  // What the month asks of a habit: its scheduled days, or its period target spread over the month.
  const goalOf = (r: WeekRow) =>
    r.isPeriod ? Math.max(1, Math.round((r.periodTarget * days) / PERIOD_DAYS[r.periodUnit])) : r.cells.filter((c) => c.state !== "off" && c.state !== "prestart" && c.state !== "skipped").length;
  const total = shown.reduce((n, r) => n + doneOf(r), 0);

  const columns = `minmax(6.5rem,12rem) repeat(${days}, minmax(0,1fr)) 2.5rem 2.5rem minmax(5.5rem,8rem) 4.25rem`;
  // Habit rows share whatever height is left (down to nothing), and text and squares scale with the row.
  const rowTemplate = `1.5rem ${items.map((it) => (it.kind === "group" ? "1.15rem" : "minmax(0.9rem,1fr)")).join(" ")} 1.25rem 1.25rem 1.5rem`;
  const summaryRow = items.length + 3; // the header is row 1, habits follow, then the three summary rows

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2">
        <div role="tablist" aria-label="Sort habits" className="flex rounded-full border border-h-border bg-h-surface p-0.5 shadow-sm">
          {(
            [
              { key: "default", label: "Default order" },
              { key: "category", label: "By category" },
            ] as const
          ).map((o) => (
            <button
              key={o.key}
              type="button"
              role="tab"
              aria-selected={sort === o.key}
              onClick={() => setSort(o.key)}
              className={cn("rounded-full px-3 py-1 text-xs font-bold transition-colors", sort === o.key ? "bg-h-brand text-h-brand-fg shadow-sm" : "text-h-muted hover:text-h-fg")}
            >
              {o.label}
            </button>
          ))}
        </div>
        {categoryChips.length > 1 && (
          <div className="scrollbar-hide flex min-w-0 flex-1 gap-1.5 overflow-x-auto" aria-label="Filter by category">
            <button
              type="button"
              onClick={() => setCategory(null)}
              className={cn("shrink-0 rounded-full border px-3 py-1 text-xs font-bold", activeCategory === null ? "border-h-brand bg-h-brand-soft text-h-brand" : "border-h-border bg-h-surface text-h-muted hover:text-h-fg")}
            >
              All <span className="opacity-60">{rows.length}</span>
            </button>
            {categoryChips.map(([name, n]) => (
              <button
                key={name || "none"}
                type="button"
                onClick={() => setCategory(activeCategory === name ? null : name)}
                className={cn("shrink-0 rounded-full border px-3 py-1 text-xs font-bold", activeCategory === name ? "border-h-brand bg-h-brand-soft text-h-brand" : "border-h-border bg-h-surface text-h-muted hover:text-h-fg")}
              >
                {name || "No category"} <span className="opacity-60">{n}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="h-card min-h-0 flex-1 overflow-x-auto p-3 lg:overflow-y-auto">
        <div className="grid h-full min-h-[22rem] min-w-[58rem] gap-y-px lg:min-w-0" style={{ gridTemplateColumns: columns, gridTemplateRows: rowTemplate }}>
          {/* Header */}
          <Cell row={1} className={cn(label, "justify-start px-1", "max-lg:sticky max-lg:left-0 max-lg:z-10 max-lg:bg-h-surface")}>Habit</Cell>
          {dayNumbers.map((d) => (
            <Cell key={d} row={1} className={cn("text-[11px] font-bold tabular-nums", dateOf(d) === today ? "text-h-brand" : "text-h-muted")}>
              <span className={cn("flex items-center justify-center rounded-md px-1", dateOf(d) === today && "bg-h-brand-soft")}>{d}</span>
            </Cell>
          ))}
          <Cell row={1} className={label}>Sum</Cell>
          <Cell row={1} className={label}>Goal</Cell>
          <Cell row={1} className={cn(label, "justify-start px-3")}>Progress</Cell>
          <Cell row={1} className={label}>World</Cell>

          {/* Habit rows */}
          {items.map((it, ii) => {
            if (it.kind === "group") {
              return (
                <Cell key={`g-${it.name}`} row={ii + 2} className={cn(label, "justify-start border-t border-h-border bg-h-surface2/60 px-2 max-lg:sticky max-lg:left-0")} style={{ gridColumn: "1 / -1" }}>
                  {it.name}
                </Cell>
              );
            }
            const r = it.r;
            const ri = ii;
            const hex = colorHex(r.color);
            const done = doneOf(r);
            const goal = goalOf(r);
            const pct = goal > 0 ? Math.min(100, Math.round((done / goal) * 100)) : 0;
            const edge = "border-t border-h-border";
            return (
              <div key={r.id} className="contents">
                <Cell row={ri + 2} className={cn(edge, "justify-start px-1", "max-lg:sticky max-lg:left-0 max-lg:z-10 max-lg:bg-h-surface")}>
                  <Link href={`/habits/${r.id}`} className="flex h-full min-w-0 items-center gap-2" title={r.name}>
                    <span className="flex aspect-square h-[88%] max-h-6 shrink-0 items-center justify-center rounded-lg" style={{ background: tint(hex, 0.15), color: hex }}>
                      <HabitIcon name={r.icon} className="h-3.5 w-3.5" />
                    </span>
                    <span className="truncate font-bold">{r.name}</span>
                  </Link>
                </Cell>
                {r.cells.map((c) => {
                  const tappable = !readOnly && c.date <= today && c.state !== "off";
                  return (
                    <Cell key={c.date} row={ri + 2} className={edge}>
                      {tappable ? (
                        <button
                          type="button"
                          onClick={() => onCell(r, c)}
                          aria-label={`${r.name}, ${c.date}: ${c.state}. Tap to change.`}
                          title={`${c.date} · ${c.state}`}
                          className="flex items-center justify-center rounded-[22%] transition-transform hover:scale-110 active:scale-90"
                        >
                          <Square state={c.state} />
                        </button>
                      ) : (
                        <span title={`${c.date} · ${c.state}`} className="flex items-center justify-center">
                          <Square state={c.state} />
                        </span>
                      )}
                    </Cell>
                  );
                })}
                <Cell row={ri + 2} className={cn(edge, "font-extrabold tabular-nums")}>{done}</Cell>
                <Cell row={ri + 2} className={cn(edge, "font-semibold tabular-nums text-h-muted")}>{goal}</Cell>
                <Cell row={ri + 2} className={cn(edge, "justify-start px-3")}>
                  <div className="flex w-full items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-h-surface2">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 100 ? STATUS_COLOR.done : hex }} />
                    </div>
                    <span className="w-9 text-right text-[0.85em] font-extrabold tabular-nums text-h-muted">{pct}%</span>
                  </div>
                </Cell>
                <Cell row={ri + 2} className={edge}>
                  {r.rank && <RankChip rank={r.rank} className="!px-1 !text-[0.8em]" />}
                </Cell>
              </div>
            );
          })}

          {/* Summary */}
          <Cell row={summaryRow} className={cn(label, "justify-start border-t-2 border-h-border px-1", "max-lg:sticky max-lg:left-0 max-lg:z-10 max-lg:bg-h-surface")}>Completed</Cell>
          {perDay.map((p) => (
            <Cell key={p.d} row={summaryRow} className="border-t-2 border-h-border font-bold tabular-nums">
              {p.reached ? p.completed : <span className="text-h-border">·</span>}
            </Cell>
          ))}
          <Cell row={summaryRow} className="flex-col border-t-2 border-h-border" style={{ gridRow: `${summaryRow} / span 3`, gridColumn: `${days + 2} / ${days + 6}` }}>
            <span className={label}>Total this month</span>
            <span className="text-2xl font-extrabold leading-none tabular-nums">{total}</span>
          </Cell>
          <Cell row={summaryRow + 1} className={cn(label, "justify-start px-1", "max-lg:sticky max-lg:left-0 max-lg:z-10 max-lg:bg-h-surface")}>Not completed</Cell>
          {perDay.map((p) => (
            <Cell key={p.d} row={summaryRow + 1} className="font-semibold tabular-nums text-h-muted">
              {p.reached ? p.notCompleted : ""}
            </Cell>
          ))}
          <Cell row={summaryRow + 2} className={cn(label, "justify-start px-1", "max-lg:sticky max-lg:left-0 max-lg:z-10 max-lg:bg-h-surface")}>Productivity</Cell>
          {perDay.map((p) => (
            <Cell key={p.d} row={summaryRow + 2}>
              {p.pct === null ? (
                <span className="text-h-border">·</span>
              ) : (
                <span className="rounded-md px-1 py-0.5 text-[9px] font-extrabold tabular-nums leading-none xl:text-[10px]" style={pctStyle(p.pct)}>
                  {p.pct}
                </span>
              )}
            </Cell>
          ))}
        </div>
      </div>

      <section className="h-card flex min-h-44 flex-col p-3 lg:h-[27%] lg:min-h-40 lg:shrink-0">
        <div className="flex items-baseline justify-between gap-2 px-1">
          <h2 className="text-sm font-extrabold">Daily completion</h2>
          <ul className="flex flex-wrap items-center justify-end gap-x-3 gap-y-0.5 text-[10px] font-semibold text-h-muted">
            {(["done", "partial", "slipped", "missed", "skipped", "pending"] as const).map((k) => (
              <li key={k} className="flex items-center gap-1 capitalize">
                <span className="h-2 w-2 rounded-sm" style={{ background: STATUS_COLOR[k] }} />
                {k}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative min-h-0 flex-1">
          <div className="absolute inset-0">
            <MonthChart points={perDay.map((p) => ({ day: p.d, pct: p.pct }))} />
          </div>
        </div>
      </section>

      {adjustRow && adjustCell && (
        <ProgressDialog
          name={adjustRow.name}
          dateLabel={parseIso(adjustCell.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          color={adjustRow.color}
          spec={{ evalType: adjustRow.evalType, targetOp: adjustRow.targetOp, dailyTarget: adjustRow.dailyTarget, unit: adjustRow.unit, checklist: adjustRow.checklist }}
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
    </div>
  );
}
