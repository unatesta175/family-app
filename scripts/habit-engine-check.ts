/* Quick sanity checks for the habit scheduling engine. Run: npx tsx scripts/habit-engine-check.ts */
import {
  carriedFromDate,
  completionRate,
  computeStreak,
  dayState,
  goalProgress,
  scheduleLabel,
  scheduledOn,
  startDateFor,
  targetMet,
  type HabitLite,
  type HabitLogMap,
} from "../src/lib/habits";

const base: HabitLite = {
  id: 1,
  kind: "build",
  schedule: "daily",
  weekdays: "0,1,2,3,4,5,6",
  weeklyTarget: 3,
  dailyTarget: 1,
  startDate: "2026-09-01",
  endDate: null,
  evalType: "yes_no",
  targetOp: "at_least",
  flexible: false,
  repeatEvery: 1,
  alternate: false,
  monthDays: "",
  yearDays: "",
  periodUnit: "week",
};

let failed = 0;
function eq(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : `  got=${JSON.stringify(got)} want=${JSON.stringify(want)}`}`);
}

const done = (value = 1): HabitLogMap[string] => ({ status: "done", value });

// --- Frequencies -----------------------------------------------------------------------------
// 2026-10-02 is a Friday.
const weekly: HabitLite = { ...base, schedule: "weekdays", weekdays: "1" }; // Mondays
eq("weekdays: Monday scheduled", scheduledOn(weekly, "2026-09-28"), true);
eq("weekdays: Friday not scheduled", scheduledOn(weekly, "2026-10-02"), false);

const monthly: HabitLite = { ...base, schedule: "month_days", monthDays: "1,15,31" };
eq("month_days: 15th", scheduledOn(monthly, "2026-10-15"), true);
eq("month_days: 31 lands on Feb 28", scheduledOn(monthly, "2027-02-28"), true);
eq("month_days: 31 lands on Apr 30", scheduledOn(monthly, "2026-09-30"), true);
eq("month_days: 16th no", scheduledOn(monthly, "2026-10-16"), false);

const yearly: HabitLite = { ...base, schedule: "year_days", yearDays: "03-15,12-25,02-29" };
eq("year_days: Dec 25", scheduledOn(yearly, "2026-12-25"), true);
eq("year_days: Feb 29 falls on Feb 28 (non-leap)", scheduledOn(yearly, "2027-02-28"), true);
eq("year_days: other day no", scheduledOn(yearly, "2026-12-26"), false);

const every3: HabitLite = { ...base, schedule: "repeat", repeatEvery: 3 };
eq("repeat 3: start day", scheduledOn(every3, "2026-09-01"), true);
eq("repeat 3: +3", scheduledOn(every3, "2026-09-04"), true);
eq("repeat 3: +1", scheduledOn(every3, "2026-09-02"), false);

const alt: HabitLite = { ...base, schedule: "repeat", repeatEvery: 2, alternate: true };
eq(
  "alternate 2: on,on,off,off,on,on",
  ["09-01", "09-02", "09-03", "09-04", "09-05", "09-06"].map((d) => scheduledOn(alt, `2026-${d}`)),
  [true, true, false, false, true, true]
);
const altOne: HabitLite = { ...base, schedule: "repeat", repeatEvery: 1, alternate: true };
eq(
  "alternate 1 = every other day",
  ["09-01", "09-02", "09-03", "09-04"].map((d) => scheduledOn(altOne, `2026-${d}`)),
  [true, false, true, false]
);

const ended: HabitLite = { ...base, endDate: "2026-09-10" };
eq("end date: after end is off", dayState(ended, {}, "2026-09-15", "2026-09-20"), "off");

// --- Non-flexible vs flexible ----------------------------------------------------------------
const today = "2026-10-02"; // Fri
eq("non-flexible: missed Monday", dayState(weekly, {}, "2026-09-28", today), "missed");
eq("non-flexible: Tuesday off", dayState(weekly, {}, "2026-09-29", today), "off");

const flex: HabitLite = { ...weekly, flexible: true };
// Monday 28 Sep not done -> window open until next Monday 5 Oct.
eq("flexible: Monday still open (flex)", dayState(flex, {}, "2026-09-28", today), "flex");
eq("flexible: today pending (carried)", dayState(flex, {}, today, today), "pending");
eq("flexible: carried from Mon", carriedFromDate(flex, today), "2026-09-28");
eq("flexible: next Monday upcoming", dayState(flex, {}, "2026-10-05", today), "upcoming");
// Done on Wed 30 Sep -> Mon and Thu/Fri are off, Wed is done.
const doneWed: HabitLogMap = { "2026-09-30": done() };
eq("flexible: done Wed -> Wed done", dayState(flex, doneWed, "2026-09-30", today), "done");
eq("flexible: done Wed -> Mon off", dayState(flex, doneWed, "2026-09-28", today), "off");
eq("flexible: done Wed -> today off", dayState(flex, doneWed, today, today), "off");
// Previous window (Mon 21 Sep) never completed -> missed on the 21st only.
eq("flexible: closed window missed on start", dayState(flex, {}, "2026-09-21", today), "missed");
eq("flexible: closed window carry day off", dayState(flex, {}, "2026-09-23", today), "off");

// --- Streaks ---------------------------------------------------------------------------------
const dailyLogs: HabitLogMap = {};
for (const d of ["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01"]) dailyLogs[d] = done();
eq("daily streak (today pending doesn't break)", computeStreak(base, dailyLogs, today).current, 4);
eq("daily streak best", computeStreak(base, dailyLogs, today).best, 4);

const flexLogs: HabitLogMap = { "2026-09-23": done(), "2026-09-30": done() }; // done late in both windows
eq("flexible streak counts windows", computeStreak(flex, flexLogs, today).current, 2);

// --- Rates -----------------------------------------------------------------------------------
eq("rate: 4 of 4 past days", completionRate(base, dailyLogs, "2026-09-28", "2026-10-01", today), 100);

// --- Evaluation ------------------------------------------------------------------------------
const num = { evalType: "numeric" as const, targetOp: "at_least" as const, dailyTarget: 10 };
eq("numeric at_least 10 (9)", targetMet(num, 9), false);
eq("numeric at_least 10 (10)", targetMet(num, 10), true);
eq("numeric at_most 2 (3)", targetMet({ ...num, targetOp: "at_most", dailyTarget: 2 }, 3), false);
eq("numeric at_most 2 (0)", targetMet({ ...num, targetOp: "at_most", dailyTarget: 2 }, 0), true);
eq("numeric exactly 5", targetMet({ ...num, targetOp: "exactly", dailyTarget: 5 }, 5), true);
eq("numeric any 0", targetMet({ ...num, targetOp: "any" }, 0), false);
eq("numeric any 3", targetMet({ ...num, targetOp: "any" }, 3), true);
eq("checklist needs all", targetMet({ evalType: "checklist", targetOp: "at_least", dailyTarget: 3 }, 2), false);

const numHabit: HabitLite = { ...base, evalType: "numeric", dailyTarget: 10 };
eq("partial state", dayState(numHabit, { "2026-10-01": done(4) }, "2026-10-01", today), "partial");
eq("done state", dayState(numHabit, { "2026-10-01": done(12) }, "2026-10-01", today), "done");

// --- Goals -----------------------------------------------------------------------------------
const goalLogs: HabitLogMap = { "2026-09-28": done(10), "2026-09-29": done(15), "2026-10-02": done(30) };
eq(
  "weekly goal (Sun-Sat week of Oct 2)",
  goalProgress(base, goalLogs, { period: "week", op: "at_least", value: 50 }, today),
  { current: 55, met: true }
);
eq(
  "single goal = best day",
  goalProgress(base, goalLogs, { period: "single", op: "at_least", value: 40 }, today),
  { current: 30, met: false }
);
eq(
  "all-time goal",
  goalProgress(base, goalLogs, { period: "all_time", op: "at_least", value: 100 }, today),
  { current: 55, met: false }
);

// --- Labels ----------------------------------------------------------------------------------
eq("label: monthly", scheduleLabel(monthly), "Monthly · 1st, 15th, 31st");
eq("label: yearly", scheduleLabel(yearly), "Yearly · 15 Mar, 25 Dec, 29 Feb");
eq("label: alternate", scheduleLabel(alt), "2 days on, 2 off");
eq("label: flexible", scheduleLabel(flex), "Mon · flexible");
eq("label: per month", scheduleLabel({ ...base, schedule: "weekly_count", weeklyTarget: 5, periodUnit: "month" }), "5× per month");

// --- Explicit "missed" -----------------------------------------------------------------------
const missedLog = (): HabitLogMap[string] => ({ status: "missed", value: 0 });
eq("explicit missed today", dayState(base, { [today]: missedLog() }, today, today), "missed");
eq(
  "explicit missed breaks the streak",
  computeStreak(base, { ...dailyLogs, "2026-10-01": missedLog() }, today).current,
  0
);
eq(
  "explicit missed counts against the rate",
  completionRate(base, { ...dailyLogs, "2026-10-01": missedLog() }, "2026-09-28", "2026-10-01", today),
  75
);
// Flexible: giving up on Monday's occurrence closes its window, so carry days stop showing.
eq("flexible: explicit missed on start", dayState(flex, { "2026-09-28": missedLog() }, "2026-09-28", today), "missed");
eq("flexible: explicit missed closes window", dayState(flex, { "2026-09-28": missedLog() }, today, today), "off");
eq(
  "missed never counts as a done day for period habits",
  dayState({ ...base, schedule: "weekly_count" }, { [today]: missedLog() }, today, today),
  "missed"
);

// --- Before the start date -----------------------------------------------------------------
const early: HabitLogMap = { "2026-08-30": done(), "2026-08-31": done() }; // base starts 2026-09-01
eq("prestart: unlogged day before start", dayState(base, {}, "2026-08-20", today), "prestart");
eq("prestart: logged day before start", dayState(base, early, "2026-08-30", today), "done");
eq("prestart: future date before a future start is off", dayState({ ...base, startDate: "2026-12-01" }, {}, "2026-11-01", today), "off");
const withEarly: HabitLogMap = { ...early };
for (let i = 1; i <= 30; i++) withEarly["2026-09-" + String(i).padStart(2, "0")] = done();
eq("early logs extend the streak", computeStreak(base, withEarly, "2026-09-30").current, 32);
eq("startDateFor moves back to the date", startDateFor(base, "2026-08-25"), "2026-08-25");
eq("startDateFor keeps a later date", startDateFor(base, "2026-09-10"), "2026-09-01");
const rep3: HabitLite = { ...base, schedule: "repeat", repeatEvery: 3 };
eq("startDateFor keeps the repeat rhythm", startDateFor(rep3, "2026-08-28"), "2026-08-26");
eq("repeat rhythm holds before the start", scheduledOn(rep3, "2026-08-29"), true);

console.log(failed === 0 ? "\nAll checks passed" : `\n${failed} check(s) FAILED`);
process.exit(failed === 0 ? 0 : 1);
