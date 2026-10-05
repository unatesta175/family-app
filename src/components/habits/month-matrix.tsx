import Link from "next/link";
import { Check, Minus, X } from "lucide-react";
import { HabitIcon } from "@/components/habits/habit-icon";
import { MonthChart } from "@/components/habits/month-chart";
import { STATUS_COLOR, colorHex, tint, type DayState } from "@/lib/habits";
import { cn } from "@/lib/utils";

export type MatrixRow = {
  id: number;
  name: string;
  icon: string;
  color: string;
  kind: "build" | "break";
  /** One state per day of the month, in order. */
  states: DayState[];
  done: number;
  /** What the month asks of this habit: its scheduled days (or the period target, spread over the month). */
  goal: number;
};

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
function Cell({ children, className, style }: { children?: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={cn("flex min-h-0 min-w-0 items-center justify-center", className)} style={{ containerType: "size", fontSize: "clamp(8px, 58cqh, 13px)", ...style }}>
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
  rows,
}: {
  /** yyyy-mm */
  month: string;
  days: number;
  today: string;
  rows: MatrixRow[];
}) {
  const dayNumbers = Array.from({ length: days }, (_, i) => i + 1);
  const dateOf = (d: number) => `${month}-${String(d).padStart(2, "0")}`;

  // Per-day totals across every habit.
  const perDay = dayNumbers.map((d) => {
    const i = d - 1;
    let completed = 0;
    let counted = 0;
    for (const r of rows) {
      const s = r.states[i];
      if (s === "done") completed += 1;
      if (COUNTED.includes(s)) counted += 1;
    }
    const reached = dateOf(d) <= today;
    return { d, reached, completed, notCompleted: counted - completed, pct: reached && counted > 0 ? Math.round((completed / counted) * 100) : null };
  });
  const total = rows.reduce((n, r) => n + r.done, 0);

  const columns = `minmax(7.5rem,12rem) repeat(${days}, minmax(0,1fr)) 2.5rem 2.5rem minmax(5.5rem,8rem)`;
  // Habit rows share whatever height is left (down to nothing), and text and squares scale with the row.
  const rowTemplate = `1.5rem repeat(${rows.length}, minmax(0,1fr)) 1.25rem 1.25rem 1.5rem`;
  const summaryRow = rows.length + 3; // the header is row 1, habits follow, then the three summary rows

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="h-card min-h-0 flex-1 overflow-x-auto p-3 lg:overflow-hidden">
        <div className="grid h-full min-h-[22rem] min-w-[58rem] gap-y-px lg:min-h-0 lg:min-w-0" style={{ gridTemplateColumns: columns, gridTemplateRows: rowTemplate }}>
          {/* Header */}
          <Cell className={cn(label, "justify-start px-1")}>Habit</Cell>
          {dayNumbers.map((d) => (
            <Cell key={d} className={cn("text-[11px] font-bold tabular-nums", dateOf(d) === today ? "text-h-brand" : "text-h-muted")}>
              <span className={cn("flex items-center justify-center rounded-md px-1", dateOf(d) === today && "bg-h-brand-soft")}>{d}</span>
            </Cell>
          ))}
          <Cell className={label}>Sum</Cell>
          <Cell className={label}>Goal</Cell>
          <Cell className={cn(label, "justify-start px-3")}>Progress</Cell>

          {/* Habit rows */}
          {rows.map((r) => {
            const hex = colorHex(r.color);
            const pct = r.goal > 0 ? Math.min(100, Math.round((r.done / r.goal) * 100)) : 0;
            const edge = "border-t border-h-border";
            return (
              <div key={r.id} className="contents">
                <Cell className={cn(edge, "justify-start px-1")}>
                  <Link href={`/habits/${r.id}`} className="flex h-full min-w-0 items-center gap-2" title={r.name}>
                    <span className="flex aspect-square h-[88%] max-h-6 shrink-0 items-center justify-center rounded-lg" style={{ background: tint(hex, 0.15), color: hex }}>
                      <HabitIcon name={r.icon} className="h-3.5 w-3.5" />
                    </span>
                    <span className="truncate font-bold">{r.name}</span>
                  </Link>
                </Cell>
                {r.states.map((s, i) => (
                  <Cell key={i} className={edge}>
                    {s === "off" || s === "prestart" ? (
                      <Square state={s} />
                    ) : (
                      <Link href={`/habits?date=${dateOf(i + 1)}`} aria-label={`${r.name}, ${dateOf(i + 1)}: ${s}`} title={`${dateOf(i + 1)} · ${s}`} className="flex items-center justify-center">
                        <Square state={s} />
                      </Link>
                    )}
                  </Cell>
                ))}
                <Cell className={cn(edge, "font-extrabold tabular-nums")}>{r.done}</Cell>
                <Cell className={cn(edge, "font-semibold tabular-nums text-h-muted")}>{r.goal}</Cell>
                <Cell className={cn(edge, "justify-start px-3")}>
                  <div className="flex w-full items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-h-surface2">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 100 ? STATUS_COLOR.done : hex }} />
                    </div>
                    <span className="w-9 text-right text-[0.85em] font-extrabold tabular-nums text-h-muted">{pct}%</span>
                  </div>
                </Cell>
              </div>
            );
          })}

          {/* Summary */}
          <Cell className={cn(label, "justify-start border-t-2 border-h-border px-1")}>Completed</Cell>
          {perDay.map((p) => (
            <Cell key={p.d} className="border-t-2 border-h-border text-xs font-bold tabular-nums">
              {p.reached ? p.completed : <span className="text-h-border">·</span>}
            </Cell>
          ))}
          <Cell className="flex-col border-t-2 border-h-border" style={{ gridRow: `${summaryRow} / span 3`, gridColumn: `${days + 2} / ${days + 5}` }}>
            <span className={label}>Total this month</span>
            <span className="text-2xl font-extrabold leading-none tabular-nums">{total}</span>
          </Cell>
          <Cell className={cn(label, "justify-start px-1")}>Not completed</Cell>
          {perDay.map((p) => (
            <Cell key={p.d} className="text-xs font-semibold tabular-nums text-h-muted">
              {p.reached ? p.notCompleted : ""}
            </Cell>
          ))}
          <Cell className={cn(label, "justify-start px-1")}>Productivity</Cell>
          {perDay.map((p) => (
            <Cell key={p.d}>
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

      <section className="h-card flex min-h-44 flex-col p-3 lg:h-[24%] lg:min-h-28 lg:shrink-0">
        <div className="flex items-baseline justify-between gap-2 px-1">
          <h2 className="text-sm font-extrabold">Daily completion</h2>
          <p className="text-[11px] text-h-muted">Share of your scheduled habits done each day</p>
        </div>
        <div className="min-h-0 flex-1">
          <MonthChart points={perDay.map((p) => ({ day: p.d, pct: p.pct }))} />
        </div>
      </section>
    </div>
  );
}
