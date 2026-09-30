import { addDays, parseIso } from "@/lib/date";
import type {
  HabitKind,
  HabitSchedule,
  HabitLogStatus,
  TaskRecurrence,
  TaskPriority,
} from "@/lib/db/schema";

/**
 * Pure habit-tracker logic (schedules, day states, streaks, completion rates). No DB access and
 * no server-only imports so it can be shared by server pages and client components alike.
 */

// --- Palette ---------------------------------------------------------------------------------

export const HABIT_COLORS = {
  indigo: "#5b5bf0",
  violet: "#8b5cf6",
  sky: "#0ea5e9",
  teal: "#14b8a6",
  emerald: "#10b981",
  amber: "#f59e0b",
  orange: "#f97316",
  rose: "#f43f5e",
  pink: "#ec4899",
  slate: "#64748b",
} as const;
export type HabitColor = keyof typeof HABIT_COLORS;
export const HABIT_COLOR_KEYS = Object.keys(HABIT_COLORS) as HabitColor[];

export function colorHex(key: string): string {
  return HABIT_COLORS[key as HabitColor] ?? HABIT_COLORS.indigo;
}

/** Hex colour with an alpha channel, e.g. tint("#5b5bf0", 0.12). */
export function tint(hex: string, alpha: number): string {
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${a}`;
}

// --- Types -----------------------------------------------------------------------------------

export type HabitLite = {
  id: number;
  kind: HabitKind;
  schedule: HabitSchedule;
  weekdays: string;
  weeklyTarget: number;
  dailyTarget: number;
  startDate: string;
};

export type LogLite = { status: HabitLogStatus; value: number };
export type HabitLogMap = Record<string, LogLite>; // keyed by yyyy-mm-dd

export type DayState =
  | "done" // target met (or stayed clean)
  | "partial" // counter habit with progress below target
  | "slipped" // broke a break-habit
  | "skipped" // deliberate rest day
  | "missed" // was due, past, nothing logged
  | "pending" // due today, not yet logged
  | "upcoming" // due in the future
  | "flex" // weekly-count habit: any day counts, nothing logged this day
  | "off"; // not scheduled / before the habit started

export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export const WEEKDAY_INITIAL = ["S", "M", "T", "W", "T", "F", "S"] as const;

// --- Dates -----------------------------------------------------------------------------------

/** The 7 dates (Sunday first, matching the prayer history page) of the week containing `dateIso`. */
export function weekDates(dateIso: string): string[] {
  const start = addDays(dateIso, -parseIso(dateIso).getDay());
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function weekStart(dateIso: string): string {
  return addDays(dateIso, -parseIso(dateIso).getDay());
}

export function daysBetween(fromIso: string, toIso: string): number {
  const ms = parseIso(toIso).getTime() - parseIso(fromIso).getTime();
  return Math.round(ms / 86_400_000);
}

export function parseWeekdays(raw: string): number[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s !== "")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
}

export function serializeWeekdays(days: number[]): string {
  return [...new Set(days)].sort((a, b) => a - b).join(",");
}

// --- Habit day state -------------------------------------------------------------------------

export function isDueOn(habit: HabitLite, date: string): boolean {
  if (date < habit.startDate) return false;
  if (habit.schedule === "weekdays") return parseWeekdays(habit.weekdays).includes(parseIso(date).getDay());
  return true; // daily, and weekly_count where any day can count
}

export function isComplete(habit: HabitLite, log: LogLite | undefined): boolean {
  return !!log && log.status === "done" && log.value >= habit.dailyTarget;
}

export function dayState(habit: HabitLite, log: LogLite | undefined, date: string, today: string): DayState {
  if (log?.status === "slipped") return "slipped";
  if (log?.status === "skipped") return "skipped";
  if (log?.status === "done") return log.value >= habit.dailyTarget ? "done" : "partial";
  if (date < habit.startDate) return "off";
  if (habit.schedule === "weekly_count") return date > today ? "upcoming" : "flex";
  if (!isDueOn(habit, date)) return "off";
  if (date > today) return "upcoming";
  return date === today ? "pending" : "missed";
}

/** Done count for the (Sunday-based) week containing `date`. */
export function weekDoneCount(habit: HabitLite, logs: HabitLogMap, date: string): number {
  return weekDates(date).filter((d) => isComplete(habit, logs[d])).length;
}

// --- Streaks ---------------------------------------------------------------------------------

export type StreakResult = { current: number; best: number; unit: "day" | "week" };

const STREAK_HORIZON_DAYS = 800;

export function computeStreak(habit: HabitLite, logs: HabitLogMap, today: string): StreakResult {
  return habit.schedule === "weekly_count"
    ? weeklyStreak(habit, logs, today)
    : dailyStreak(habit, logs, today);
}

function dailyStreak(habit: HabitLite, logs: HabitLogMap, today: string): StreakResult {
  const earliest = addDays(today, -STREAK_HORIZON_DAYS);
  const from = habit.startDate > earliest ? habit.startDate : earliest;

  // Best: walk forward once.
  let best = 0;
  let run = 0;
  for (let d = from; d <= today; d = addDays(d, 1)) {
    if (!isDueOn(habit, d)) continue;
    const s = dayState(habit, logs[d], d, today);
    if (s === "done") {
      run += 1;
      best = Math.max(best, run);
    } else if (s === "skipped" || s === "pending") {
      continue; // neutral: neither extends nor breaks
    } else {
      run = 0;
    }
  }

  // Current: walk backward from today until the first miss.
  let current = 0;
  for (let d = today; d >= from; d = addDays(d, -1)) {
    if (!isDueOn(habit, d)) continue;
    const s = dayState(habit, logs[d], d, today);
    if (s === "done") current += 1;
    else if (s === "skipped" || s === "pending") continue;
    else break;
  }
  return { current, best, unit: "day" };
}

function weeklyStreak(habit: HabitLite, logs: HabitLogMap, today: string): StreakResult {
  const firstWeek = weekStart(habit.startDate);
  const thisWeek = weekStart(today);
  const target = Math.max(1, habit.weeklyTarget);

  const met = (weekStartIso: string) => weekDoneCount(habit, logs, weekStartIso) >= target;

  let best = 0;
  let run = 0;
  for (let w = firstWeek; w <= thisWeek; w = addDays(w, 7)) {
    if (met(w)) {
      run += 1;
      best = Math.max(best, run);
    } else if (w === thisWeek) {
      continue; // current week still in progress
    } else {
      run = 0;
    }
  }

  let current = 0;
  for (let w = thisWeek; w >= firstWeek; w = addDays(w, -7)) {
    if (met(w)) current += 1;
    else if (w === thisWeek) continue;
    else break;
  }
  return { current, best, unit: "week" };
}

// --- Completion rate -------------------------------------------------------------------------

/**
 * Share (0-100) of scheduled opportunities completed in [from, to]. Skipped days are excluded,
 * and today is only counted once it has been completed (so a pending today never hurts the rate).
 * Returns null when the habit had no scheduled opportunities in the range.
 */
export function completionRate(
  habit: HabitLite,
  logs: HabitLogMap,
  from: string,
  to: string,
  today: string
): number | null {
  const start = from < habit.startDate ? habit.startDate : from;
  const end = to > today ? today : to;
  if (start > end) return null;

  if (habit.schedule === "weekly_count") {
    const days = daysBetween(start, end) + 1;
    let done = 0;
    for (let d = start; d <= end; d = addDays(d, 1)) if (isComplete(habit, logs[d])) done += 1;
    const expected = (habit.weeklyTarget * days) / 7;
    if (expected <= 0) return null;
    return Math.round(Math.min(1, done / expected) * 100);
  }

  let due = 0;
  let done = 0;
  for (let d = start; d <= end; d = addDays(d, 1)) {
    if (!isDueOn(habit, d)) continue;
    const s = dayState(habit, logs[d], d, today);
    if (s === "skipped") continue;
    if (s === "pending") continue;
    due += 1;
    if (s === "done") done += 1;
  }
  return due === 0 ? null : Math.round((done / due) * 100);
}

export function totalDone(habit: HabitLite, logs: HabitLogMap): number {
  return Object.values(logs).filter((l) => isComplete(habit, l)).length;
}

/** Combined 0-100 completion for a single day across several habits (null when nothing was due). */
export function dayCompletion(
  habits: HabitLite[],
  logsByHabit: Record<number, HabitLogMap>,
  date: string,
  today: string
): { done: number; due: number } {
  let done = 0;
  let due = 0;
  for (const h of habits) {
    if (h.schedule === "weekly_count") {
      const logs = logsByHabit[h.id] ?? {};
      if (isComplete(h, logs[date])) {
        done += 1;
        due += 1;
      } else if (date === today && date >= h.startDate && weekDoneCount(h, logs, date) < h.weeklyTarget) {
        due += 1; // still owed this week, so it's on today's to-do list
      }
      continue;
    }
    const s = dayState(h, logsByHabit[h.id]?.[date], date, today);
    if (s === "skipped" || s === "off" || s === "upcoming") continue;
    if (s === "pending" && date === today) {
      due += 1;
      continue;
    }
    due += 1;
    if (s === "done") done += 1;
  }
  return { done, due };
}

// --- Tasks -----------------------------------------------------------------------------------

export type TaskLite = {
  id: number;
  recurrence: TaskRecurrence;
  weekdays: string;
  dueDate: string | null;
  completedAt: string | null;
};

/** Does a recurring task occur on `date`? (Single tasks are handled separately.) */
export function recurringTaskOccursOn(task: TaskLite, date: string): boolean {
  if (task.recurrence === "none") return false;
  const anchor = task.dueDate ?? date;
  if (date < anchor) return false;
  const dt = parseIso(date);
  switch (task.recurrence) {
    case "daily":
      return true;
    case "weekly": {
      const days = parseWeekdays(task.weekdays);
      return (days.length ? days : [parseIso(anchor).getDay()]).includes(dt.getDay());
    }
    case "monthly": {
      const anchorDay = parseIso(anchor).getDate();
      const lastDay = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();
      return dt.getDate() === Math.min(anchorDay, lastDay);
    }
    default:
      return false;
  }
}

export function recurrenceLabel(task: { recurrence: TaskRecurrence; weekdays: string; dueDate: string | null }): string {
  switch (task.recurrence) {
    case "daily":
      return "Every day";
    case "weekly": {
      const days = parseWeekdays(task.weekdays);
      const list = days.length ? days : task.dueDate ? [parseIso(task.dueDate).getDay()] : [];
      return list.length ? `Weekly · ${list.map((d) => WEEKDAY_SHORT[d]).join(", ")}` : "Weekly";
    }
    case "monthly":
      return task.dueDate ? `Monthly · day ${parseIso(task.dueDate).getDate()}` : "Monthly";
    default:
      return "One-off";
  }
}

export const PRIORITY_META: Record<TaskPriority, { label: string; color: string }> = {
  high: { label: "High", color: HABIT_COLORS.rose },
  medium: { label: "Medium", color: HABIT_COLORS.amber },
  low: { label: "Low", color: HABIT_COLORS.slate },
};

export function scheduleLabel(h: Pick<HabitLite, "schedule" | "weekdays" | "weeklyTarget">): string {
  if (h.schedule === "daily") return "Every day";
  if (h.schedule === "weekly_count") return `${h.weeklyTarget}× per week`;
  const days = parseWeekdays(h.weekdays);
  if (days.length === 7) return "Every day";
  return days.map((d) => WEEKDAY_SHORT[d]).join(" · ") || "No days";
}
