/**
 * Proactive prayer insights: turns the logs you already have into a short, prioritised list of things
 * worth acting on — a streak about to break, the prayer that slips most, the weekday that lets you
 * down, a plan to clear qada, and encouragement when you're improving. Pure and offline, so it drives
 * both the UI and the tests. Descriptive aggregates live in `stats.ts`; this layer is about "so what".
 */

import { addDays } from "@/lib/date";
import { isPerformed } from "@/lib/prayers";
import type { Prayer, Status } from "@/lib/db/schema";

export type DayLogMap = Partial<Record<Prayer, Status>>;

const PRAYER_ORDER: Prayer[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
const PRAYER_LABEL: Record<Prayer, string> = { fajr: "Fajr", dhuhr: "Dhuhr", asr: "Asr", maghrib: "Maghrib", isha: "Isha" };
const WEEKDAY_LABEL = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];

export type InsightSeverity = "critical" | "warning" | "info" | "positive";
export type PrayerInsight = { key: string; title: string; detail: string; severity: InsightSeverity };

/** How many of the five prayers were performed on a day (excused and qada count as performed). */
function performedCount(day: DayLogMap): number {
  return PRAYER_ORDER.filter((p) => isPerformed(day[p] ?? "not_yet")).length;
}

/** Performed rate (0-1) per prayer over the given days, plus the day count that fed it. */
export function prayerPerformedRates(logsByDate: Record<string, DayLogMap>): { rates: Record<Prayer, number>; days: number } {
  const totals = Object.fromEntries(PRAYER_ORDER.map((p) => [p, 0])) as Record<Prayer, number>;
  const dates = Object.keys(logsByDate);
  for (const d of dates) {
    for (const p of PRAYER_ORDER) if (isPerformed(logsByDate[d][p] ?? "not_yet")) totals[p] += 1;
  }
  const rates = Object.fromEntries(PRAYER_ORDER.map((p) => [p, dates.length ? totals[p] / dates.length : 0])) as Record<Prayer, number>;
  return { rates, days: dates.length };
}

/** The prayer performed least often — the one to focus on. Null until there's a week of data. */
export function weakestPrayer(logsByDate: Record<string, DayLogMap>): { prayer: Prayer; rate: number } | null {
  const { rates, days } = prayerPerformedRates(logsByDate);
  if (days < 7) return null;
  let worst: Prayer = PRAYER_ORDER[0];
  for (const p of PRAYER_ORDER) if (rates[p] < rates[worst]) worst = p;
  // Only worth flagging if it's actually lagging and not already near-perfect.
  if (rates[worst] >= 0.95) return null;
  return { prayer: worst, rate: rates[worst] };
}

/** The weekday with the lowest average completion. Null until most weekdays have at least one sample. */
export function weakestWeekday(logsByDate: Record<string, DayLogMap>): { weekday: number; pct: number } | null {
  const sum = Array(7).fill(0) as number[];
  const n = Array(7).fill(0) as number[];
  for (const [date, day] of Object.entries(logsByDate)) {
    const wd = new Date(date + "T00:00:00Z").getUTCDay();
    sum[wd] += performedCount(day) / PRAYER_ORDER.length;
    n[wd] += 1;
  }
  if (n.filter((c) => c > 0).length < 5) return null;
  let worst = -1;
  let worstAvg = 2;
  for (let wd = 0; wd < 7; wd += 1) {
    if (n[wd] === 0) continue;
    const avg = sum[wd] / n[wd];
    if (avg < worstAvg) {
      worstAvg = avg;
      worst = wd;
    }
  }
  if (worst === -1 || worstAvg >= 0.9) return null;
  return { weekday: worst, pct: Math.round(worstAvg * 100) };
}

/** Average completion (0-1) over the `days` days ending on `today`. */
function recentCompletion(logsByDate: Record<string, DayLogMap>, today: string, days: number): number {
  let sum = 0;
  for (let i = 0; i < days; i += 1) {
    const day = logsByDate[addDays(today, -i)];
    sum += day ? performedCount(day) / PRAYER_ORDER.length : 0;
  }
  return sum / days;
}

export type InsightInput = {
  logsByDate: Record<string, DayLogMap>;
  today: string;
  /** The live streak (full days in a row), used for the "about to break" warning. */
  streak: number;
  /** Prayers still unlogged/not-performed today (windows may still be open). */
  remainingToday: number;
  /** Outstanding qada prayers owed. */
  qadaOwed: number;
};

/**
 * The prioritised insights for a profile: most actionable first (a streak at risk), then patterns to
 * fix, then a qada plan, then encouragement. Each is a short, specific, do-this-now line.
 */
export function buildInsights(input: InsightInput): PrayerInsight[] {
  const out: PrayerInsight[] = [];

  // 1. Streak at risk — the most time-sensitive nudge.
  if (input.streak >= 3 && input.remainingToday > 0) {
    out.push({
      key: "streak-risk",
      title: `Protect your ${input.streak}-day streak`,
      detail: `${input.remainingToday} prayer${input.remainingToday === 1 ? "" : "s"} left today. Keep it going.`,
      severity: "warning",
    });
  }

  // 2. Weakest prayer.
  const weak = weakestPrayer(input.logsByDate);
  if (weak) {
    out.push({
      key: "weakest-prayer",
      title: `${PRAYER_LABEL[weak.prayer]} needs attention`,
      detail: `You perform ${PRAYER_LABEL[weak.prayer]} about ${Math.round(weak.rate * 100)}% of the time — your lowest. A reminder for it could help.`,
      severity: "info",
    });
  }

  // 3. Weekday pattern.
  const wd = weakestWeekday(input.logsByDate);
  if (wd) {
    out.push({
      key: "weekday-pattern",
      title: `${WEEKDAY_LABEL[wd.weekday]} are your hardest`,
      detail: `Completion drops to about ${wd.pct}% on ${WEEKDAY_LABEL[wd.weekday]}. Plan ahead for them.`,
      severity: "info",
    });
  }

  // 4. Qada plan — a concrete burn-down.
  if (input.qadaOwed > 0) {
    const weeks = Math.ceil(input.qadaOwed / 7);
    out.push({
      key: "qada-plan",
      title: `Clear your ${input.qadaOwed} qada`,
      detail: `Make up just one a day and you'll be clear in ${input.qadaOwed} day${input.qadaOwed === 1 ? "" : "s"} (about ${weeks} week${weeks === 1 ? "" : "s"}).`,
      severity: "info",
    });
  }

  // 5. Momentum — encouragement when the last 7 days beat the previous 7.
  const last7 = recentCompletion(input.logsByDate, input.today, 7);
  const prev7 = recentCompletion(input.logsByDate, addDays(input.today, -7), 7);
  if (last7 >= 0.1 && last7 > prev7 + 0.1) {
    out.push({
      key: "momentum",
      title: "You're on the up",
      detail: `This week's completion (${Math.round(last7 * 100)}%) is up from ${Math.round(prev7 * 100)}% last week. Keep the momentum.`,
      severity: "positive",
    });
  }

  return out;
}
