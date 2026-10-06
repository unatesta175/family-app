/* Sanity checks for the world-standing model. Run: npx tsx scripts/world-rank-check.ts */
import { addDays } from "../src/lib/date";
import type { HabitLite, HabitLogMap } from "../src/lib/habits";
import { disciplineScore, formatRank, formatTopPercent, standingFor, standingInput, topPercent } from "../src/lib/world-rank";

let failed = 0;
function ok(name: string, cond: boolean, detail?: unknown) {
  if (!cond) failed += 1;
  console.log(`${cond ? "ok  " : "FAIL"} ${name}${cond ? "" : `  ${JSON.stringify(detail)}`}`);
}

const today = "2026-10-05";
const base: HabitLite = {
  id: 1,
  kind: "build",
  schedule: "daily",
  weekdays: "0,1,2,3,4,5,6",
  weeklyTarget: 3,
  dailyTarget: 1,
  startDate: "2025-01-01",
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

/** `n` habits, each done every day for the last `days` days. */
function perfect(n: number, days: number) {
  const habits: HabitLite[] = [];
  const logs: Record<number, HabitLogMap> = {};
  for (let h = 1; h <= n; h++) {
    habits.push({ ...base, id: h });
    const m: HabitLogMap = {};
    for (let i = 0; i < days; i++) m[addDays(today, -i)] = { status: "done", value: 1 };
    logs[h] = m;
  }
  return standingInput(habits, logs, today);
}

// Nothing logged: nobody to compare with yet.
ok("no check-ins is unranked", !standingFor({ activeDays: 0, rate: 0, streakDays: 0, habitCount: 0, totalCheckins: 0 }).ranked);

// A first good start is already top half.
const day1 = standingFor(perfect(1, 1));
ok("one day in is about top 50%", day1.ranked && day1.topPercent > 45 && day1.topPercent <= 50, day1.topPercent);

// A month of showing up on two habits.
const month = standingFor(perfect(2, 30));
ok("a month is clearly ahead of most people", month.topPercent < 25 && month.topPercent > 3, month.topPercent);

// Four months of consistency is the top 1% (about 40 million of 4 billion).
const four = standingFor(perfect(3, 120));
ok("four months consistent is about top 1%", four.topPercent >= 0.5 && four.topPercent <= 1.5, four.topPercent);
ok("that is a rank around 40 million", four.rank > 20_000_000 && four.rank < 60_000_000, four.rank);

// A year across five habits reaches the top 100.
const year = standingFor(perfect(5, 365));
ok("a year of five habits is the top 100", year.rank <= 150, year.rank);
ok("and is the highest tier", year.tier === "World class", year.tier);

// Monotonic: more score never ranks worse.
let prev = 101;
let mono = true;
for (let s = 0; s <= 1000; s += 10) {
  const p = topPercent(s);
  if (p > prev + 1e-12) mono = false;
  prev = p;
}
ok("top percent only improves as the score rises", mono);
ok("score is capped at 1000", disciplineScore({ activeDays: 999, rate: 1, streakDays: 999, habitCount: 99, totalCheckins: 99999 }) <= 1000);

// Missing days hurt.
const mixed: HabitLogMap = {};
for (let i = 0; i < 120; i++) if (i % 2 === 0) mixed[addDays(today, -i)] = { status: "done", value: 1 };
const half = standingFor(standingInput([{ ...base, id: 1 }], { 1: mixed }, today));
ok("half the days done ranks well below perfect", half.topPercent > four.topPercent * 5, [half.topPercent, four.topPercent]);

// A next step is always offered below the top.
ok("a next tier is suggested", month.next !== null && month.next.hint.length > 0, month.next);

ok("formatting", formatTopPercent(50) === "50%" && formatTopPercent(1.04) === "1%" && formatRank(40_000_000) === "#40,000,000", [formatTopPercent(1.04), formatRank(40_000_000)]);

console.log(failed === 0 ? "\nAll checks passed" : `\n${failed} check(s) FAILED`);
process.exit(failed === 0 ? 0 : 1);
