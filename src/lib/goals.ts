import { addDays, parseIso } from "@/lib/date";
import { daysBetween, formatNumber, weekStart } from "@/lib/habits";
import type { GoalHabitKind, GoalStatus, GoalTracking } from "@/lib/db/schema";

/**
 * Pure goal logic (progress, forecast, nudges, streak of effort, templates, CSV). No DB access and no
 * server-only imports, so server pages and client components can both use it.
 */

// --- Reference data --------------------------------------------------------------------------

export const GOAL_AREAS = [
  { name: "Faith", color: "emerald", icon: "moon" },
  { name: "Health", color: "rose", icon: "heart" },
  { name: "Family", color: "amber", icon: "smile" },
  { name: "Career", color: "indigo", icon: "briefcase" },
  { name: "Finance", color: "teal", icon: "wallet" },
  { name: "Learning", color: "violet", icon: "book-open" },
  { name: "Personal", color: "sky", icon: "sparkles" },
] as const;

export const STATUS_META: Record<GoalStatus, { label: string; hint: string; tone: string }> = {
  idea: { label: "Idea", hint: "Something you might do one day", tone: "#64748b" },
  active: { label: "Active", hint: "You're working on it", tone: "#5b5bf0" },
  paused: { label: "Paused", hint: "On hold for now", tone: "#f59e0b" },
  achieved: { label: "Achieved", hint: "Done. Well done!", tone: "#10b981" },
  dropped: { label: "Dropped", hint: "No longer pursuing it", tone: "#94a3b8" },
};

export const TRACKING_META: Record<GoalTracking, { label: string; hint: string }> = {
  milestones: { label: "Milestones", hint: "Break it into steps and tick them off" },
  measure: { label: "A number", hint: "Log an amount towards a target, like 10,000 saved" },
  habits: { label: "Habits", hint: "Count check-ins or reach a streak on linked habits" },
};

export function areaMeta(name: string) {
  return GOAL_AREAS.find((a) => a.name.toLowerCase() === name.toLowerCase()) ?? GOAL_AREAS[GOAL_AREAS.length - 1];
}

// --- Types -----------------------------------------------------------------------------------

export type GoalLite = {
  id: number;
  status: GoalStatus;
  tracking: GoalTracking;
  startDate: string;
  targetDate: string | null;
  targetValue: number | null;
  startValue: number;
  habitKind: GoalHabitKind;
  habitTarget: number | null;
  targetUnit: string | null;
};

export type MilestoneLite = { id: number; title: string; dueDate: string | null; doneAt: string | null };
export type ProgressLite = { value: number; date: string; profileId: number };

/** Everything needed to work out a goal's progress, gathered by the server. */
export type GoalMetrics = {
  milestones: MilestoneLite[];
  progress: ProgressLite[];
  /** Done check-ins since the goal started, across every linked habit. */
  habitCheckins: number;
  /** Best current streak (in days) among linked habits. */
  habitStreak: number;
  /** Dates (yyyy-mm-dd) of linked-habit check-ins, for activity and the streak of effort. */
  habitDates: string[];
};

// --- Progress --------------------------------------------------------------------------------

export type GoalProgressInfo = {
  pct: number; // 0-100
  current: number;
  target: number | null;
  label: string; // "2 of 5 milestones", "3,200 / 10,000 USD", "12 / 30 check-ins"
};

const clampPct = (n: number) => Math.max(0, Math.min(100, n));

export function goalProgressOf(goal: GoalLite, m: GoalMetrics): GoalProgressInfo {
  if (goal.status === "achieved") {
    const info = computeProgress(goal, m);
    return { ...info, pct: 100 };
  }
  return computeProgress(goal, m);
}

