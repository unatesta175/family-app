/**
 * Pure logic for the daily-routine planner ("Time" in the Goals module): activity blocks on a 24-hour
 * clock, free time, and totals per day / week / month / year / lifetime. No DB and no server-only
 * imports, so server pages and client components share it.
 */

export const DAY_MIN = 1440;
export const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
/** Display order: the week starts on Monday here, because routines are usually thought of Monday-first. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

const DAYS_PER_YEAR = 365.25;
const DAYS_PER_MONTH = DAYS_PER_YEAR / 12;

// --- Categories ------------------------------------------------------------------------------

export type TimeCategory =
  | "sleep"
  | "pray"
  | "eat"
  | "hygiene"
  | "chores"
  | "work"
  | "study"
  | "commute"
  | "exercise"
  | "family"
  | "free";

export const TIME_CATEGORIES: { key: TimeCategory; label: string; hint: string; color: string; icon: string }[] = [
  { key: "sleep", label: "Sleep", hint: "Night sleep, naps", color: "#6366f1", icon: "moon" },
  { key: "pray", label: "Pray", hint: "Salah, dhikr, Quran", color: "#10b981", icon: "sparkles" },
  { key: "eat", label: "Eat", hint: "Meals, cooking", color: "#f59e0b", icon: "utensils" },
  { key: "hygiene", label: "Bathe & hygiene", hint: "Shower, teeth, getting ready", color: "#06b6d4", icon: "droplets" },
  { key: "chores", label: "Manage yourself", hint: "Wash clothes, fold, tidy, errands", color: "#8b5cf6", icon: "house" },
  { key: "work", label: "Work", hint: "Job, business", color: "#3b82f6", icon: "briefcase" },
  { key: "study", label: "Study", hint: "Class, homework, learning", color: "#a855f7", icon: "graduation-cap" },
  { key: "commute", label: "Commute", hint: "Travel to and from", color: "#64748b", icon: "plane" },
  { key: "exercise", label: "Exercise", hint: "Gym, run, sport", color: "#f43f5e", icon: "dumbbell" },
  { key: "family", label: "Family", hint: "Time with family and friends", color: "#ec4899", icon: "smile" },
  { key: "free", label: "Free time", hint: "What you do when you're free", color: "#84cc16", icon: "gamepad-2" },
];

export const CATEGORY_BY_KEY = Object.fromEntries(TIME_CATEGORIES.map((c) => [c.key, c])) as Record<TimeCategory, (typeof TIME_CATEGORIES)[number]>;
export const CATEGORY_KEYS = TIME_CATEGORIES.map((c) => c.key) as TimeCategory[];

// --- Time helpers ----------------------------------------------------------------------------

/** "07:30" -> 450. Returns null for anything that isn't a valid HH:MM. */
export function parseClock(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 24 || min > 59 || (h === 24 && min !== 0)) return null;
  return h * 60 + min;
}

/** 450 -> "07:30" (1440 shows as "24:00"). */
export function toClock(minutes: number): string {
  const m = Math.max(0, Math.min(DAY_MIN, Math.round(minutes)));
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** 450 -> "7:30 AM". */
export function toClock12(minutes: number): string {
  const m = ((Math.round(minutes) % DAY_MIN) + DAY_MIN) % DAY_MIN;
  const h = Math.floor(m / 60);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m % 60).padStart(2, "0")} ${suffix}`;
}

/** 90 -> "1h 30m", 45 -> "45m", 480 -> "8h". */
export function formatDuration(minutes: number): string {
  const m = Math.round(minutes);
  if (m <= 0) return "0m";
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r}m`;
  return r === 0 ? `${h}h` : `${h}h ${r}m`;
}

/** Hours for big totals: 175320 minutes -> "2,922 h"; keeps one decimal below 100 h. */
export function formatHours(minutes: number): string {
  const h = minutes / 60;
  const text = h >= 100 ? Math.round(h).toLocaleString("en-US") : (Math.round(h * 10) / 10).toLocaleString("en-US", { maximumFractionDigits: 1 });
  return `${text} h`;
}

/**
 * A share of life as a simple fraction: 0.333 -> "1/3", 0.4 -> "2/5". Small shares read as "1/N"
 * (20 minutes a day is "1/72"). Denominators up to 12 are tried so the fraction stays easy to picture.
 */
export function lifeFraction(share: number): string {
  if (share <= 0) return "0";
  if (share >= 0.97) return "all";
  if (share < 1 / 12) return `1/${Math.max(13, Math.round(1 / share))}`;
  let best = { p: 1, q: 2, err: Infinity };
  for (let q = 2; q <= 12; q++) {
    for (let p = 1; p < q; p++) {
      const err = Math.abs(p / q - share);
      if (err < best.err - 1e-9) best = { p, q, err };
    }
  }
  const g = (a: number, b: number): number => (b === 0 ? a : g(b, a % b));
  const d = g(best.p, best.q);
  return `${best.p / d}/${best.q / d}`;
}

