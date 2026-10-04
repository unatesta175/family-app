import { addDays, parseIso } from "@/lib/date";
import type { StatDay } from "@/lib/habit-insights";

/**
 * The Habit Tower: one tower per habit, built from its check-in history. Every completed date is one
 * identical block (the same gain each day), every month is one floor, and every floor is a ring of
 * 31 date slots, so the same date always sits in the same column. Pure data prep; the 3D scene and
 * the flat fallback both draw from this.
 */

export const SLOTS_PER_FLOOR = 31;

export type SlotKind =
  | "done" // completed: a glowing block
  | "partial" // progress that didn't meet the goal: a half-height block
  | "missed" // missed or slipped: a dark empty slot
  | "skipped" // a deliberate rest day: a frosted block
  | "pending" // today, not logged yet
  | "future" // a date still to come this month: a faint outline
  | "off"; // not part of the habit's history (before it began, or not scheduled)

export type TowerSlot = {
  date: string;
  /** Day of the month, 1-31. Its column on the ring. */
  day: number;
  kind: SlotKind;
  /** Amount logged that day (for numeric / timer habits). */
  value: number;
  /** Part of the current streak: those blocks glow brighter. */
  streak: boolean;
  today: boolean;
};

export type TowerFloor = {
  /** "2026-10". */
  month: string;
  label: string; // "Oct 2026"
  shortLabel: string; // "Oct 26"
  daysInMonth: number;
  slots: TowerSlot[];
  done: number;
  /** Days that counted: done, partial and missed. */
  due: number;
  /** For a finished month: "perfect" (95%+ of due days done) or "strong" (80%+). */
  rating: "perfect" | "strong" | null;
};

