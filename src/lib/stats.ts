import { PRAYER_ORDER, isPerformed } from "@/lib/prayers";
import type { Prayer, Status } from "@/lib/db/schema";
import type { DayLogMap } from "@/lib/streaks";
import { dayCounts, bestStreak } from "@/lib/streaks";
import { addDays, parseIso } from "@/lib/date";
import type { Tag } from "@/lib/db/repo";

export type StatsRange = "week" | "month" | "all";

export const RANGE_LABEL: Record<StatsRange, string> = {
  week: "Week",
  month: "Month",
  all: "All Time",
};

export function daysBetween(startIso: string, endIso: string): number {
  const ms = parseIso(endIso).getTime() - parseIso(startIso).getTime();
  return Math.round(ms / 86_400_000) + 1;
}

export function rangeDayCount(range: StatsRange, today: string, firstLogDate: string | null): number {
  if (range === "week") return 7;
  if (range === "month") return 30;
  if (!firstLogDate) return 1;
  return Math.max(1, daysBetween(firstLogDate, today));
}

export type DailyPoint = { label: string; count: number; date: string };

export type PeriodStats = {
  series: DailyPoint[];
  chartSeries: DailyPoint[];
  done: number;
  missed: number;
  totalSlots: number;
  successRatePct: number;
  commitmentPct: number;
};

export function computePeriodStats(
  logsByDate: Record<string, DayLogMap>,
  range: StatsRange,
  today: string,
  firstLogDate: string | null
): PeriodStats {
  const days = rangeDayCount(range, today, firstLogDate);
  const series: DailyPoint[] = [];
  let done = 0;
  let missed = 0;

  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    const day = logsByDate[date] ?? {};
    let count = 0;
    for (const prayer of PRAYER_ORDER) {
      const status = day[prayer] ?? "not_yet";
      if (isPerformed(status)) {
        count++;
        done++;
      } else if (status === "missed") {
        missed++;
      }
    }
    series.push({
      date,
      label: parseIso(date).toLocaleDateString("en-US", { day: "numeric" }),
      count,
    });
  }

  const totalSlots = days * PRAYER_ORDER.length;
  const logged = done + missed;
  const successRatePct = logged > 0 ? Math.round((done / logged) * 100) : 0;
  const commitmentPct = totalSlots > 0 ? Math.round((done / totalSlots) * 100) : 0;

  // Cap the chart to the most recent 30 points so "All Time" stays readable.
  const chartSeries = series.length > 30 ? series.slice(series.length - 30) : series;

  return { series, chartSeries, done, missed, totalSlots, successRatePct, commitmentPct };
}

export type LifetimeStats = {
  totalPrayed: number;
  totalPossible: number;
  pct: number;
  pctPrecise: number;
  daysTracked: number;
  perfectDays: number;
};

const DAYS_PER_YEAR = 365;

export function computeLifetimeStats(
  logsByDate: Record<string, DayLogMap>,
  today: string,
  firstLogDate: string | null,
  age: number | null | undefined
): LifetimeStats {
  const daysTracked = firstLogDate ? daysBetween(firstLogDate, today) : 0;
  let totalPrayed = 0;
  let perfectDays = 0;

  for (const day of Object.values(logsByDate)) {
    for (const prayer of PRAYER_ORDER) {
      if (isPerformed(day[prayer] ?? "not_yet")) totalPrayed++;
    }
    if (dayCounts(day)) perfectDays++;
  }

  const totalPossible =
    age != null
      ? Math.max(age * DAYS_PER_YEAR, 1) * PRAYER_ORDER.length
      : Math.max(daysTracked, 1) * PRAYER_ORDER.length;
  const pctPrecise = totalPossible > 0 ? Math.round((totalPrayed / totalPossible) * 1000) / 10 : 0;
  const pct = Math.round(pctPrecise);

  return { totalPrayed, totalPossible, pct, pctPrecise, daysTracked, perfectDays };
}