function computeProgress(goal: GoalLite, m: GoalMetrics): GoalProgressInfo {
  if (goal.tracking === "measure") {
    const target = goal.targetValue ?? 0;
    const current = goal.startValue + m.progress.reduce((a, p) => a + p.value, 0);
    const span = target - goal.startValue;
    const pct = span > 0 ? clampPct(((current - goal.startValue) / span) * 100) : 0;
    const unit = goal.targetUnit ? ` ${goal.targetUnit}` : "";
    return { pct, current, target, label: `${formatNumber(current)} / ${formatNumber(target)}${unit}` };
  }
  if (goal.tracking === "habits") {
    const target = goal.habitTarget ?? 0;
    const current = goal.habitKind === "streak" ? m.habitStreak : m.habitCheckins;
    const pct = target > 0 ? clampPct((current / target) * 100) : 0;
    return {
      pct,
      current,
      target,
      label: goal.habitKind === "streak" ? `${current} / ${target} day streak` : `${current} / ${target} check-ins`,
    };
  }
  const total = m.milestones.length;
  const done = m.milestones.filter((x) => x.doneAt).length;
  return {
    pct: total > 0 ? clampPct((done / total) * 100) : 0,
    current: done,
    target: total,
    label: total > 0 ? `${done} of ${total} milestone${total === 1 ? "" : "s"}` : "No milestones yet",
  };
}

// --- Forecast --------------------------------------------------------------------------------

export type ForecastState = "done" | "not_started" | "ahead" | "on_track" | "behind" | "no_target";

export type Forecast = {
  state: ForecastState;
  /** Estimated finish date at the current pace (null when it can't be worked out). */
  projected: string | null;
  /** Days between the projection and the target date (negative = early). Null without a target date. */
  daysOff: number | null;
  text: string;
};

/**
 * Projects when a goal finishes if the current pace holds: pace = progress so far / days since the
 * start. Compares that with the target date, if there is one.
 */
export function forecast(goal: GoalLite, pct: number, today: string): Forecast {
  if (goal.status === "achieved" || pct >= 100) return { state: "done", projected: null, daysOff: null, text: "Goal reached" };

  const elapsed = Math.max(1, daysBetween(goal.startDate, today));
  const target = goal.targetDate;

  if (pct <= 0) {
    if (target && target < today) {
      return { state: "behind", projected: null, daysOff: daysBetween(target, today), text: "Target date passed with no progress" };
    }
    return { state: "not_started", projected: null, daysOff: null, text: "No progress yet. Log some to see a forecast" };
  }

  const perDay = pct / elapsed;
  const remainingDays = Math.ceil((100 - pct) / perDay);
  const projected = addDays(today, remainingDays);
  if (!target) {
    return { state: "no_target", projected, daysOff: null, text: `At this pace: ${shortDate(projected)}` };
  }
  const daysOff = daysBetween(target, projected);
  if (daysOff <= -14) return { state: "ahead", projected, daysOff, text: `Ahead of schedule: ${shortDate(projected)}` };
  if (daysOff <= 0) return { state: "on_track", projected, daysOff, text: `On track: ${shortDate(projected)}` };
  const weeks = Math.round(daysOff / 7);
  const behind = daysOff >= 10 ? `${Math.max(1, weeks)} week${weeks === 1 ? "" : "s"}` : `${daysOff} day${daysOff === 1 ? "" : "s"}`;
  return { state: "behind", projected, daysOff, text: `Behind by about ${behind}: ${shortDate(projected)}` };
}

