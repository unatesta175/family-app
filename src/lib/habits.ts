import { addDays, isoDate, parseIso } from "@/lib/date";
import type {
  GoalPeriod,
  HabitEvalType,
  HabitKind,
  HabitSchedule,
  HabitLogStatus,
  PeriodUnit,
  TargetOp,
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
  /** For schedule "weekly_count" (some days per period): how many days per `periodUnit`. */
  weeklyTarget: number;
  /** Daily goal: amount (numeric), seconds (timer), item count (checklist); 1 for yes/no. */
  dailyTarget: number;
  startDate: string;
  endDate: string | null;
  evalType: HabitEvalType;
  targetOp: TargetOp;
  flexible: boolean;
  repeatEvery: number;
  alternate: boolean;
  monthDays: string;
  yearDays: string;
  periodUnit: PeriodUnit;
};

export type LogLite = { status: HabitLogStatus; value: number; checked?: string[] };
export type HabitLogMap = Record<string, LogLite>; // keyed by yyyy-mm-dd

export type ChecklistItem = { id: string; title: string };
export type HabitGoal = { period: GoalPeriod; op: Exclude<TargetOp, "any">; value: number };

export type DayState =
  | "done" // target met (or stayed clean)
  | "partial" // progress that doesn't (yet) meet the target
  | "slipped" // broke a break-habit
  | "skipped" // deliberate rest day
  | "missed" // was due, past, nothing logged
  | "pending" // due today, not yet logged
  | "upcoming" // due in the future
  | "flex" // open but not overdue: any-day period habits, or a flexible habit still carrying over
  | "off"; // not scheduled / before the habit started / already handled elsewhere in its window

export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export const WEEKDAY_INITIAL = ["S", "M", "T", "W", "T", "F", "S"] as const;
export const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

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

/** First day of the week / month / year containing `dateIso`. */
export function periodStart(dateIso: string, unit: PeriodUnit): string {
  if (unit === "week") return weekStart(dateIso);
  const dt = parseIso(dateIso);
  return isoDate(new Date(dt.getFullYear(), unit === "month" ? dt.getMonth() : 0, 1));
}

/** Last day (inclusive) of the week / month / year containing `dateIso`. */
export function periodEnd(dateIso: string, unit: PeriodUnit): string {
  if (unit === "week") return addDays(weekStart(dateIso), 6);
  const dt = parseIso(dateIso);
  return isoDate(unit === "month" ? new Date(dt.getFullYear(), dt.getMonth() + 1, 0) : new Date(dt.getFullYear(), 11, 31));
}

function nextPeriodStart(startIso: string, unit: PeriodUnit): string {
  return addDays(periodEnd(startIso, unit), 1);
}

function prevPeriodStart(startIso: string, unit: PeriodUnit): string {
  return periodStart(addDays(startIso, -1), unit);
}

export const PERIOD_DAYS: Record<PeriodUnit, number> = { week: 7, month: 30.4375, year: 365.25 };
export const PERIOD_MAX: Record<PeriodUnit, number> = { week: 7, month: 31, year: 366 };

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

export function parseMonthDays(raw: string): number[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s !== "")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 31);
}

export function serializeMonthDays(days: number[]): string {
  return [...new Set(days)].sort((a, b) => a - b).join(",");
}

/** "MM-DD" keys, e.g. "03-15". Feb 29 is allowed (it lands on Feb 28 in non-leap years). */
export function parseYearDays(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(s));
}

export function serializeYearDays(keys: string[]): string {
  return [...new Set(keys)].sort().join(",");
}

export function yearDayLabel(key: string): string {
  const [m, d] = key.split("-").map(Number);
  return `${d} ${MONTH_SHORT[m - 1] ?? ""}`.trim();
}

export function parseChecklist(raw: string | null | undefined): ChecklistItem[] {
  try {
    const v: unknown = JSON.parse(raw ?? "[]");
    if (!Array.isArray(v)) return [];
    return v.filter(
      (i): i is ChecklistItem => !!i && typeof i.id === "string" && typeof i.title === "string" && i.title.trim() !== ""
    );
  } catch {
    return [];
  }
}

