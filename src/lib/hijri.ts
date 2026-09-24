/**
 * Gregorian -> Hijri conversion using the Kuwaiti algorithm (tabular, based on
 * a mean lunar month). Offline, no external dependency. Accurate to within
 * ~1 day of local moon-sighting announcements, which is standard for this
 * kind of calculation.
 */

const HIJRI_MONTHS = [
  "Muharram",
  "Safar",
  "Rabi al-Awwal",
  "Rabi al-Thani",
  "Jumada al-Awwal",
  "Jumada al-Thani",
  "Rajab",
  "Shaaban",
  "Ramadan",
  "Shawwal",
  "Dhu al-Qidah",
  "Dhu al-Hijjah",
];

export interface HijriDate {
  year: number;
  month: number; // 1-12
  day: number;
  monthName: string;
}

export function toHijri(date: Date): HijriDate {
  // Julian day number for the given Gregorian date (UTC, date-only).
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();

  const jdn =
    Math.floor((1461 * (y + 4800 + Math.floor((m - 14) / 12))) / 4) +
    Math.floor((367 * (m - 2 - 12 * Math.floor((m - 14) / 12))) / 12) -
    Math.floor(
      (3 * Math.floor((y + 4900 + Math.floor((m - 14) / 12)) / 100)) / 4
    ) +
    d -
    32075;

  // Kuwaiti algorithm: convert JDN to Islamic (tabular) date.
  const islamicEpoch = 1948440; // JDN of 1 Muharram 1 AH
  let l = jdn - islamicEpoch + 10632;
  const n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  const j =
    Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) +
    Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l =
    l -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;
  const hMonth = Math.floor((24 * l) / 709);
  const hDay = l - Math.floor((709 * hMonth) / 24);
  const hYear = 30 * n + j - 30;

  return {
    year: hYear,
    month: hMonth,
    day: hDay,
    monthName: HIJRI_MONTHS[hMonth - 1] ?? "",
  };
}

export function formatHijri(date: Date): string {
  const h = toHijri(date);
  return `${h.day} ${h.monthName} ${h.year} AH`;
}