export type FocusArea = { prayer: Prayer; missed: number; skew: "weekdays" | "weekends" | null };

export function computeFocusArea(logsByDate: Record<string, DayLogMap>): FocusArea | null {
  const missedByPrayer: Record<Prayer, number> = {
    fajr: 0,
    dhuhr: 0,
    asr: 0,
    maghrib: 0,
    isha: 0,
  };
  const weekdayVsWeekend: Record<Prayer, { weekday: number; weekend: number }> = {
    fajr: { weekday: 0, weekend: 0 },
    dhuhr: { weekday: 0, weekend: 0 },
    asr: { weekday: 0, weekend: 0 },
    maghrib: { weekday: 0, weekend: 0 },
    isha: { weekday: 0, weekend: 0 },
  };

  for (const [date, day] of Object.entries(logsByDate)) {
    const dow = parseIso(date).getDay();
    const isWeekend = dow === 0 || dow === 6;
    for (const prayer of PRAYER_ORDER) {
      if ((day[prayer] ?? "not_yet") === "missed") {
        missedByPrayer[prayer]++;
        if (isWeekend) weekdayVsWeekend[prayer].weekend++;
        else weekdayVsWeekend[prayer].weekday++;
      }
    }
  }

  let top: Prayer | null = null;
  for (const prayer of PRAYER_ORDER) {
    if (missedByPrayer[prayer] > 0 && (top === null || missedByPrayer[prayer] > missedByPrayer[top])) {
      top = prayer;
    }
  }
  if (!top) return null;

  const { weekday, weekend } = weekdayVsWeekend[top];
  const skew = weekday === weekend ? null : weekday > weekend ? "weekdays" : "weekends";

  return { prayer: top, missed: missedByPrayer[top], skew };
}

export type RootCause = { tag: Tag; count: number; pct: number };

export function computeRootCauses(
  logsByDate: Record<string, DayLogMap>,
  logTagsMap: Record<string, Tag[]>
): RootCause[] {
  const missedStatuses: Status[] = ["missed", "late", "qada"];
  let totalMissed = 0;
  const counts = new Map<number, { tag: Tag; count: number }>();

  for (const [date, day] of Object.entries(logsByDate)) {
    for (const prayer of PRAYER_ORDER) {
      const status = day[prayer] ?? "not_yet";
      if (!missedStatuses.includes(status)) continue;
      totalMissed++;
      const tagList = logTagsMap[`${date}_${prayer}`] ?? [];
      for (const tag of tagList) {
        const existing = counts.get(tag.id);
        if (existing) existing.count++;
        else counts.set(tag.id, { tag, count: 1 });
      }
    }
  }

  if (totalMissed === 0) return [];

  return Array.from(counts.values())
    .map(({ tag, count }) => ({ tag, count, pct: Math.round((count / totalMissed) * 100) }))
    .sort((a, b) => b.count - a.count);
}

export function firstLogDateOf(logsByDate: Record<string, DayLogMap>): string | null {
  const dates = Object.keys(logsByDate).sort();
  return dates.length > 0 ? dates[0] : null;
}

export type CalendarCell = {
  day: number;
  date: string;
  count: number;
  isToday: boolean;
  hasLog: boolean;
  log: DayLogMap;
};

export type MonthCalendar = {
  label: string;
  leadingBlanks: number;
  cells: CalendarCell[];
  totalPrayed: number;
};

/** Calendar-month grid (Mon-start) for the month `today` falls in, for the heatmap chart view. */
export function computeMonthCalendar(
  logsByDate: Record<string, DayLogMap>,
  today: string,
  offsetMonths = 0
): MonthCalendar {
  const ref = parseIso(today);
  const target = new Date(ref.getFullYear(), ref.getMonth() - offsetMonths, 1);
  const year = target.getFullYear();
  const month = target.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay(); // 0=Sun..6=Sat
  const leadingBlanks = (firstDow + 6) % 7; // Mon-start offset

  const cells: CalendarCell[] = [];
  let totalPrayed = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayLog = logsByDate[date] ?? {};
    let count = 0;
    for (const prayer of PRAYER_ORDER) {
      if (isPerformed(dayLog[prayer] ?? "not_yet")) count++;
    }
    totalPrayed += count;
    cells.push({ day, date, count, isToday: date === today, hasLog: Object.keys(dayLog).length > 0, log: dayLog });
  }

  const label = target.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return { label, leadingBlanks, cells, totalPrayed };
}

