/**
 * Pure timing logic for prayer reminders: given a profile's prayer times, preferences and the current
 * moment, which reminders are due *right now*. No DB access and no web-push, so the scheduler and the
 * tests share exactly the same maths. The scheduler ticks about once a minute; this decides what to
 * send on each tick, and a dedup log (passed in as `alreadySent`) keeps it idempotent.
 */

import { PRAYER_ORDER } from "@/lib/prayers";
import type { Prayer } from "@/lib/db/schema";
import type { ReminderKind } from "@/lib/db/schema";

export type DueReminder = { prayer: Prayer; kind: ReminderKind; scheduledMs: number };

/** How late a reminder may fire. If the server was down past this, the stale reminder is skipped
 *  rather than pinging someone at an odd hour. */
export const MAX_LATE_MS = 30 * 60 * 1000;

/** A reminder is keyed in the dedup set by prayer and kind. */
export function sendKey(prayer: Prayer, kind: ReminderKind): string {
  return `${prayer}:${kind}`;
}

/** Minute of the day (0-1439) that `ms` falls on in the given IANA timezone. */
export function localMinuteOfDay(ms: number, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(ms));
  const h = Number(parts.find((p) => p.type === "hour")?.value);
  const m = Number(parts.find((p) => p.type === "minute")?.value);
  // Intl can render midnight as "24"; fold it back to 0.
  return ((h % 24) * 60 + m) % 1440;
}

/**
 * Whether `minute` sits inside a quiet-hours window. A window where start <= end is a normal daytime
 * span; start > end wraps past midnight (e.g. 22:00–06:00). start === end is treated as "no window".
 */
export function inQuietHours(minute: number, startMin: number | null, endMin: number | null): boolean {
  if (startMin === null || endMin === null || startMin === endMin) return false;
  return startMin < endMin ? minute >= startMin && minute < endMin : minute >= startMin || minute < endMin;
}

export type ReminderInputs = {
  /** The prayers the profile wants reminders for. */
  prayers: Prayer[];
  /** Today's prayer times, as epoch ms. */
  times: Record<Prayer, number>;
  nowMs: number;
  /** Fire the azan reminder this many minutes before the time (0 = at the time). */
  leadMinutes: number;
  /** Nudge this many minutes after the time if still unlogged (0 = no follow-up). */
  followupMinutes: number;
  quietStartMin: number | null;
  quietEndMin: number | null;
  timezone: string;
  /** Keys (`prayer:kind`) already sent today, so they are never repeated. */
  alreadySent: Set<string>;
  /** Whether a prayer still has no recorded status (drives the follow-up nudge). */
  isUnlogged: (prayer: Prayer) => boolean;
  maxLateMs?: number;
};

/**
 * The reminders that should be sent on this tick: an "azan" reminder at (time − lead), and a
 * "followup" nudge at (time + followup) when the prayer is still unlogged. A reminder fires when its
 * scheduled moment has arrived but is no more than `maxLateMs` stale, it isn't inside quiet hours,
 * and it hasn't already been sent.
 */
export function dueReminders(input: ReminderInputs): DueReminder[] {
  const maxLate = input.maxLateMs ?? MAX_LATE_MS;
  const out: DueReminder[] = [];

  const consider = (prayer: Prayer, kind: ReminderKind, scheduledMs: number) => {
    if (input.alreadySent.has(sendKey(prayer, kind))) return;
    const late = input.nowMs - scheduledMs;
    if (late < 0 || late > maxLate) return;
    if (inQuietHours(localMinuteOfDay(scheduledMs, input.timezone), input.quietStartMin, input.quietEndMin)) return;
    if (kind === "followup" && !input.isUnlogged(prayer)) return;
    out.push({ prayer, kind, scheduledMs });
  };

  for (const prayer of PRAYER_ORDER) {
    if (!input.prayers.includes(prayer)) continue;
    const time = input.times[prayer];
    if (typeof time !== "number") continue;
    consider(prayer, "azan", time - input.leadMinutes * 60_000);
    if (input.followupMinutes > 0) consider(prayer, "followup", time + input.followupMinutes * 60_000);
  }

  return out;
}
