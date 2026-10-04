/* Sanity checks for the habit tower data. Run: npx tsx scripts/tower-check.ts */
import { buildTower, SLOTS_PER_FLOOR } from "../src/lib/habit-tower";
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

console.log(failed === 0 ? "\nAll checks passed" : `\n${failed} check(s) FAILED`);
process.exit(failed === 0 ? 0 : 1);
