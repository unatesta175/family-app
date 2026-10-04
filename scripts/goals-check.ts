/* Sanity checks for the goals logic. Run: npx tsx scripts/goals-check.ts */
import {
  activityDates,
  effortStreakWeeks,
  forecast,
  goalProgressOf,
  goalsToCsv,
  nudgesFor,
  reviewWeekStart,
  GOAL_TEMPLATES,
  type GoalLite,
  type GoalMetrics,
} from "../src/lib/goals";

const today = "2026-10-03"; // a Saturday

const base: GoalLite = {
  id: 1,
  status: "active",
  tracking: "milestones",
  startDate: "2026-09-03",
  targetDate: "2026-12-03",
  targetValue: null,
  startValue: 0,
  habitKind: "checkins",
  habitTarget: null,
  targetUnit: null,
};
const empty: GoalMetrics = { milestones: [], progress: [], habitCheckins: 0, habitStreak: 0, habitDates: [] };

let failed = 0;
function eq(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : `  got=${JSON.stringify(got)} want=${JSON.stringify(want)}`}`);
}

// --- Progress --------------------------------------------------------------------------------
const ms = (done: number, total: number): GoalMetrics => ({
  ...empty,
  milestones: Array.from({ length: total }, (_, i) => ({ id: i, title: `m${i}`, dueDate: null, doneAt: i < done ? "2026-09-20" : null })),
});
eq("milestones 2 of 4", goalProgressOf(base, ms(2, 4)).pct, 50);
eq("milestones none yet", goalProgressOf(base, ms(0, 0)).pct, 0);
eq("milestones label", goalProgressOf(base, ms(1, 3)).label, "1 of 3 milestones");

const measure: GoalLite = { ...base, tracking: "measure", targetValue: 200, startValue: 20, targetUnit: "km" };
const log = (...values: number[]): GoalMetrics => ({ ...empty, progress: values.map((value, i) => ({ value, date: `2026-09-${10 + i}`, profileId: 1 })) });
eq("measure: start 20, +90 of 180 span", goalProgressOf(measure, log(40, 50)).pct, 50);
eq("measure: label", goalProgressOf(measure, log(40, 50)).label, "110 / 200 km");
eq("measure: capped at 100", goalProgressOf(measure, log(500)).pct, 100);

const habitsGoal: GoalLite = { ...base, tracking: "habits", habitKind: "checkins", habitTarget: 40 };
eq("habits: check-ins", goalProgressOf(habitsGoal, { ...empty, habitCheckins: 10 }).pct, 25);
eq("habits: streak", goalProgressOf({ ...habitsGoal, habitKind: "streak", habitTarget: 20 }, { ...empty, habitStreak: 5 }).pct, 25);
eq("achieved forces 100", goalProgressOf({ ...base, status: "achieved" }, ms(1, 4)).pct, 100);

// --- Forecast --------------------------------------------------------------------------------
eq("forecast: done", forecast(base, 100, today).state, "done");
eq("forecast: no progress", forecast(base, 0, today).state, "not_started");
eq("forecast: no progress and target passed", forecast({ ...base, targetDate: "2026-09-20" }, 0, today).state, "behind");
// 30 days elapsed, 50% => 30 more days => ~2026-11-02, well before the 2026-12-03 target => ahead.
eq("forecast: ahead", forecast(base, 50, today).state, "ahead");
// 30 days elapsed, 10% => 270 more days => far past the target => behind.
eq("forecast: behind", forecast(base, 10, today).state, "behind");
eq("forecast: no target date", forecast({ ...base, targetDate: null }, 50, today).state, "no_target");
// 30 days elapsed, 30% => 70 more days => 2026-12-12, 9 days after target 12-03 => behind (<10 days uses days).
eq("forecast: slightly behind wording", forecast(base, 30, today).text.startsWith("Behind by about 9 days"), true);

// --- Activity, streak of effort, nudges ------------------------------------------------------
const act = activityDates({
  milestones: [{ id: 1, title: "a", dueDate: null, doneAt: "2026-09-27" }],
  progress: [{ value: 1, date: "2026-09-20", profileId: 1 }],
  habitDates: ["2026-10-01"],
});
eq("activity dates", act.sort(), ["2026-09-20", "2026-09-27", "2026-10-01"]);
// Weeks (Sun-start): 09-20 -> week of 09-20; 09-27 -> week of 09-27; 10-01 -> week of 09-27.
eq("effort streak counts consecutive weeks", effortStreakWeeks(["2026-09-20", "2026-09-27", "2026-10-01"], today), 2);
eq("effort streak: empty current week doesn't break", effortStreakWeeks(["2026-09-20", "2026-09-22"], "2026-09-28"), 1);
eq("effort streak: gap breaks it", effortStreakWeeks(["2026-09-06", "2026-09-27"], today), 1);

const info = (pct: number) => ({ pct, current: 0, target: null, label: "" });
const goal = { ...base, title: "Run" };
eq("nudge: stalled", nudgesFor(goal, info(20), { ...empty, progress: [{ value: 1, date: "2026-09-10", profileId: 1 }] }, today).some((n) => n.kind === "stalled"), true);
eq("nudge: recent activity is not stalled", nudgesFor(goal, info(20), { ...empty, progress: [{ value: 1, date: "2026-10-01", profileId: 1 }] }, today).some((n) => n.kind === "stalled"), false);
eq("nudge: deadline passed", nudgesFor({ ...goal, targetDate: "2026-09-30" }, info(20), { ...empty, habitDates: ["2026-10-01"] }, today)[0]?.kind, "deadline_passed");
eq("nudge: deadline soon", nudgesFor({ ...goal, targetDate: "2026-10-10" }, info(20), { ...empty, habitDates: ["2026-10-01"] }, today).some((n) => n.kind === "deadline_soon"), true);
const overdue: GoalMetrics = { ...empty, habitDates: ["2026-10-01"], milestones: [{ id: 1, title: "Buy shoes", dueDate: "2026-10-01", doneAt: null }] };
eq("nudge: milestone overdue", nudgesFor(goal, info(20), overdue, today).some((n) => n.kind === "milestone_overdue"), true);
const soon: GoalMetrics = { ...empty, habitDates: ["2026-10-01"], milestones: [{ id: 1, title: "Buy shoes", dueDate: "2026-10-05", doneAt: null }] };
eq("nudge: milestone soon", nudgesFor(goal, info(20), soon, today).some((n) => n.kind === "milestone_soon"), true);
eq("nudge: none when paused", nudgesFor({ ...goal, status: "paused" }, info(20), overdue, today).length, 0);
eq("nudge: none when complete", nudgesFor(goal, info(100), overdue, today).length, 0);

// --- Weekly review ---------------------------------------------------------------------------
eq("review week: Saturday covers this week", reviewWeekStart("2026-10-03"), "2026-09-27");
eq("review week: Sunday covers the week just ended", reviewWeekStart("2026-10-04"), "2026-09-27");
eq("review week: Monday covers this week", reviewWeekStart("2026-10-05"), "2026-10-04");

// --- Templates and CSV -----------------------------------------------------------------------
eq("template keys are unique", new Set(GOAL_TEMPLATES.map((t) => t.key)).size, GOAL_TEMPLATES.length);
eq(
  "measure templates have a target",
  GOAL_TEMPLATES.filter((t) => t.tracking === "measure").every((t) => (t.targetValue ?? 0) > 0),
  true
);
eq(
  "habit templates have a target",
  GOAL_TEMPLATES.filter((t) => t.tracking === "habits").every((t) => (t.habitTarget ?? 0) > 0 && t.habits.length > 0),
  true
);
const csv = goalsToCsv([
  {
    title: 'Run "fast", 5k',
    area: "Health",
    status: "Active",
    tracking: "A number",
    progress: "10%",
    startDate: "2026-09-01",
    targetDate: null,
    visibility: "private",
    milestones: [{ title: "Shoes", dueDate: null, doneAt: "2026-09-02" }],
    progressEntries: [{ date: "2026-09-03", value: 2.5, note: "easy, flat", who: "Ilyas" }],
    notes: [{ date: "2026-09-04", mood: 4, body: "line1\nline2" }],
  },
]);
eq("csv escapes quotes and commas", csv.includes('"Run ""fast"", 5k"'), true);
eq("csv escapes newlines", csv.includes('"line1\nline2"'), true);
eq("csv has a row per record", csv.split("\r\n").length >= 4, true);

console.log(failed === 0 ? "\nAll checks passed" : `\n${failed} check(s) FAILED`);
process.exit(failed === 0 ? 0 : 1);
