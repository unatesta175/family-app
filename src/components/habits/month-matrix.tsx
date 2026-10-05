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

function Cell({ state }: { state: DayState }) {
  const base = "mx-auto flex h-6 w-6 items-center justify-center rounded-md";
  switch (state) {
    case "done":
      return (
        <span className={base} style={{ background: STATUS_COLOR.done, color: "#fff" }}>
          <Check className="h-3.5 w-3.5" strokeWidth={3.5} />
        </span>
      );
    case "partial":
      return (
        <span className={base} style={{ background: STATUS_COLOR.partial, color: "#fff" }}>
          <Minus className="h-3.5 w-3.5" strokeWidth={3.5} />
        </span>
      );
    case "slipped":
      return (
        <span className={base} style={{ background: STATUS_COLOR.slipped, color: "#fff" }}>
          <X className="h-3.5 w-3.5" strokeWidth={3.5} />
        </span>
      );
    case "missed":
      return (
        <span className={base} style={{ background: tint(STATUS_COLOR.missed, 0.2), color: STATUS_COLOR.missed }}>
          <X className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
      );
    case "skipped":
      return (
        <span className={base} style={{ background: tint(STATUS_COLOR.skipped, 0.25), color: STATUS_COLOR.skipped }}>
          <Minus className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
      );
    case "pending":
    case "flex":
      return <span className={base} style={{ boxShadow: `inset 0 0 0 2px ${STATUS_COLOR.pending}`, background: tint(STATUS_COLOR.pending, 0.08) }} />;
    case "upcoming":
      return <span className={base} style={{ boxShadow: "inset 0 0 0 1px var(--h-border)" }} />;
    default:
      return <span className={base} />;
  }
}

/** Productivity of one day as a coloured pill: green when everything got done, fading to grey. */
function pctStyle(pct: number): React.CSSProperties {
  if (pct >= 100) return { background: STATUS_COLOR.done, color: "#fff" };
  if (pct >= 70) return { background: tint(STATUS_COLOR.done, 0.22), color: STATUS_COLOR.done };
  if (pct >= 40) return { background: tint(STATUS_COLOR.partial, 0.22), color: "#b45309" };
  return { background: "var(--h-surface-2)", color: "var(--h-muted)" };
}

/**
 * The whole month on one screen: a row per habit, a column per day, with each habit's total, goal and
 * progress, then a summary underneath with how many habits got done each day. Cells open that day on
 * the Today page. Pure markup except for the chart.
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
    return { d, completed, notCompleted: counted - completed, pct: reached && counted > 0 ? Math.round((completed / counted) * 100) : null };
  });
  const total = rows.reduce((n, r) => n + r.done, 0);

  const th = "px-0 pb-2 text-center text-[11px] font-bold tabular-nums text-h-muted";

  return (
    <div className="flex flex-col gap-4">
      <div className="h-card overflow-x-auto">
        <table className="w-full min-w-max border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 min-w-44 bg-h-surface px-4 pb-2 pt-3 text-left text-[11px] font-bold uppercase tracking-wide text-h-muted">Habit</th>
              {dayNumbers.map((d) => (
                <th key={d} className={cn(th, "min-w-8 pt-3", dateOf(d) === today && "text-h-brand")}>
                  {d}
                </th>
              ))}
              <th className={cn(th, "min-w-12 pt-3")}>Sum</th>
              <th className={cn(th, "min-w-12 pt-3")}>Goal</th>
              <th className={cn(th, "min-w-40 px-3 pt-3 text-left")}>Progress</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const hex = colorHex(r.color);
              const pct = r.goal > 0 ? Math.min(100, Math.round((r.done / r.goal) * 100)) : 0;
              return (
                <tr key={r.id} className="group">
                  <td className="sticky left-0 z-10 border-t border-h-border bg-h-surface px-4 py-1.5 group-hover:bg-h-surface2">
                    <Link href={`/habits/${r.id}`} className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ background: tint(hex, 0.15), color: hex }}>
                        <HabitIcon name={r.icon} className="h-4 w-4" />
                      </span>
                      <span className="max-w-40 truncate text-[13px] font-bold">{r.name}</span>
                    </Link>
                  </td>
                  {r.states.map((s, i) => (
                    <td key={i} className="border-t border-h-border py-1.5 group-hover:bg-h-surface2">
                      {s === "off" || s === "prestart" ? (
                        <Cell state={s} />
                      ) : (
                        <Link href={`/habits?date=${dateOf(i + 1)}`} aria-label={`${r.name}, ${dateOf(i + 1)}: ${s}`} title={`${dateOf(i + 1)} · ${s}`}>
                          <Cell state={s} />
                        </Link>
                      )}
                    </td>
                  ))}
                  <td className="border-t border-h-border py-1.5 text-center text-[13px] font-extrabold tabular-nums group-hover:bg-h-surface2">{r.done}</td>
                  <td className="border-t border-h-border py-1.5 text-center text-[13px] font-semibold tabular-nums text-h-muted group-hover:bg-h-surface2">{r.goal}</td>
                  <td className="border-t border-h-border px-3 py-1.5 group-hover:bg-h-surface2">
                    <div className="flex items-center gap-2">
                      <div className="h-2 min-w-20 flex-1 overflow-hidden rounded-full bg-h-surface2">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 100 ? STATUS_COLOR.done : hex }} />
                      </div>
                      <span className="w-9 text-right text-[11px] font-extrabold tabular-nums text-h-muted">{pct}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}

            {/* Summary */}
            <tr>
              <td className="sticky left-0 z-10 border-t-2 border-h-border bg-h-surface px-4 pb-1 pt-2.5 text-[11px] font-bold uppercase tracking-wide text-h-muted">Completed</td>
              {perDay.map((p) => (
                <td key={p.d} className="border-t-2 border-h-border pb-1 pt-2.5 text-center text-xs font-bold tabular-nums">
                  {dateOf(p.d) <= today ? p.completed : <span className="text-h-border">·</span>}
                </td>
              ))}
              <td colSpan={3} rowSpan={3} className="border-t-2 border-h-border px-3 text-center align-middle">
                <p className="text-[11px] font-bold uppercase tracking-wide text-h-muted">Total this month</p>
                <p className="text-3xl font-extrabold tabular-nums">{total}</p>
              </td>
            </tr>
            <tr>
              <td className="sticky left-0 z-10 bg-h-surface px-4 py-1 text-[11px] font-bold uppercase tracking-wide text-h-muted">Not completed</td>
              {perDay.map((p) => (
                <td key={p.d} className="py-1 text-center text-xs font-semibold tabular-nums text-h-muted">
                  {dateOf(p.d) <= today ? p.notCompleted : ""}
                </td>
              ))}
            </tr>
            <tr>
              <td className="sticky left-0 z-10 bg-h-surface px-4 pb-3 pt-1 text-[11px] font-bold uppercase tracking-wide text-h-muted">Productivity</td>
              {perDay.map((p) => (
                <td key={p.d} className="pb-3 pt-1 text-center">
                  {p.pct === null ? (
                    <span className="text-h-border">·</span>
                  ) : (
                    <span className="inline-block rounded-md px-1 py-0.5 text-[10px] font-extrabold tabular-nums" style={pctStyle(p.pct)}>
                      {p.pct}
                    </span>
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <section className="h-card p-4">
        <h2 className="mb-1 text-sm font-extrabold">Daily completion</h2>
        <p className="mb-2 text-[11px] text-h-muted">Share of your scheduled habits done each day.</p>
        <MonthChart points={perDay.map((p) => ({ day: p.d, pct: p.pct }))} />
      </section>
    </div>
  );
}