export function parseGoals(raw: string | null | undefined): HabitGoal[] {
  try {
    const v: unknown = JSON.parse(raw ?? "[]");
    if (!Array.isArray(v)) return [];
    return v.filter(
      (g): g is HabitGoal =>
        !!g &&
        ["week", "month", "year", "all_time", "single"].includes(g.period) &&
        ["at_least", "at_most", "exactly"].includes(g.op) &&
        typeof g.value === "number" &&
        Number.isFinite(g.value)
    );
  } catch {
    return [];
  }
}

// --- Targets & formatting --------------------------------------------------------------------

export const OP_LABEL: Record<TargetOp, string> = {
  at_least: "At least",
  at_most: "Less than",
  exactly: "Exactly",
  any: "Any value",
};
const OP_SYMBOL: Record<TargetOp, string> = { at_least: "≥", at_most: "≤", exactly: "=", any: "" };

export const GOAL_PERIOD_LABEL: Record<GoalPeriod, string> = {
  week: "Weekly",
  month: "Monthly",
  year: "Yearly",
  all_time: "All time",
  single: "Single time",
};

/** Does `value` satisfy the habit's daily goal? (Yes/no habits are met by any "done" entry.) */
export function targetMet(
  h: Pick<HabitLite, "evalType" | "targetOp" | "dailyTarget">,
  value: number
): boolean {
  if (h.evalType === "yes_no") return true;
  if (h.evalType === "checklist") return h.dailyTarget > 0 && value >= h.dailyTarget;
  switch (h.targetOp) {
    case "at_least":
      return value >= h.dailyTarget;
    case "at_most":
      return value <= h.dailyTarget;
    case "exactly":
      return Math.abs(value - h.dailyTarget) < 1e-9;
    case "any":
      return value > 0;
  }
}

/** A tidy number: no trailing zeros, at most 2 decimals. */
export function formatNumber(n: number): string {
  return String(Math.round(n * 100) / 100);
}

/** 5400 -> "1h 30m", 90 -> "1m 30s", 0 -> "0s". */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts = [h && `${h}h`, m && `${m}m`, sec && `${sec}s`].filter(Boolean);
  return parts.length ? parts.join(" ") : "0s";
}

/** 3725 -> "1:02:05" — the running-timer readout. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

export function formatAmount(
  h: Pick<HabitLite, "evalType"> & { unit?: string | null },
  value: number
): string {
  if (h.evalType === "timer") return formatDuration(value);
  return `${formatNumber(value)}${h.unit ? ` ${h.unit}` : ""}`;
}

/** "≥ 30 pages", "≤ 2h", "Any amount" — null for yes/no habits. */
export function targetLabel(
  h: Pick<HabitLite, "evalType" | "targetOp" | "dailyTarget"> & { unit?: string | null }
): string | null {
  if (h.evalType === "yes_no") return null;
  if (h.evalType === "checklist") return `${formatNumber(h.dailyTarget)} items`;
  if (h.targetOp === "any") return "Any amount";
  return `${OP_SYMBOL[h.targetOp]} ${formatAmount(h, h.dailyTarget)}`;
}

// --- Schedule --------------------------------------------------------------------------------

export function isPeriodHabit(h: Pick<HabitLite, "schedule">): boolean {
  return h.schedule === "weekly_count";
}

