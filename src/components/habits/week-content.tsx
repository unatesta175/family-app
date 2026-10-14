"use client";

import {
  PERIOD_DAYS,
  computeStreak,
  dayState,
  isPeriodHabit,
  parseChecklist,
  periodDoneCount,
  weekDoneCount,
  STATUS_COLOR,
} from "@/lib/habits";
import type { loadHabitData } from "@/lib/habit-data";
import { WeekGrid, type WeekRow } from "@/components/habits/week-grid";
import { Ring } from "@/components/habits/ring";
import { MonthMatrix } from "@/components/habits/month-matrix";
import { HabitHeatCard } from "@/components/habits/habit-heat-card";
import { heatmapWeeks } from "@/lib/habit-stats";
import { habitStandingInput, standingFor } from "@/lib/world-rank";
import { useVisibleHabits } from "@/components/hidden-habits-context";

type HabitData = Awaited<ReturnType<typeof loadHabitData>>;

const HEAT_WEEKS = 26;

const LEGEND = [
  { label: "Done", color: STATUS_COLOR.done },
  { label: "Partial", color: STATUS_COLOR.partial },
  { label: "Slipped", color: STATUS_COLOR.slipped },
  { label: "Missed", color: STATUS_COLOR.missed },
  { label: "Skipped", color: STATUS_COLOR.skipped },
  { label: "Pending", color: STATUS_COLOR.pending },
] as const;

export function WeekContent({
  data,
  view,
  today,
  anchor,
  dates,
  monthKey,
  monthDays,
  monthDates,
}: {
  data: Pick<HabitData, "readOnly" | "habits" | "logsByHabit" | "categories">;
  view: "week" | "month" | "heatmap";
  today: string;
  anchor: string;
  dates: string[];
  monthKey: string;
  monthDays: number;
  monthDates: string[];
}) {
  const { readOnly, logsByHabit, categories } = data;
  const habits = useVisibleHabits(data.habits);
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const monthView = view === "month";
  const heat = view === "heatmap";

  // Each habit's own estimated world standing, shown in the week, month and heatmap views.
  const ranks = new Map(
    habits.map((h) => {
      const s = standingFor(habitStandingInput(h, logsByHabit[h.id] ?? {}, today));
      return [h.id, { top: s.topPercent, tier: s.tier }] as const;
    })
  );
  const buildRow = (h: (typeof habits)[number], ds: string[]): WeekRow => {
    const logs = logsByHabit[h.id] ?? {};
    return {
      id: h.id,
      locked: !!h.systemKey,
      rank: ranks.get(h.id),
      name: h.name,
      kind: h.kind,
      color: h.color,
      icon: h.icon,
      categoryName: h.categoryId ? (categoryName.get(h.categoryId) ?? null) : null,
      evalType: h.evalType,
      targetOp: h.targetOp,
      dailyTarget: h.dailyTarget,
      unit: h.unit,
      checklist: parseChecklist(h.checklist),
      isPeriod: isPeriodHabit(h),
      periodUnit: h.periodUnit,
      periodTarget: h.weeklyTarget,
      periodDone: isPeriodHabit(h) ? periodDoneCount(h, logs, anchor) : 0,
      cells: ds.map((d) => ({
        date: d,
        state: dayState(h, logs, d, today),
        value: logs[d]?.status === "done" ? logs[d].value : 0,
        checked: logs[d]?.status === "done" ? (logs[d].checked ?? []) : [],
        logged: !!logs[d],
      })),
    };
  };

  const rows: WeekRow[] = habits.map((h) => buildRow(h, dates));

  // Week-level score: average of each habit's progress towards what was expected this week.
  let achieved = 0;
  let expected = 0;
  for (const h of habits) {
    const logs = logsByHabit[h.id] ?? {};
    if (isPeriodHabit(h)) {
      // A month/year target is spread evenly over its weeks so the weekly score stays comparable.
      const weekTarget = Math.max(1, Math.ceil((h.weeklyTarget * 7) / PERIOD_DAYS[h.periodUnit]));
      achieved += Math.min(weekTarget, weekDoneCount(h, logs, anchor));
      expected += weekTarget;
    } else {
      for (const d of dates) {
        if (d > today) continue;
        const s = dayState(h, logs, d, today);
        if (s === "off" || s === "skipped" || s === "upcoming" || s === "flex" || s === "prestart") continue;
        expected += 1;
        if (s === "done") achieved += 1;
      }
    }
  }
  const weekPct = expected === 0 ? 0 : Math.round((achieved / expected) * 100);
  const bestStreak = habits.reduce((max, h) => Math.max(max, computeStreak(h, logsByHabit[h.id] ?? {}, today).current), 0);
  const matrixRows: WeekRow[] = monthView ? habits.map((h) => buildRow(h, monthDates)) : [];

  if (rows.length === 0) {
    return (
      <p className="h-card p-6 text-center text-sm text-h-muted">
        No habits yet. Add some from the Today tab to see them here.
      </p>
    );
  }

  if (monthView) {
    return <MonthMatrix month={monthKey} days={monthDays} today={today} rows={matrixRows} readOnly={readOnly} />;
  }

  if (heat) {
    return (
      <>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
          {habits.map((h) => {
            const logs = logsByHabit[h.id] ?? {};
            return (
              <HabitHeatCard
                key={h.id}
                id={h.id}
                name={h.name}
                icon={h.icon}
                color={h.color}
                kind={h.kind}
                weeks={heatmapWeeks(h, logs, HEAT_WEEKS, today)}
                streak={computeStreak(h, logs, today)}
                rank={ranks.get(h.id)}
                today={today}
              />
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 text-[11px] font-medium text-h-muted">
          {LEGEND.map((l) => (
            <span key={l.label} className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded" style={{ background: l.color }} />
              {l.label}
            </span>
          ))}
          <span>· Last {HEAT_WEEKS} weeks, newest on the right. Tap a card for its details.</span>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <div className="h-card flex items-center gap-3 p-3">
          <Ring pct={weekPct} size={52} stroke={6}>
            <span className="text-[11px] font-extrabold tabular-nums">{weekPct}%</span>
          </Ring>
          <div>
            <p className="text-sm font-extrabold leading-tight">Week score</p>
            <p className="text-[11px] text-h-muted">
              {achieved}/{expected} check-ins
            </p>
          </div>
        </div>
        <div className="h-card flex flex-col justify-center p-3">
          <p className="text-2xl font-extrabold leading-none tabular-nums">{bestStreak}</p>
          <p className="mt-1 text-[11px] font-medium text-h-muted">Longest current streak</p>
        </div>
      </div>

      <WeekGrid rows={rows} dates={dates} today={today} readOnly={readOnly} />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 text-[11px] font-medium text-h-muted">
        {LEGEND.map((l) => (
          <span key={l.label} className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded" style={{ background: l.color }} />
            {l.label}
          </span>
        ))}
        {!readOnly && <span>· Tap a day to cycle done → slipped → missed → skipped → pending. Numbers, timers and checklists open a dialog.</span>}
      </div>
    </>
  );
}
