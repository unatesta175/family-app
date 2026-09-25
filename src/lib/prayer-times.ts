import {
  Coordinates,
  CalculationMethod,
  CalculationParameters,
  HighLatitudeRule,
  Madhab as AdhanMadhab,
  PrayerTimes as AdhanPrayerTimes,
} from "adhan";
import { PRAYER_ORDER } from "@/lib/prayers";
import type { CalcMethod, Madhab, Prayer } from "@/lib/db/schema";

export type PrayerTimesMap = Record<Prayer, Date> & { sunrise: Date };

export const CALC_METHOD_META: Record<CalcMethod, { label: string; region: string }> = {
  MuslimWorldLeague: { label: "Muslim World League", region: "Global default" },
  Egyptian: { label: "Egyptian General Authority", region: "Egypt, parts of Africa" },
  Karachi: { label: "University of Islamic Sciences, Karachi", region: "Pakistan, India, Bangladesh" },
  UmmAlQura: { label: "Umm al-Qura University", region: "Saudi Arabia" },
  Dubai: { label: "Dubai (UAE)", region: "UAE" },
  MoonsightingCommittee: { label: "Moonsighting Committee Worldwide", region: "Most accurate, seasonally adjusted" },
  NorthAmerica: { label: "ISNA", region: "North America" },
  Kuwait: { label: "Kuwait", region: "Kuwait" },
  Qatar: { label: "Qatar", region: "Qatar" },
  Singapore: { label: "Majlis Ugama Islam Singapura", region: "Singapore, Malaysia, Indonesia" },
  Tehran: { label: "University of Tehran", region: "Iran" },
  Turkey: { label: "Diyanet (Turkey)", region: "Turkey" },
};

/**
 * Method recommended when the profile hasn't chosen one explicitly.
 * Moonsighting Committee Worldwide is adhan.js's own recommended default: it
 * uses a seasonally-adjusted twilight model that tracks real sky observation
 * data more closely than the older fixed-angle methods.
 */
export const RECOMMENDED_CALC_METHOD: CalcMethod = "MoonsightingCommittee";

export type LocationPrefs = {
  latitude: number | null;
  longitude: number | null;
  calcMethod: CalcMethod | null;
  madhab: Madhab;
  /** IANA zone, e.g. "Asia/Jakarta". Required for correct day boundaries and display. */
  timezone: string | null;
};

export function hasLocation(
  prefs: LocationPrefs
): prefs is LocationPrefs & { latitude: number; longitude: number; timezone: string } {
  return prefs.latitude != null && prefs.longitude != null && !!prefs.timezone;
}

/**
 * adhan.js derives the calendar day it calculates for from the *local*
 * getFullYear/getMonth/getDate of the Date you hand it — i.e. whatever
 * timezone the Node process itself happens to run in. On a VPS (commonly
 * UTC) that silently picks the wrong day/instant for anyone not in UTC.
 * We sidestep that by reading the target location's calendar date directly
 * via Intl and building a UTC-noon Date for it, which is immune to
 * whatever timezone the server process happens to be in.
 */
function zonedCalendarDate(timezone: string, instant: Date): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return new Date(Date.UTC(get("year"), get("month") - 1, get("day"), 12, 0, 0));
}

/** Formats a prayer time Date in the profile's own timezone, regardless of server timezone. */
export function formatPrayerTime(date: Date, timezone: string): string {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: timezone });
}

/**
 * Computes accurate prayer times for the calendar day (in the profile's
 * timezone) containing `instant`, at the profile's saved coordinates. Uses
 * the high-latitude rule adhan.js recommends for those exact coordinates, so
 * locations near the poles (very long/short nights) still get sane
 * fajr/isha times instead of nonsense values.
 */
export function computePrayerTimes(prefs: LocationPrefs, instant: Date): PrayerTimesMap | null {
  if (!hasLocation(prefs)) return null;

  const coordinates = new Coordinates(prefs.latitude, prefs.longitude);
  const method = prefs.calcMethod ?? RECOMMENDED_CALC_METHOD;
  const params: CalculationParameters = CalculationMethod[method]();
  params.madhab = prefs.madhab === "hanafi" ? AdhanMadhab.Hanafi : AdhanMadhab.Shafi;
  params.highLatitudeRule = HighLatitudeRule.recommended(coordinates);

  const date = zonedCalendarDate(prefs.timezone, instant);
  const times = new AdhanPrayerTimes(coordinates, date, params);

  return {
    fajr: times.fajr,
    dhuhr: times.dhuhr,
    asr: times.asr,
    maghrib: times.maghrib,
    isha: times.isha,
    sunrise: times.sunrise,
  };
}

export type NextPrayerInfo = {
  prayer: Prayer;
  at: Date;
  msRemaining: number;
};

/** The next upcoming waktu (prayer), rolling over to tomorrow's fajr after isha. */
export function nextPrayer(
  prefs: LocationPrefs,
  now: Date,
  todayTimes: PrayerTimesMap,
  tomorrowTimes: PrayerTimesMap
): NextPrayerInfo | null {
  for (const prayer of PRAYER_ORDER) {
    const at = todayTimes[prayer];
    if (at.getTime() > now.getTime()) {
      return { prayer, at, msRemaining: at.getTime() - now.getTime() };
    }
  }
  const at = tomorrowTimes.fajr;
  return { prayer: "fajr", at, msRemaining: at.getTime() - now.getTime() };
}