export function formatYears(hours: number): string {
  const years = hours / (24 * DAYS_PER_YEAR);
  return years >= 1 ? `${(Math.round(years * 10) / 10).toLocaleString("en-US")} years` : `${Math.round(years * DAYS_PER_YEAR)} days`;
}

// --- Blocks ----------------------------------------------------------------------------------

export type Block = {
  id: number;
  /** Minutes from midnight, 0-1439. */
  start: number;
  /** Minutes from midnight, 1-1440. If it's at or before `start`, the block runs past midnight. */
  end: number;
  category: TimeCategory;
  label: string | null;
};

export function blockMinutes(b: Pick<Block, "start" | "end">): number {
  return b.end > b.start ? b.end - b.start : b.end + DAY_MIN - b.start;
}

/** A block as one or two [start, end) intervals within a single day (two when it wraps past midnight). */
export function blockIntervals(b: Pick<Block, "start" | "end">): [number, number][] {
  if (b.end > b.start) return [[b.start, b.end]];
  return b.end > 0 ? [[b.start, DAY_MIN], [0, b.end]] : [[b.start, DAY_MIN]];
}

/** Which minutes of the day are taken (1) by the given blocks. */
export function coverage(blocks: Pick<Block, "start" | "end">[]): Uint8Array {
  const grid = new Uint8Array(DAY_MIN);
  for (const b of blocks) for (const [s, e] of blockIntervals(b)) for (let i = s; i < e; i++) grid[i] = 1;
  return grid;
}

/** The first existing block a new range would overlap, or null if there's room for it. */
export function findOverlap<T extends Pick<Block, "start" | "end">>(blocks: T[], range: Pick<Block, "start" | "end">): T | null {
  const wanted = coverage([range]);
  for (const b of blocks) {
    for (const [s, e] of blockIntervals(b)) {
      for (let i = s; i < e; i++) if (wanted[i]) return b;
    }
  }
  return null;
}

export type DialSegment = { id: number; start: number; end: number; category: TimeCategory; label: string | null };

/** Blocks split at midnight, so each segment can be drawn as one arc on the dial. */
export function dialSegments(blocks: Block[]): DialSegment[] {
  return blocks.flatMap((b) => blockIntervals(b).map(([start, end]) => ({ id: b.id, start, end, category: b.category, label: b.label })));
}

/** Gaps in the day that no block covers, as [start, end) intervals in minutes. */
export function unplannedGaps(blocks: Pick<Block, "start" | "end">[]): { start: number; end: number }[] {
  const grid = coverage(blocks);
  const gaps: { start: number; end: number }[] = [];
  let from = -1;
  for (let i = 0; i <= DAY_MIN; i++) {
    const free = i < DAY_MIN && !grid[i];
    if (free && from < 0) from = i;
    if (!free && from >= 0) {
      gaps.push({ start: from, end: i });
      from = -1;
    }
  }
  return gaps;
}

// --- Summaries -------------------------------------------------------------------------------

export type DaySummary = {
  /** Minutes per category (the "free" category holds time you've labelled as free-time activities). */
  byCategory: Record<TimeCategory, number>;
  /** Minutes taken by everything except free-time activities. */
  busy: number;
  /** Minutes not covered by any block at all. */
  unplanned: number;
  /** Free time in total: unplanned + the minutes you've given a free-time activity. */
  free: number;
  /** Minutes per free-time activity label (unlabelled ones are called "Free time"). */
  freeActivities: Record<string, number>;
};

const emptyCategories = (): Record<TimeCategory, number> => Object.fromEntries(CATEGORY_KEYS.map((k) => [k, 0])) as Record<TimeCategory, number>;

export function summarizeDay(blocks: Block[]): DaySummary {
  const byCategory = emptyCategories();
  const freeActivities: Record<string, number> = {};
  for (const b of blocks) {
    const m = blockMinutes(b);
    byCategory[b.category] += m;
    if (b.category === "free") {
      const name = b.label?.trim() || "Free time";
      freeActivities[name] = (freeActivities[name] ?? 0) + m;
    }
  }
  const covered = coverage(blocks).reduce((a, v) => a + v, 0);
  const unplanned = DAY_MIN - covered;
  return {
    byCategory,
    busy: covered - byCategory.free,
    unplanned,
    free: unplanned + byCategory.free,
    freeActivities,
  };
}

/** Per-category time at every scale, built from the seven days of the week. */
export type Totals = {
  perDay: number; // average across the week
  perWeek: number;
  perMonth: number;
  perYear: number;
  lifetime: number; // over the whole lifespan
  remaining: number | null; // from today to the end of the lifespan (needs a birth date)
};

export type WeekSummary = {
  /** Minutes per week, per category. Uncovered time is under "unplanned". */
  week: Record<TimeCategory | "unplanned", number>;
  /** Free time per week (unplanned plus free-time activities). */
  freeWeek: number;
  freeActivitiesWeek: Record<string, number>;
  /** Number of the seven days that have a routine. */
  daysPlanned: number;
};