export function daysLoggedCount(logsByDate: Record<string, DayLogMap>): number {
  return Object.values(logsByDate).filter((day) => Object.keys(day).length > 0).length;
}

export type PrayerBreakdown = { performed: number; missed: number; pct: number };

/** Lifetime performed/missed counts per prayer, counting only logged (non not_yet) occurrences. */
export function computePrayerBreakdown(
  logsByDate: Record<string, DayLogMap>
): Record<Prayer, PrayerBreakdown> {
  const breakdown: Record<Prayer, PrayerBreakdown> = {
    fajr: { performed: 0, missed: 0, pct: 0 },
    dhuhr: { performed: 0, missed: 0, pct: 0 },
    asr: { performed: 0, missed: 0, pct: 0 },
    maghrib: { performed: 0, missed: 0, pct: 0 },
    isha: { performed: 0, missed: 0, pct: 0 },
  };

  for (const day of Object.values(logsByDate)) {
    for (const prayer of PRAYER_ORDER) {
      const status = day[prayer] ?? "not_yet";
      if (isPerformed(status)) breakdown[prayer].performed++;
      else if (status === "missed") breakdown[prayer].missed++;
    }
  }

  for (const prayer of PRAYER_ORDER) {
    const { performed, missed } = breakdown[prayer];
    const total = performed + missed;
    breakdown[prayer].pct = total > 0 ? Math.round((performed / total) * 100) : 0;
  }

  return breakdown;
}

export type YearBreakdown = { year: string; performed: number; total: number; pct: number };

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInYear(year: number): number {
  return isLeapYear(year) ? 366 : 365;
}

function dayOfYear(iso: string): number {
  const d = parseIso(iso);
  const jan1 = new Date(d.getFullYear(), 0, 1);
  return Math.round((d.getTime() - jan1.getTime()) / 86_400_000) + 1;
}

/** Lifetime prayers performed grouped by calendar year, most recent first. */
export function computeYearlyBreakdown(
  logsByDate: Record<string, DayLogMap>,
  today: string
): YearBreakdown[] {
  const todayYear = parseIso(today).getFullYear();
  const years = new Set<number>();
  for (const date of Object.keys(logsByDate)) years.add(Number(date.slice(0, 4)));
  if (years.size === 0) years.add(todayYear);

  const result: YearBreakdown[] = [];
  for (const year of Array.from(years).sort((a, b) => b - a)) {
    let performed = 0;
    for (const [date, day] of Object.entries(logsByDate)) {
      if (Number(date.slice(0, 4)) !== year) continue;
      for (const prayer of PRAYER_ORDER) {
        if (isPerformed(day[prayer] ?? "not_yet")) performed++;
      }
    }
    const elapsedDays = year === todayYear ? dayOfYear(today) : daysInYear(year);
    const total = elapsedDays * PRAYER_ORDER.length;
    const pct = total > 0 ? Math.round((performed / total) * 100) : 0;
    result.push({ year: `'${String(year).slice(2)}`, performed, total, pct });
  }

  return result;
}

export type WeekRange = { start: string; end: string; label: string };

