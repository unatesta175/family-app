import { addDays, parseIso } from "@/lib/date";
import {
  dayCompletion,
  dayState,
  isDueOn,
  weekDoneCount,
  weekStart,
  type DayState,
  type HabitLite,
  type HabitLogMap,
} from "@/lib/habits";

export type TrendPoint = { date: string; label: string; pct: number | null; done: number; due: number };

/** Daily completion % across all habits, for the trend chart. Days with nothing due have pct = null. */
export function dailyTrend(
  habits: HabitLite[],
  logsByHabit: Record<number, HabitLogMap>,
  from: string,
  to: string,
  today: string
): TrendPoint[] {
  const out: TrendPoint[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const { done, due } = dayCompletion(habits, logsByHabit, d, today);
    const dt = parseIso(d);
    out.push({
      date: d,
      label: dt.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      pct: due === 0 ? null : Math.round((done / due) * 100),
      done,
      due,
    });
  }
  return out;
}

export type WeekBar = { label: string; done: number; target: number; pct: number };

/** Per-week done vs. expected for the last `weeks` weeks (oldest first), current week included. */
export function weeklyBars(habit: HabitLite, logs: HabitLogMap, weeks: number, today: string): WeekBar[] {
  const thisWeek = weekStart(today);
  const bars: WeekBar[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = addDays(thisWeek, -7 * i);
    let target = 0;
    let done = 0;
    if (habit.schedule === "weekly_count") {
      done = Math.min(habit.weeklyTarget, weekDoneCount(habit, logs, start));
      target = habit.weeklyTarget;
    } else {
      for (let k = 0; k < 7; k++) {
        const d = addDays(start, k);
        if (d > today || !isDueOn(habit, d)) continue;
        const s = dayState(habit, logs[d], d, today);
        if (s === "skipped" || s === "pending") continue;
        target += 1;
        if (s === "done") done += 1;
      }
    }
    const dt = parseIso(start);
    bars.push({
      label: dt.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      done,
      target,
      pct: target === 0 ? 0 : Math.round((done / target) * 100),
    });
  }
  return bars;
}

export type HeatCell = { date: string; state: DayState; value: number };

/** `weeks` columns of 7 days (Sunday first), oldest week first, ending with the current week. */
export function heatmapWeeks(habit: HabitLite, logs: HabitLogMap, weeks: number, today: string): HeatCell[][] {
  const thisWeek = weekStart(today);
  const cols: HeatCell[][] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const start = addDays(thisWeek, -7 * w);
    cols.push(
      Array.from({ length: 7 }, (_, i) => {
        const d = addDays(start, i);
        return { date: d, state: dayState(habit, logs[d], d, today), value: logs[d]?.value ?? 0 };
      })
    );
  }
  return cols;
}