export type TowerData = {
  /** Oldest month first (the bottom of the tower). */
  floors: TowerFloor[];
  totalDone: number;
  /** Length of the current streak, in days. */
  streak: number;
  /** Months older than the ones shown, when the history is longer than `maxFloors`. */
  hiddenMonths: number;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => String(n).padStart(2, "0");

function monthKey(date: string): string {
  return date.slice(0, 7);
}

function addMonths(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

function kindOf(state: StatDay[1]): SlotKind {
  switch (state) {
    case "done":
      return "done";
    case "partial":
      return "partial";
    case "missed":
    case "slipped":
      return "missed";
    case "skipped":
      return "skipped";
    case "pending":
    case "flex":
      return "pending";
    case "upcoming":
      return "future";
    default:
      return "off";
  }
}

/**
 * Dates in the current run: walking back from the latest entry, done days continue it; rest days,
 * not-due days and an unfinished today are skipped over; anything else ends it.
 */
function streakDates(days: StatDay[]): Set<string> {
  const run = new Set<string>();
  for (let i = days.length - 1; i >= 0; i--) {
    const [date, state] = days[i];
    if (state === "done") run.add(date);
    else if (state === "skipped" || state === "pending" || state === "flex" || state === "upcoming" || state === "off" || state === "prestart") continue;
    else break;
  }
  return run;
}

export function buildTower(days: StatDay[], startDate: string, today: string, maxFloors = 36): TowerData {
  const byDate = new Map(days.map((d) => [d[0], d]));
  const first = days.length > 0 && days[0][0] < startDate ? days[0][0] : startDate;
  let firstMonth = monthKey(first);
  const lastMonth = monthKey(today);
  if (firstMonth > lastMonth) firstMonth = lastMonth;

  // Only the newest `maxFloors` months are drawn.
  const monthsTotal = (() => {
    const [fy, fm] = firstMonth.split("-").map(Number);
    const [ly, lm] = lastMonth.split("-").map(Number);
    return (ly - fy) * 12 + (lm - fm) + 1;
  })();
  const hiddenMonths = Math.max(0, monthsTotal - maxFloors);
  if (hiddenMonths > 0) firstMonth = addMonths(firstMonth, hiddenMonths);

  const run = streakDates(days);
  const floors: TowerFloor[] = [];
  for (let month = firstMonth; month <= lastMonth; month = addMonths(month, 1)) {
    const [y, m] = month.split("-").map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const slots: TowerSlot[] = [];
    let done = 0;
    let due = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${month}-${pad(day)}`;
      const entry = byDate.get(date);
      const kind: SlotKind = entry ? kindOf(entry[1]) : date > today ? "future" : "off";
      if (kind === "done") done += 1;
      if (kind === "done" || kind === "partial" || kind === "missed") due += 1;
      slots.push({ date, day, kind, value: entry ? entry[2] : 0, streak: run.has(date), today: date === today });
    }
    // A month is only rated once it has finished and had enough due days to mean something.
    const finished = month < lastMonth && due >= 10;
    const rating = finished && done / due >= 0.95 ? "perfect" : finished && done / due >= 0.8 ? "strong" : null;
    floors.push({ month, label: `${MONTHS[m - 1]} ${y}`, shortLabel: `${MONTHS[m - 1]} ${String(y).slice(2)}`, daysInMonth, slots, done, due, rating });
  }

  return {
    floors,
    totalDone: days.reduce((n, d) => n + (d[1] === "done" ? 1 : 0), 0),
    streak: run.size,
    hiddenMonths,
  };
}

/** A friendly date for tooltips: "Wed, Oct 7". */
export function slotDateLabel(date: string): string {
  return parseIso(date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export const SLOT_LABEL: Record<SlotKind, string> = {
  done: "Done",
  partial: "Partly done",
  missed: "Missed",
  skipped: "Skipped",
  pending: "Not logged yet",
  future: "Still to come",
  off: "Not part of this habit",
};

// --- Levels, streak steps and motivation -----------------------------------------------------

export const TOWER_LEVELS = [
  { level: 1, min: 0, name: "Foundation" },
  { level: 2, min: 7, name: "Spark" },
  { level: 3, min: 21, name: "Flame" },
  { level: 4, min: 50, name: "Blaze" },
  { level: 5, min: 100, name: "Beacon" },
  { level: 6, min: 200, name: "Lighthouse" },
  { level: 7, min: 365, name: "Legend" },
] as const;

export type TowerLevel = {
  level: number;
  name: string;
  min: number;
  next: { level: number; name: string; min: number } | null;
  /** Blocks still needed for the next level. */
  toNext: number;
  /** 0-1 progress from this level to the next. */
  progress: number;
};

/** The tower's level, from how many blocks it has. */
export function towerLevel(totalDone: number): TowerLevel {
  let idx = 0;
  TOWER_LEVELS.forEach((l, i) => {
    if (totalDone >= l.min) idx = i;
  });
  const cur = TOWER_LEVELS[idx];
  const next = TOWER_LEVELS[idx + 1] ?? null;
  return {
    level: cur.level,
    name: cur.name,
    min: cur.min,
    next,
    toNext: next ? next.min - totalDone : 0,
    progress: next ? (totalDone - cur.min) / (next.min - cur.min) : 1,
  };
}

export const STREAK_STEPS = [3, 7, 14, 21, 30, 50, 100, 200, 365] as const;

/** The next streak length worth reaching, or null past the last one. */
export function nextStreakStep(streak: number): number | null {
  return STREAK_STEPS.find((s) => s > streak) ?? null;
}

export type Motivation = {
  tone: "start" | "keep" | "recover" | "done" | "celebrate" | "rest";
  headline: string;
  body: string;
  /** Today is waiting to be done: offer a button to go and do it. */
  cta: boolean;
};

/** One honest, encouraging line about what today means for the tower. */
export function motivationFor(data: TowerData, today: string): Motivation {
  const slots = data.floors.flatMap((f) => f.slots);
  const todaySlot = slots.find((s) => s.date === today);
  const yesterday = slots.find((s) => s.date === addDays(today, -1));
  const total = data.totalDone;
  const streak = data.streak;
  const step = nextStreakStep(streak);
  const toStep = step === null ? null : step - streak;

  if (todaySlot?.kind === "done") {
    const hit = (STREAK_STEPS as readonly number[]).includes(streak);
    return hit
      ? { tone: "celebrate", headline: `${streak}-day streak!`, body: `Block #${total} is placed and you just hit a ${streak}-day streak. That is real consistency.`, cta: false }
      : {
          tone: "done",
          headline: `Block #${total} is placed`,
          body: toStep !== null && streak > 0 ? `${streak}-day streak. ${toStep} more day${toStep === 1 ? "" : "s"} to a ${step}-day streak. See you tomorrow.` : "Nicely done. Come back tomorrow to keep building.",
          cta: false,
        };
  }
  if (todaySlot?.kind === "pending") {
    if (total === 0) return { tone: "start", headline: "Place your first block", body: "Every tower begins with one. Complete this habit today and it lights up.", cta: true };
    if (streak > 0) {
      return {
        tone: "keep",
        headline: `Keep your ${streak}-day streak alive`,
        body: toStep !== null ? `Complete today to place block #${total + 1}. You are ${toStep} day${toStep === 1 ? "" : "s"} from a ${step}-day streak.` : `Complete today to place block #${total + 1}.`,
        cta: true,
      };
    }
    return {
      tone: "recover",
      headline: yesterday?.kind === "missed" ? "Fresh start today" : "Build on your tower",
      body: `Place block #${total + 1} and begin a new streak. One missed day never undoes what you have built.`,
      cta: true,
    };
  }
  return { tone: "rest", headline: "Nothing due today", body: total > 0 ? `Your ${total} blocks are safe. The next one is waiting.` : "Your tower starts with the first completed day.", cta: false };
}