/** Monday-Sunday week, `offsetWeeks` weeks before the week containing `today` (0 = current week). */
export function computeWeekRange(today: string, offsetWeeks: number): WeekRange {
  const anchor = addDays(today, -offsetWeeks * 7);
  const dow = parseIso(anchor).getDay(); // 0=Sun..6=Sat
  const mondayOffset = (dow + 6) % 7;
  const start = addDays(anchor, -mondayOffset);
  const end = addDays(start, 6);

  const startDate = parseIso(start);
  const endDate = parseIso(end);
  const startMonth = startDate.toLocaleDateString("en-US", { month: "short" });
  const endMonth = endDate.toLocaleDateString("en-US", { month: "short" });
  const label =
    startMonth === endMonth
      ? `${startDate.getDate()} - ${endDate.getDate()}, ${endMonth}`
      : `${startMonth} ${startDate.getDate()} - ${endMonth} ${endDate.getDate()}`;

  return { start, end, label };
}

export function filterLogsByRange(
  logsByDate: Record<string, DayLogMap>,
  start: string,
  end: string
): Record<string, DayLogMap> {
  const result: Record<string, DayLogMap> = {};
  for (const [date, day] of Object.entries(logsByDate)) {
    if (date >= start && date <= end) result[date] = day;
  }
  return result;
}

function countPerformed(logsByDate: Record<string, DayLogMap>): number {
  let count = 0;
  for (const day of Object.values(logsByDate)) {
    for (const prayer of PRAYER_ORDER) {
      if (isPerformed(day[prayer] ?? "not_yet")) count++;
    }
  }
  return count;
}

export type WeekStats = {
  performed: number;
  missed: number;
  pending: number;
  totalSlots: number;
  pct: number;
  bestStreak: number;
  hasData: boolean;
  previousPerformed: number;
};

export function computeWeekStats(
  logsByDate: Record<string, DayLogMap>,
  range: WeekRange
): WeekStats {
  const weekLogs = filterLogsByRange(logsByDate, range.start, range.end);

  let performed = 0;
  let missed = 0;
  for (const day of Object.values(weekLogs)) {
    for (const prayer of PRAYER_ORDER) {
      const status = day[prayer] ?? "not_yet";
      if (isPerformed(status)) performed++;
      else if (status === "missed") missed++;
    }
  }

  const totalSlots = 7 * PRAYER_ORDER.length;
  const pending = totalSlots - performed - missed;
  const pct = totalSlots > 0 ? Math.round((performed / totalSlots) * 100) : 0;
  const hasData = performed + missed > 0;

  const prevStart = addDays(range.start, -7);
  const prevEnd = addDays(range.end, -7);
  const previousPerformed = countPerformed(filterLogsByRange(logsByDate, prevStart, prevEnd));

  return {
    performed,
    missed,
    pending,
    totalSlots,
    pct,
    bestStreak: bestStreak(weekLogs),
    hasData,
    previousPerformed,
  };
}

export type RangeStats = WeekStats & { days: number };

/** Same shape as computeWeekStats, but for an arbitrary custom [start, end] date range. */
export function computeRangeStats(
  logsByDate: Record<string, DayLogMap>,
  start: string,
  end: string
): RangeStats {
  const days = Math.max(1, daysBetween(start, end));
  const rangeLogs = filterLogsByRange(logsByDate, start, end);

  let performed = 0;
  let missed = 0;
  for (const day of Object.values(rangeLogs)) {
    for (const prayer of PRAYER_ORDER) {
      const status = day[prayer] ?? "not_yet";
      if (isPerformed(status)) performed++;
      else if (status === "missed") missed++;
    }
  }

  const totalSlots = days * PRAYER_ORDER.length;
  const pending = totalSlots - performed - missed;
  const pct = totalSlots > 0 ? Math.round((performed / totalSlots) * 100) : 0;
  const hasData = performed + missed > 0;

  const prevEnd = addDays(start, -1);
  const prevStart = addDays(prevEnd, -(days - 1));
  const previousPerformed = countPerformed(filterLogsByRange(logsByDate, prevStart, prevEnd));

  return {
    days,
    performed,
    missed,
    pending,
    totalSlots,
    pct,
    bestStreak: bestStreak(rangeLogs),
    hasData,
    previousPerformed,
  };
}