export function shortDate(iso: string): string {
  return parseIso(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function daysUntil(iso: string, today: string): number {
  return daysBetween(today, iso);
}

// --- Activity and streak of effort -----------------------------------------------------------

/** Every date something moved this goal: progress logged, a milestone done, a linked habit checked in. */
export function activityDates(m: Pick<GoalMetrics, "milestones" | "progress" | "habitDates">): string[] {
  const out: string[] = [...m.habitDates, ...m.progress.map((p) => p.date)];
  for (const x of m.milestones) if (x.doneAt) out.push(x.doneAt);
  return out;
}

/**
 * Weeks in a row (Sunday to Saturday) with at least one piece of activity, counting back from this
 * week. An empty current week doesn't break the run yet, since it's still in progress.
 */
export function effortStreakWeeks(dates: string[], today: string): number {
  const weeks = new Set(dates.map((d) => weekStart(d)));
  let w = weekStart(today);
  let n = 0;
  if (!weeks.has(w)) w = addDays(w, -7);
  while (weeks.has(w)) {
    n += 1;
    w = addDays(w, -7);
  }
  return n;
}

export function lastActivity(dates: string[]): string | null {
  return dates.length ? dates.reduce((a, b) => (a > b ? a : b)) : null;
}

// --- Nudges ----------------------------------------------------------------------------------

export type NudgeKind = "deadline_passed" | "deadline_soon" | "milestone_overdue" | "milestone_soon" | "stalled";
export type Nudge = { goalId: number; kind: NudgeKind; severity: 1 | 2 | 3; text: string };

const STALLED_DAYS = 14;

export function nudgesFor(
  goal: GoalLite & { title: string },
  info: GoalProgressInfo,
  m: Pick<GoalMetrics, "milestones" | "progress" | "habitDates">,
  today: string
): Nudge[] {
  if (goal.status !== "active" || info.pct >= 100) return [];
  const out: Nudge[] = [];
  const add = (kind: NudgeKind, severity: 1 | 2 | 3, text: string) => out.push({ goalId: goal.id, kind, severity, text });

  if (goal.targetDate) {
    const left = daysUntil(goal.targetDate, today);
    if (left < 0) add("deadline_passed", 3, `"${goal.title}" passed its target date (${shortDate(goal.targetDate)})`);
    else if (left <= 14 && info.pct < 80) add("deadline_soon", 2, `"${goal.title}" is due in ${left} day${left === 1 ? "" : "s"} and is ${Math.round(info.pct)}% done`);
  }

  const open = m.milestones.filter((x) => !x.doneAt && x.dueDate).sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1));
  const overdue = open.filter((x) => x.dueDate! < today);
  if (overdue.length) add("milestone_overdue", 3, `Milestone overdue on "${goal.title}": ${overdue[0].title}`);
  const soon = open.find((x) => x.dueDate! >= today && daysUntil(x.dueDate!, today) <= 7);
  if (soon) {
    const d = daysUntil(soon.dueDate!, today);
    add("milestone_soon", 1, `${soon.title} (${goal.title}) is due ${d === 0 ? "today" : d === 1 ? "tomorrow" : `in ${d} days`}`);
  }

  const last = lastActivity(activityDates(m));
  const since = last ? daysBetween(last, today) : daysBetween(goal.startDate, today);
  if (since >= STALLED_DAYS) add("stalled", 2, `"${goal.title}" has had no progress for ${since} days`);

  return out;
}

// --- Weekly review ---------------------------------------------------------------------------

/** The Sunday of the week a review done today should cover: the week that just ended (or this one on a Sunday). */
export function reviewWeekStart(today: string): string {
  const dow = parseIso(today).getDay();
  return dow === 0 ? addDays(today, -7) : weekStart(today);
}

// --- Templates -------------------------------------------------------------------------------

export type GoalTemplate = {
  key: string;
  title: string;
  area: (typeof GOAL_AREAS)[number]["name"];
  icon: string;
  color: string;
  why: string;
  tracking: GoalTracking;
  targetValue?: number;
  targetUnit?: string;
  habitKind?: GoalHabitKind;
  habitTarget?: number;
  /** Months from today to the suggested target date. */
  months: number;
  milestones: string[];
  habits: { name: string; icon: string; color: string; schedule: "daily" | "weekly_count"; weeklyTarget?: number }[];
};

