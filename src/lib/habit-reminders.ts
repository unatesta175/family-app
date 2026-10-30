/**
 * Pure timing logic for habit reminders: given a habit's reminder time and the current moment,
 * whether it's due *right now*. No DB access, so the scheduler and tests share exactly the same
 * maths — mirrors prayer-reminders.ts, but a habit's reminder is a fixed clock time rather than a
 * sun-based one, so there's no times table to compute first.
 */

import { localMinuteOfDay } from "@/lib/prayer-reminders";

/** How late a reminder may fire. If the server was down past this, the stale reminder is skipped
 *  rather than pinging someone at an odd hour. */
export const HABIT_REMINDER_MAX_LATE_MIN = 30;

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Parses a "HH:MM" reminder time into minutes since midnight, or null if malformed. */
export function parseReminderTime(time: string): number | null {
  const m = TIME_RE.exec(time);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

export type HabitReminderInput = {
  /** The habit's reminder time, in minutes since midnight. */
  reminderMinute: number;
  nowMs: number;
  timezone: string;
  /** Whether this habit's reminder already went out today. */
  alreadySent: boolean;
  /** Whether the habit is already done (or skipped) for today. */
  done: boolean;
  maxLateMin?: number;
};

/**
 * Whether a habit's reminder should fire on this tick: its time has arrived but isn't stale, it
 * hasn't already been sent today, and the habit isn't already done.
 */
export function isHabitReminderDue(input: HabitReminderInput): boolean {
  if (input.alreadySent || input.done) return false;
  const nowMinute = localMinuteOfDay(input.nowMs, input.timezone);
  const late = nowMinute - input.reminderMinute;
  return late >= 0 && late <= (input.maxLateMin ?? HABIT_REMINDER_MAX_LATE_MIN);
}