function isLeap(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Pure calendar rule: does this habit's frequency land on `date`? Always false for "some days per
 * period" habits (any day can count) and outside the start/end dates.
 */
export function scheduledOn(h: HabitLite, date: string): boolean {
  if (date < h.startDate || (h.endDate !== null && date > h.endDate)) return false;
  const dt = parseIso(date);
  switch (h.schedule) {
    case "daily":
      return true;
    case "weekdays":
      return parseWeekdays(h.weekdays).includes(dt.getDay());
    case "month_days": {
      const days = parseMonthDays(h.monthDays);
      const last = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();
      // A 31st-of-the-month habit still lands on the last day of shorter months.
      return days.includes(dt.getDate()) || (dt.getDate() === last && days.some((d) => d > last));
    }
    case "year_days": {
      const keys = parseYearDays(h.yearDays);
      const key = `${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
      return keys.includes(key) || (key === "02-28" && !isLeap(dt.getFullYear()) && keys.includes("02-29"));
    }
    case "repeat": {
      const every = Math.max(1, h.repeatEvery);
      const n = daysBetween(h.startDate, date);
      // "Alternate days": N days on, then N days off, repeating.
      return h.alternate ? Math.floor(n / every) % 2 === 0 : n % every === 0;
    }
    case "weekly_count":
      return false;
  }
}

export function isComplete(habit: HabitLite, log: LogLite | undefined): boolean {
  return !!log && log.status === "done" && targetMet(habit, log.value);
}

const FLEX_SCAN_DAYS = 800;

/**
 * Flexible habits carry over: an occurrence stays open from its scheduled day until the next
 * scheduled day. Returns the window [start, endExclusive) that `date` falls in, or null if no
 * occurrence has started yet. endExclusive is null while the window has no upper bound.
 */
function flexWindow(h: HabitLite, date: string): { start: string; endExclusive: string | null } | null {
  let start: string | null = null;
  let d = date;
  for (let i = 0; i <= FLEX_SCAN_DAYS && d >= h.startDate; i++, d = addDays(d, -1)) {
    if (scheduledOn(h, d)) {
      start = d;
      break;
    }
  }
  if (!start) return null;

  let endExclusive: string | null = null;
  d = addDays(start, 1);
  for (let i = 0; i < FLEX_SCAN_DAYS; i++, d = addDays(d, 1)) {
    if (h.endDate !== null && d > h.endDate) break;
    if (scheduledOn(h, d)) {
      endExclusive = d;
      break;
    }
  }
  if (endExclusive === null && h.endDate !== null) endExclusive = addDays(h.endDate, 1);
  return { start, endExclusive };
}

export function dayState(habit: HabitLite, logs: HabitLogMap, date: string, today: string): DayState {
  const log = logs[date];
  if (log?.status === "slipped") return "slipped";
  if (log?.status === "skipped") return "skipped";
  if (log?.status === "missed") return "missed";
  if (log?.status === "done") return targetMet(habit, log.value) ? "done" : "partial";
  if (date < habit.startDate || (habit.endDate !== null && date > habit.endDate)) return "off";

  if (isPeriodHabit(habit)) return date > today ? "upcoming" : "flex";

  if (!habit.flexible) {
    if (!scheduledOn(habit, date)) return "off";
    if (date > today) return "upcoming";
    return date === today ? "pending" : "missed";
  }

  const w = flexWindow(habit, date);
  if (!w) return "off";
  const last = w.endExclusive === null || w.endExclusive > today ? today : addDays(w.endExclusive, -1);
  for (let d = w.start; d <= last; d = addDays(d, 1)) {
    const l = logs[d];
    if (
      l &&
      (l.status === "skipped" || l.status === "slipped" || l.status === "missed" || (l.status === "done" && targetMet(habit, l.value)))
    ) {
      return "off"; // this occurrence was already handled on another day of its window
    }
  }
  const open = w.endExclusive === null || w.endExclusive > today;
  if (open) {
    if (date > today) return date === w.start ? "upcoming" : "off";
    return date === today ? "pending" : "flex";
  }
  return date === w.start ? "missed" : "off";
}

/** Should this habit appear on the day's to-do list / grid? (Anything but "off".) */
export function shownOn(habit: HabitLite, logs: HabitLogMap, date: string, today: string): boolean {
  return dayState(habit, logs, date, today) !== "off";
}

/** Completed days inside the week / month / year containing `date` (for "some days per period" habits). */
export function periodDoneCount(habit: HabitLite, logs: HabitLogMap, date: string): number {
  const from = periodStart(date, habit.periodUnit);
  const to = periodEnd(date, habit.periodUnit);
  let n = 0;
  for (const [d, l] of Object.entries(logs)) if (d >= from && d <= to && isComplete(habit, l)) n += 1;
  return n;
}

/** Done count for the (Sunday-based) week containing `date`. */
export function weekDoneCount(habit: HabitLite, logs: HabitLogMap, date: string): number {
  const days = weekDates(date);
  return days.filter((d) => isComplete(habit, logs[d])).length;
}

// --- Streaks ---------------------------------------------------------------------------------

export type StreakResult = { current: number; best: number; unit: "day" | "week" | "month" | "year" };

/** Compact suffix for a streak length: 5d, 3w, 2m, 1y. */
export const STREAK_UNIT_SHORT: Record<StreakResult["unit"], string> = { day: "d", week: "w", month: "m", year: "y" };

const STREAK_HORIZON_DAYS = 800;

export function computeStreak(habit: HabitLite, logs: HabitLogMap, today: string): StreakResult {
  return isPeriodHabit(habit) ? periodStreak(habit, logs, today) : dayStreak(habit, logs, today);
}

/** A day that can extend or break a streak: scheduled, or any day for a flexible habit. */
export function countsForStreak(habit: HabitLite, d: string): boolean {
  return habit.flexible || scheduledOn(habit, d);
}

function dayStreak(habit: HabitLite, logs: HabitLogMap, today: string): StreakResult {
  const earliest = addDays(today, -STREAK_HORIZON_DAYS);
  const from = habit.startDate > earliest ? habit.startDate : earliest;
  const to = habit.endDate !== null && habit.endDate < today ? habit.endDate : today;

  // Best: walk forward once.
  let best = 0;
  let run = 0;
  for (let d = from; d <= to; d = addDays(d, 1)) {
    if (!countsForStreak(habit, d)) continue;
    const s = dayState(habit, logs, d, today);
    if (s === "done") {
      run += 1;
      best = Math.max(best, run);
    } else if (s === "skipped" || s === "pending" || s === "flex" || s === "off" || s === "upcoming") {
      continue; // neutral: neither extends nor breaks
    } else {
      run = 0;
    }
  }

  // Current: walk backward from the end until the first miss.
  let current = 0;
  for (let d = to; d >= from; d = addDays(d, -1)) {
    if (!countsForStreak(habit, d)) continue;
    const s = dayState(habit, logs, d, today);
    if (s === "done") current += 1;
    else if (s === "skipped" || s === "pending" || s === "flex" || s === "off" || s === "upcoming") continue;
    else break;
  }
  return { current, best, unit: "day" };
}

function periodStreak(habit: HabitLite, logs: HabitLogMap, today: string): StreakResult {
  const unit = habit.periodUnit;
  const firstPeriod = periodStart(habit.startDate, unit);
  const thisPeriod = periodStart(today, unit);
  const target = Math.max(1, habit.weeklyTarget);

  const met = (start: string) => periodDoneCount(habit, logs, start) >= target;

  let best = 0;
  let run = 0;
  for (let p = firstPeriod; p <= thisPeriod; p = nextPeriodStart(p, unit)) {
    if (met(p)) {
      run += 1;
      best = Math.max(best, run);
    } else if (p === thisPeriod) {
      continue; // current period still in progress
    } else {
      run = 0;
    }
  }

  let current = 0;
  for (let p = thisPeriod; p >= firstPeriod; p = prevPeriodStart(p, unit)) {
    if (met(p)) current += 1;
    else if (p === thisPeriod) continue;
    else break;
  }
  return { current, best, unit };
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
  let end = to > today ? today : to;
  if (habit.endDate !== null && habit.endDate < end) end = habit.endDate;
  if (start > end) return null;

  if (isPeriodHabit(habit)) {
    const days = daysBetween(start, end) + 1;
    let done = 0;
    for (const [d, l] of Object.entries(logs)) if (d >= start && d <= end && isComplete(habit, l)) done += 1;
    const expected = (habit.weeklyTarget * days) / PERIOD_DAYS[habit.periodUnit];
    if (expected <= 0) return null;
    return Math.round(Math.min(1, done / expected) * 100);
  }

  let due = 0;
  let done = 0;
  for (let d = start; d <= end; d = addDays(d, 1)) {
    if (!countsForStreak(habit, d)) continue;
    const s = dayState(habit, logs, d, today);
    if (s === "skipped" || s === "pending" || s === "flex" || s === "off" || s === "upcoming") continue;
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
    const logs = logsByHabit[h.id] ?? {};
    if (isPeriodHabit(h)) {
      const active = date >= h.startDate && (h.endDate === null || date <= h.endDate);
      if (isComplete(h, logs[date])) {
        done += 1;
        due += 1;
      } else if (active && date === today && periodDoneCount(h, logs, date) < h.weeklyTarget) {
        due += 1; // still owed this period, so it's on today's to-do list
      }
      continue;
    }
    const s = dayState(h, logs, date, today);
    if (s === "skipped" || s === "off" || s === "upcoming" || s === "flex") continue;
    due += 1;
    if (s === "done") done += 1;
  }
  return { done, due };
}

// --- Extra goals -----------------------------------------------------------------------------

/** The span a goal is measured over, for the day `date` (all-time / single run from the habit's start). */
export function goalRange(h: Pick<HabitLite, "startDate">, period: GoalPeriod, date: string): [string, string] {
  if (period === "week" || period === "month" || period === "year") return [periodStart(date, period), periodEnd(date, period)];
  return [h.startDate, date];
}

/**
 * Progress towards one extra goal as of `date`: the amount logged over the goal's span (week, month,
 * year, all time) or, for "single time", the biggest amount reached in one go (one day).
 */
export function goalProgress(
  h: Pick<HabitLite, "startDate">,
  logs: HabitLogMap,
  goal: HabitGoal,
  date: string
): { current: number; met: boolean } {
  const [from, to] = goalRange(h, goal.period, date);
  let current = 0;
  for (const [d, l] of Object.entries(logs)) {
    if (l.status !== "done" || d < from || d > to) continue;
    current = goal.period === "single" ? Math.max(current, l.value) : current + l.value;
  }
  const met =
    goal.op === "at_least" ? current >= goal.value : goal.op === "at_most" ? current <= goal.value : Math.abs(current - goal.value) < 1e-9;
  return { current, met };
}

/** Higher priority (1 is highest) sorts first; unset (0) sorts last. */
export function priorityRank(priority: number): number {
  return priority > 0 ? priority : Number.MAX_SAFE_INTEGER;
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

const ORDINAL = (n: number) => {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10 > 3 ? 0 : n % 10] ?? "th"}`;
};

export function scheduleLabel(
  h: Pick<
    HabitLite,
    "schedule" | "weekdays" | "weeklyTarget" | "monthDays" | "yearDays" | "periodUnit" | "repeatEvery" | "alternate" | "flexible"
  >
): string {
  let base: string;
  switch (h.schedule) {
    case "daily":
      base = "Every day";
      break;
    case "weekly_count":
      return `${h.weeklyTarget}× per ${h.periodUnit}`;
    case "month_days": {
      const days = parseMonthDays(h.monthDays);
      base = days.length ? `Monthly · ${days.map(ORDINAL).join(", ")}` : "Monthly";
      break;
    }
    case "year_days": {
      const keys = parseYearDays(h.yearDays);
      base = keys.length ? `Yearly · ${keys.map(yearDayLabel).join(", ")}` : "Yearly";
      break;
    }
    case "repeat": {
      const n = Math.max(1, h.repeatEvery);
      if (h.alternate) base = `${n} day${n === 1 ? "" : "s"} on, ${n} off`;
      else base = n === 1 ? "Every day" : n === 2 ? "Every other day" : `Every ${n} days`;
      break;
    }
    default: {
      const days = parseWeekdays(h.weekdays);
      base = days.length === 7 ? "Every day" : days.map((d) => WEEKDAY_SHORT[d]).join(" · ") || "No days";
    }
  }
  return h.flexible ? `${base} · flexible` : base;
}

/** For a flexible habit still carrying over on `date`: the day it was originally scheduled. */
export function carriedFromDate(habit: HabitLite, date: string): string | null {
  if (!habit.flexible || isPeriodHabit(habit)) return null;
  const w = flexWindow(habit, date);
  return w && w.start < date ? w.start : null;
}
