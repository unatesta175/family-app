import { addDays } from "@/lib/date";
import {
  completionRate,
  countsForStreak,
  dayState,
  isPeriodHabit,
  type DayState,
  type HabitLite,
  type HabitLogMap,
  type StreakResult,
} from "@/lib/habits";

/**
 * Numbers behind a habit's Statistics tab. Pure functions (no DB, no server-only imports): the server
 * builds the compact per-day history and the score, the client slices it any way the charts need.
 */

/** One day of history: [yyyy-mm-dd, state, amount logged (0 unless the day has a "done" entry)]. */
export type StatDay = [date: string, state: DayState, value: number];

const MAX_HISTORY_DAYS = 1830; // ~5 years

/** Every day from the habit's start to today (or its end date) that isn't simply "off". */
export function buildStatDays(habit: HabitLite, logs: HabitLogMap, today: string): StatDay[] {
  const end = habit.endDate !== null && habit.endDate < today ? habit.endDate : today;
  const earliest = addDays(today, -MAX_HISTORY_DAYS);
  const from = habit.startDate > earliest ? habit.startDate : earliest;
  const out: StatDay[] = [];
  for (let d = from; d <= end; d = addDays(d, 1)) {
    const state = dayState(habit, logs, d, today);
    if (state === "off") continue;
    const log = logs[d];
    out.push([d, state, log?.status === "done" ? log.value : 0]);
  }
  return out;
}

const SCORE_DECAY = 0.95;

/**
 * Habit score, 0-100: a running average over the days the habit was due, weighting recent days more.
 * It climbs slowly with consistency (about 30% after a week of streak, ~80% after a month) and drops
 * when days are missed. "Some days per period" habits use their completion rate over the last 90 days.
 */
export function habitScore(habit: HabitLite, logs: HabitLogMap, today: string, asOf: string = today): number {
  if (isPeriodHabit(habit)) {
    return completionRate(habit, logs, addDays(asOf, -89), asOf, asOf) ?? 0;
  }
  const earliest = addDays(asOf, -MAX_HISTORY_DAYS);
  const from = habit.startDate > earliest ? habit.startDate : earliest;
  const to = habit.endDate !== null && habit.endDate < asOf ? habit.endDate : asOf;
  let score = 0;
  for (let d = from; d <= to; d = addDays(d, 1)) {
    if (!countsForStreak(habit, d)) continue;
    const s = dayState(habit, logs, d, asOf);
    if (s === "skipped" || s === "pending" || s === "flex" || s === "off" || s === "upcoming") continue;
    score = score * SCORE_DECAY + (s === "done" ? 1 : 0) * (1 - SCORE_DECAY);
  }
  return Math.round(score * 100);
}

export function scoreLabel(score: number): string {
  if (score >= 80) return "Rock solid";
  if (score >= 55) return "Strong";
  if (score >= 25) return "Building";
  return "Just starting";
}

/** Streak badges, in the unit the habit's streak is measured in. */
export const STREAK_MILESTONES: Record<StreakResult["unit"], number[]> = {
  day: [1, 7, 15, 30, 60, 100, 200, 365],
  week: [1, 2, 4, 8, 12, 26, 52],
  month: [1, 3, 6, 12, 24],
  year: [1, 2, 3, 5, 10],
};

export const STREAK_UNIT_NAME: Record<StreakResult["unit"], string> = {
  day: "day",
  week: "week",
  month: "month",
  year: "year",
};