export const GOAL_TEMPLATES: GoalTemplate[] = [
  {
    key: "juz",
    title: "Memorise a juz'",
    area: "Faith",
    icon: "book-open",
    color: "emerald",
    why: "Keep the words of Allah in my heart.",
    tracking: "milestones",
    months: 6,
    milestones: ["Pick the juz' and a teacher", "Memorise the first quarter", "Memorise the second quarter", "Memorise the third quarter", "Memorise the last quarter", "Recite it from memory"],
    habits: [
      { name: "New memorisation", icon: "book-open", color: "emerald", schedule: "daily" },
      { name: "Revise yesterday's lines", icon: "moon", color: "teal", schedule: "daily" },
    ],
  },
  {
    key: "emergency-fund",
    title: "Build an emergency fund",
    area: "Finance",
    icon: "wallet",
    color: "teal",
    why: "Peace of mind for my family when the unexpected happens.",
    tracking: "measure",
    targetValue: 10000,
    targetUnit: "",
    months: 12,
    milestones: ["Open a separate savings account", "Save the first 1,000", "Reach 25%", "Reach 50%", "Reach 75%"],
    habits: [{ name: "Move savings to the fund", icon: "wallet", color: "teal", schedule: "weekly_count", weeklyTarget: 1 }],
  },
  {
    key: "run-200",
    title: "Run 200 km this year",
    area: "Health",
    icon: "footprints",
    color: "rose",
    why: "A stronger body and a clearer mind.",
    tracking: "measure",
    targetValue: 200,
    targetUnit: "km",
    months: 12,
    milestones: ["Get proper running shoes", "Run 5 km without stopping", "Reach 100 km", "Run a 10 km"],
    habits: [{ name: "Go for a run", icon: "footprints", color: "rose", schedule: "weekly_count", weeklyTarget: 3 }],
  },
  {
    key: "read-12",
    title: "Read 12 books",
    area: "Learning",
    icon: "book-open",
    color: "violet",
    why: "Keep learning and growing.",
    tracking: "measure",
    targetValue: 12,
    targetUnit: "books",
    months: 12,
    milestones: ["Make a reading list", "Finish 3 books", "Finish 6 books", "Finish 9 books"],
    habits: [{ name: "Read 20 pages", icon: "book-open", color: "violet", schedule: "daily" }],
  },
  {
    key: "fit-100",
    title: "Get fit: 100 workouts",
    area: "Health",
    icon: "dumbbell",
    color: "orange",
    why: "Energy to look after my family and my worship.",
    tracking: "habits",
    habitKind: "checkins",
    habitTarget: 100,
    months: 9,
    milestones: [],
    habits: [{ name: "Workout", icon: "dumbbell", color: "orange", schedule: "weekly_count", weeklyTarget: 4 }],
  },
  {
    key: "streak-40",
    title: "40 days of Fajr on time",
    area: "Faith",
    icon: "sunrise",
    color: "amber",
    why: "Build the habit that anchors my whole day.",
    tracking: "habits",
    habitKind: "streak",
    habitTarget: 40,
    months: 2,
    milestones: [],
    habits: [{ name: "Fajr on time", icon: "sunrise", color: "amber", schedule: "daily" }],
  },
  {
    key: "language",
    title: "Learn a new language",
    area: "Learning",
    icon: "message-circle",
    color: "indigo",
    why: "Open new doors and connect with more people.",
    tracking: "habits",
    habitKind: "checkins",
    habitTarget: 150,
    months: 8,
    milestones: [],
    habits: [{ name: "Language practice", icon: "message-circle", color: "indigo", schedule: "daily" }],
  },
  {
    key: "family-time",
    title: "More time with family",
    area: "Family",
    icon: "smile",
    color: "pink",
    why: "The people who matter most deserve my best time.",
    tracking: "milestones",
    months: 3,
    milestones: ["Plan a weekly family evening", "Have 4 family dinners without phones", "Take a day trip together", "Call parents every week for a month"],
    habits: [{ name: "Family time, no phones", icon: "smile", color: "pink", schedule: "weekly_count", weeklyTarget: 3 }],
  },
];

// --- CSV export ------------------------------------------------------------------------------

const csvCell = (v: string | number | null | undefined) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export type GoalExportRow = {
  title: string;
  area: string;
  status: string;
  tracking: string;
  progress: string;
  startDate: string;
  targetDate: string | null;
  visibility: string;
  milestones: { title: string; dueDate: string | null; doneAt: string | null }[];
  progressEntries: { date: string; value: number; note: string | null; who: string }[];
  notes: { date: string; mood: number | null; body: string }[];
};

/** One CSV with a row per goal / milestone / progress entry / journal note, tagged by record type. */
export function goalsToCsv(rows: GoalExportRow[]): string {
  const lines: string[] = [["record", "goal", "area", "status", "detail", "date", "value", "extra"].map(csvCell).join(",")];
  for (const g of rows) {
    lines.push(["goal", g.title, g.area, g.status, `${g.progress} · tracked by ${g.tracking} · ${g.visibility}`, g.startDate, "", g.targetDate ?? ""].map(csvCell).join(","));
    for (const m of g.milestones) lines.push(["milestone", g.title, g.area, m.doneAt ? "done" : "open", m.title, m.doneAt ?? "", "", m.dueDate ?? ""].map(csvCell).join(","));
    for (const p of g.progressEntries) lines.push(["progress", g.title, g.area, "", p.note ?? "", p.date, p.value, p.who].map(csvCell).join(","));
    for (const n of g.notes) lines.push(["journal", g.title, g.area, "", n.body, n.date, n.mood ?? "", ""].map(csvCell).join(","));
  }
  return lines.join("\r\n");
}
