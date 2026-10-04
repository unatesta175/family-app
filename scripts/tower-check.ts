/* Sanity checks for the habit tower data. Run: npx tsx scripts/tower-check.ts */
import { buildTower, motivationFor, nextStreakStep, SLOTS_PER_FLOOR, towerLevel } from "../src/lib/habit-tower";
import type { StatDay } from "../src/lib/habit-insights";

let failed = 0;
function eq(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : `  got=${JSON.stringify(got)} want=${JSON.stringify(want)}`}`);
}

const today = "2026-10-12";
const d = (date: string, state: StatDay[1], value = 0): StatDay => [date, state, value];

const days: StatDay[] = [
  d("2026-08-30", "done"),
  d("2026-08-31", "missed"),
  d("2026-09-01", "done"),
  d("2026-09-02", "skipped"),
  d("2026-09-03", "partial", 3),
  d("2026-09-04", "slipped"),
  d("2026-10-09", "done"),
  d("2026-10-10", "done"),
  d("2026-10-11", "done"),
  d("2026-10-12", "pending"),
];

const t = buildTower(days, "2026-08-30", today);
eq("one floor per month", t.floors.map((f) => f.month), ["2026-08", "2026-09", "2026-10"]);
eq("oldest month is the bottom floor", t.floors[0].label, "Aug 2026");
eq("floor slots match the month length", t.floors.map((f) => f.slots.length), [31, 30, 31]);
eq("a ring has 31 date columns", SLOTS_PER_FLOOR, 31);
eq("done days are counted", t.totalDone, 5);
eq("Aug: one done, one missed", [t.floors[0].done, t.floors[0].due], [1, 2]);
eq("Sep kinds", t.floors[1].slots.slice(0, 4).map((s) => s.kind), ["done", "skipped", "partial", "missed"]);
eq("slipped counts as missed", t.floors[1].slots[3].kind, "missed");
eq("dates before the habit began are off", t.floors[0].slots[0].kind, "off");
eq("a past date with no entry is off", t.floors[1].slots[10].kind, "off");
eq("today is flagged and pending", [t.floors[2].slots[11].today, t.floors[2].slots[11].kind], [true, "pending"]);
eq("later dates this month are future", t.floors[2].slots[20].kind, "future");
eq("partial keeps its amount", t.floors[1].slots[2].value, 3);
eq("streak: three done days then an unfinished today", t.streak, 3);
eq("streak blocks are flagged", t.floors[2].slots.filter((s) => s.streak).map((s) => s.day), [9, 10, 11]);
eq("column is the day of the month", t.floors[2].slots[8].day, 9);

// A broken streak ends the run.
const broken = buildTower([d("2026-10-08", "done"), d("2026-10-09", "missed"), d("2026-10-10", "done"), d("2026-10-11", "done")], "2026-10-01", "2026-10-11");
eq("a miss ends the streak", broken.streak, 2);

// Long history is capped to the newest months.
const long = buildTower([d("2022-01-05", "done")], "2022-01-01", today, 36);
eq("history is capped", long.floors.length, 36);
eq("hidden months are reported", long.hiddenMonths, 58 - 36);
eq("newest floor is the current month", long.floors[long.floors.length - 1].month, "2026-10");

// A brand-new habit is a single floor.
const fresh = buildTower([d("2026-10-12", "done")], "2026-10-12", today);
eq("new habit has one floor", fresh.floors.length, 1);
eq("new habit has one block", fresh.totalDone, 1);

// Levels.
eq("level 1 at zero", towerLevel(0).name, "Foundation");
eq("level 2 at 7 blocks", [towerLevel(7).level, towerLevel(7).name], [2, "Spark"]);
eq("level progress", [towerLevel(10).toNext, Math.round(towerLevel(10).progress * 100)], [11, 21]);
eq("top level has no next", towerLevel(400).next, null);

// Streak steps.
eq("next streak step", [nextStreakStep(0), nextStreakStep(3), nextStreakStep(20), nextStreakStep(400)], [3, 7, 21, null]);

// Month ratings: a finished month with 95%+ is perfect, 80%+ is strong.
const full: StatDay[] = [];
for (let i = 1; i <= 30; i++) full.push(d("2026-09-" + String(i).padStart(2, "0"), i <= 29 ? "done" : "missed"));
const rated = buildTower(full, "2026-09-01", "2026-10-05");
eq("a finished month with 29 of 30 is perfect", rated.floors[0].rating, "perfect");
eq("the current month is not rated", rated.floors[1].rating, null);
const mid: StatDay[] = [];
for (let i = 1; i <= 30; i++) mid.push(d("2026-09-" + String(i).padStart(2, "0"), i <= 26 ? "done" : "missed"));
eq("26 of 30 is strong", buildTower(mid, "2026-09-01", "2026-10-05").floors[0].rating, "strong");

// Motivation.
const day = (date: string, state: StatDay[1]) => d(date, state);
eq("first block prompt", motivationFor(buildTower([day("2026-10-12", "pending")], "2026-10-12", "2026-10-12"), "2026-10-12").tone, "start");
const onStreak = buildTower([day("2026-10-10", "done"), day("2026-10-11", "done"), day("2026-10-12", "pending")], "2026-10-10", "2026-10-12");
eq("streak on the line", [motivationFor(onStreak, "2026-10-12").tone, motivationFor(onStreak, "2026-10-12").cta], ["keep", true]);
const afterMiss = buildTower([day("2026-10-09", "done"), day("2026-10-10", "done"), day("2026-10-11", "missed"), day("2026-10-12", "pending")], "2026-10-09", "2026-10-12");
eq("fresh start after a miss", motivationFor(afterMiss, "2026-10-12").tone, "recover");
const doneToday = buildTower([day("2026-10-10", "done"), day("2026-10-11", "done"), day("2026-10-12", "done")], "2026-10-10", "2026-10-12");
eq("3-day streak is celebrated", motivationFor(doneToday, "2026-10-12").tone, "celebrate");
const quiet = buildTower([day("2026-10-09", "done"), day("2026-10-10", "done"), day("2026-10-11", "done"), day("2026-10-12", "done"), day("2026-10-13", "done")], "2026-10-09", "2026-10-13");
eq("a normal done day", motivationFor(quiet, "2026-10-13").tone, "done");
eq("not due today", motivationFor(buildTower([day("2026-10-10", "done")], "2026-10-10", "2026-10-12"), "2026-10-12").tone, "rest");

console.log(failed === 0 ? "\nAll checks passed" : `\n${failed} check(s) FAILED`);
process.exit(failed === 0 ? 0 : 1);
