import { PRAYER_ORDER, isPerformed } from "@/lib/prayers";
import type { Status, Prayer } from "@/lib/db/schema";
import { addDays } from "@/lib/date";

export type DayLogMap = Partial<Record<Prayer, Status>>;

/** A day counts toward a streak only if every prayer was actually performed. */
export function dayCounts(day: DayLogMap): boolean {
  return PRAYER_ORDER.every((p) => isPerformed(day[p] ?? "not_yet"));
}

export function dayCompletionPct(day: DayLogMap): number {
  const performed = PRAYER_ORDER.filter((p) => isPerformed(day[p] ?? "not_yet")).length;
  return Math.round((performed / PRAYER_ORDER.length) * 100);
}

/**
 * logsByDate: map of iso date -> that day's prayer statuses.
 * today: iso date to walk backward from (inclusive).
 * Walking stops at the first day that doesn't count, EXCEPT today itself is
 * allowed to be incomplete (still in progress) without breaking the streak.
 */
export function currentStreak(logsByDate: Record<string, DayLogMap>, today: string): number {
  let streak = 0;
  let cursor = today;

  for (let i = 0; i < 3650; i++) {
    const day = logsByDate[cursor];
    const counts = day ? dayCounts(day) : false;

    if (counts) {
      streak++;
    } else if (cursor === today) {
      // today may still be in progress; don't break the streak on it alone
    } else {
      break;
    }

    cursor = addDays(cursor, -1);
  }

  return streak;
}

/** Length of the consecutive full-day streak ending on (and including) `date`, walking backward. */
export function streakLengthEndingOn(logsByDate: Record<string, DayLogMap>, date: string): number {
  let streak = 0;
  let cursor = date;

  for (let i = 0; i < 3650; i++) {
    const day = logsByDate[cursor];
    if (!day || !dayCounts(day)) break;
    streak++;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

export function bestStreak(logsByDate: Record<string, DayLogMap>): number {
  const dates = Object.keys(logsByDate).sort();
  if (dates.length === 0) return 0;

  let best = 0;
  let running = 0;
  let prevDate: string | null = null;

  for (const date of dates) {
    const counts = dayCounts(logsByDate[date]);
    const isConsecutive = prevDate === null || addDays(prevDate, 1) === date;

    if (counts) {
      running = isConsecutive ? running + 1 : 1;
      best = Math.max(best, running);
    } else {
      running = 0;
    }
    prevDate = date;
  }

  return best;
}