/** `daySummaries[w]` is the summary for weekday w (0 = Sunday), or null if that day has no routine. */
export function summarizeWeek(daySummaries: (DaySummary | null)[]): WeekSummary {
  const week = { ...emptyCategories(), unplanned: 0 } as Record<TimeCategory | "unplanned", number>;
  const freeActivitiesWeek: Record<string, number> = {};
  let freeWeek = 0;
  let daysPlanned = 0;
  for (let w = 0; w < 7; w++) {
    const d = daySummaries[w];
    if (!d) {
      week.unplanned += DAY_MIN;
      freeWeek += DAY_MIN;
      continue;
    }
    daysPlanned += 1;
    for (const k of CATEGORY_KEYS) week[k] += d.byCategory[k];
    week.unplanned += d.unplanned;
    freeWeek += d.free;
    for (const [name, m] of Object.entries(d.freeActivities)) freeActivitiesWeek[name] = (freeActivitiesWeek[name] ?? 0) + m;
  }
  return { week, freeWeek, freeActivitiesWeek, daysPlanned };
}

/** Scales a weekly minute total up to day / month / year / lifetime. */
export function totalsFromWeek(perWeek: number, lifespanYears: number, yearsLeft: number | null): Totals {
  const perDay = perWeek / 7;
  const perYear = perDay * DAYS_PER_YEAR;
  return {
    perDay,
    perWeek,
    perMonth: perDay * DAYS_PER_MONTH,
    perYear,
    lifetime: perYear * lifespanYears,
    remaining: yearsLeft === null ? null : perYear * Math.max(0, yearsLeft),
  };
}

/** Years from `today` to age `lifespan`, given a birth date (yyyy-mm-dd). Null without a birth date. */
export function yearsLeft(birthDate: string | null, lifespanYears: number, today: string): number | null {
  if (!birthDate) return null;
  const ms = new Date(today).getTime() - new Date(birthDate).getTime();
  const age = ms / (DAYS_PER_YEAR * 86_400_000);
  return Math.max(0, lifespanYears - age);
}

// --- Day to routine mapping ------------------------------------------------------------------

/** Presets for the three common shapes of week. Each returns routine index per weekday (0 = Sunday). */
export const DAY_PRESETS = [
  { key: "two", label: "Weekdays + weekend", routines: ["Weekday", "Weekend"], map: [1, 0, 0, 0, 0, 0, 1] },
  { key: "three", label: "Weekdays + Friday + weekend", routines: ["Weekday", "Friday", "Weekend"], map: [2, 0, 0, 0, 0, 1, 2] },
] as const;

// --- Starter routines (onboarding) -----------------------------------------------------------

type StarterBlock = [string, string, TimeCategory, string | null];

const WEEKDAY_STARTER: StarterBlock[] = [
  ["22:30", "05:00", "sleep", null],
  ["05:00", "05:30", "pray", "Fajr"],
  ["05:30", "06:00", "hygiene", "Bathe and get ready"],
  ["06:00", "06:30", "eat", "Breakfast"],
  ["06:30", "07:30", "commute", null],
  ["07:30", "12:30", "work", null],
  ["12:30", "13:15", "pray", "Dhuhr"],
  ["13:15", "14:00", "eat", "Lunch"],
  ["14:00", "16:30", "work", null],
  ["16:30", "17:15", "commute", null],
  ["17:15", "18:00", "exercise", null],
  ["18:00", "18:30", "pray", "Maghrib"],
  ["18:30", "19:30", "eat", "Dinner"],
  ["19:30", "20:00", "chores", "Wash and fold clothes"],
  ["20:00", "21:00", "free", "Reading"],
  ["21:00", "21:30", "pray", "Isha"],
  ["21:30", "22:30", "free", "Relax"],
];

export function starterBlocks(kind: "weekday" | "friday" | "weekend"): StarterBlock[] {
  if (kind === "weekday") return WEEKDAY_STARTER;
  if (kind === "friday") {
    // Same day, with the Jumu'ah prayer instead of a normal Dhuhr.
    return WEEKDAY_STARTER.map((b) => (b[3] === "Dhuhr" ? [b[0], b[1], "pray", "Jumu'ah"] : b));
  }
  return [
    ["23:00", "06:00", "sleep", null],
    ["06:00", "06:30", "pray", "Fajr"],
    ["06:30", "07:00", "hygiene", "Bathe and get ready"],
    ["07:00", "08:00", "eat", "Breakfast"],
    ["08:00", "10:00", "chores", "Laundry and tidy up"],
    ["10:00", "12:30", "family", null],
    ["12:30", "13:15", "pray", "Dhuhr"],
    ["13:15", "14:15", "eat", "Lunch"],
    ["14:15", "17:30", "free", "Hobbies"],
    ["17:30", "18:30", "exercise", null],
    ["18:30", "19:00", "pray", "Maghrib"],
    ["19:00", "20:00", "eat", "Dinner"],
    ["20:00", "21:30", "family", null],
    ["21:30", "22:00", "pray", "Isha"],
    ["22:00", "23:00", "free", "Relax"],
  ];
}
