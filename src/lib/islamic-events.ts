/**
 * The Islamic-events engine: given a Gregorian day, which sacred days and recommended observances fall
 * on it (derived from the Hijri date in `hijri.ts`), plus what's coming up. Pure and offline — no DB,
 * no network — so the UI, reminders and tests all read the same calendar.
 *
 * Hijri dates come from the tabular Kuwaiti algorithm, accurate to within ~1 day of local moon-sighting
 * announcements, so treat these as a guide rather than a moon-sighting ruling.
 */

import { toHijri, type HijriDate } from "@/lib/hijri";

export type EventCategory = "celebration" | "fasting" | "virtue";

export type IslamicEventKey =
  | "jummah"
  | "ramadan"
  | "laylat_al_qadr"
  | "eid_al_fitr"
  | "dhul_hijjah_first10"
  | "arafah"
  | "eid_al_adha"
  | "tashriq"
  | "islamic_new_year"
  | "ashura"
  | "ayyam_al_beed";

export type IslamicEvent = {
  key: IslamicEventKey;
  name: string;
  /** One short line for a card or notification. */
  blurb: string;
  category: EventCategory;
  /** True when the day is a recommended (or, for Ramadan, obligatory) fasting day. */
  fasting: boolean;
  /** Fasting Arafah / Ashura / Eid days is forbidden — surfaced so the UI never nudges a fast then. */
  noFast?: boolean;
};

/** The weekday of `date` (0 = Sunday … 5 = Friday) in local time, matching how dates are shown. */
function weekday(date: Date): number {
  return date.getDay();
}

/**
 * Every event active on `date`. Weekly observances (Jummah) and monthly ones (the white days) sit
 * alongside the annual sacred days. Order is roughly most-significant first.
 */
export function eventsOn(date: Date): IslamicEvent[] {
  const h = toHijri(date);
  const out: IslamicEvent[] = [];

  // --- Annual sacred days ---------------------------------------------------------------------
  // Muharram
  if (h.month === 1 && h.day === 1) {
    out.push({ key: "islamic_new_year", name: "Islamic New Year", blurb: `1 Muharram ${h.year} AH — a new Hijri year begins.`, category: "celebration", fasting: false });
  }
  if (h.month === 1 && h.day === 10) {
    out.push({ key: "ashura", name: "Day of Ashura", blurb: "The 10th of Muharram — a highly recommended day to fast.", category: "fasting", fasting: true });
  }

  // Ramadan (whole month) + Laylat al-Qadr (likely on the odd nights of the last ten)
  if (h.month === 9) {
    out.push({ key: "ramadan", name: "Ramadan", blurb: `Day ${h.day} of Ramadan — the month of fasting and the Qur'an.`, category: "fasting", fasting: true });
    if (h.day >= 21 && h.day % 2 === 1) {
      out.push({ key: "laylat_al_qadr", name: "Laylat al-Qadr (likely)", blurb: "An odd night of the last ten — seek the Night of Decree.", category: "virtue", fasting: false });
    }
  }

  // Shawwal — Eid al-Fitr
  if (h.month === 10 && h.day === 1) {
    out.push({ key: "eid_al_fitr", name: "Eid al-Fitr", blurb: "The feast that ends Ramadan. Fasting today is not allowed.", category: "celebration", fasting: false, noFast: true });
  }

  // Dhul-Hijjah — the ten days, Arafah, Eid al-Adha, the days of Tashriq
  if (h.month === 12 && h.day >= 1 && h.day <= 10) {
    out.push({ key: "dhul_hijjah_first10", name: "First ten of Dhul-Hijjah", blurb: `Day ${h.day} of the ten most beloved days for good deeds.`, category: "virtue", fasting: h.day <= 9 });
  }
  if (h.month === 12 && h.day === 9) {
    out.push({ key: "arafah", name: "Day of Arafah", blurb: "Fasting today expiates two years for the non-pilgrim.", category: "fasting", fasting: true });
  }
  if (h.month === 12 && h.day === 10) {
    out.push({ key: "eid_al_adha", name: "Eid al-Adha", blurb: "The feast of the sacrifice. Fasting today is not allowed.", category: "celebration", fasting: false, noFast: true });
  }
  if (h.month === 12 && h.day >= 11 && h.day <= 13) {
    out.push({ key: "tashriq", name: "Days of Tashriq", blurb: "The days after Eid al-Adha — days of remembrance, not fasting.", category: "celebration", fasting: false, noFast: true });
  }

  // --- Monthly: the white days (13th, 14th, 15th) — but not when they'd fall on a no-fast day ---
  if (h.day >= 13 && h.day <= 15) {
    const blockedByEid = h.month === 12 && h.day <= 13; // Tashriq overlaps 13 Dhul-Hijjah
    if (!blockedByEid) {
      out.push({ key: "ayyam_al_beed", name: "Ayyam al-Beed (white days)", blurb: `The ${h.day}th — one of the three bright days recommended for fasting.`, category: "fasting", fasting: true });
    }
  }

  // --- Weekly: Jummah -------------------------------------------------------------------------
  if (weekday(date) === 5) {
    out.push({ key: "jummah", name: "Jummah", blurb: "The best day of the week — the Friday congregational prayer.", category: "virtue", fasting: false });
  }

  return out;
}

/** Whether fasting is recommended on `date` and not forbidden (so reminders never nudge a fast on Eid). */
export function isFastingDay(date: Date): boolean {
  const events = eventsOn(date);
  return events.some((e) => e.fasting) && !events.some((e) => e.noFast);
}

export type UpcomingEvent = {
  key: IslamicEventKey;
  name: string;
  blurb: string;
  category: EventCategory;
  /** The Gregorian day it next falls on. */
  date: Date;
  hijri: HijriDate;
  /** Whole days from the reference day (0 = today, 1 = tomorrow). */
  daysUntil: number;
};

/** The major annual/seasonal events worth counting down to (weekly/monthly ones are excluded as noise). */
const MAJOR_KEYS: IslamicEventKey[] = ["ramadan", "eid_al_fitr", "dhul_hijjah_first10", "arafah", "eid_al_adha", "islamic_new_year", "ashura", "ayyam_al_beed"];

/**
 * The next occurrence of each notable event within `horizonDays`, soonest first. Each event key appears
 * at most once (its first upcoming day), so Ramadan shows as a single countdown rather than 30 rows.
 */
export function upcomingEvents(from: Date, horizonDays = 400): UpcomingEvent[] {
  const seen = new Set<IslamicEventKey>();
  const out: UpcomingEvent[] = [];
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());

  for (let i = 0; i <= horizonDays; i += 1) {
    const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    for (const e of eventsOn(day)) {
      if (!MAJOR_KEYS.includes(e.key) || seen.has(e.key)) continue;
      seen.add(e.key);
      out.push({ key: e.key, name: e.name, blurb: e.blurb, category: e.category, date: day, hijri: toHijri(day), daysUntil: i });
    }
  }

  return out.sort((a, b) => a.daysUntil - b.daysUntil);
}

export type RamadanProgress = { active: boolean; day: number; daysLeft: number; isLastTen: boolean };

/** If `date` is in Ramadan, where in the month it sits (assuming a 30-day month for the days-left count). */
export function ramadanProgress(date: Date): RamadanProgress {
  const h = toHijri(date);
  if (h.month !== 9) return { active: false, day: 0, daysLeft: 0, isLastTen: false };
  return { active: true, day: h.day, daysLeft: Math.max(0, 30 - h.day), isLastTen: h.day >= 21 };
}
