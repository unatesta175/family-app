/* Sanity checks for the Focus module's timing and totals. Run: npx tsx scripts/focus-check.ts */
import { addDays } from "../src/lib/date";
import { formatClockTime, localDateFrom, treeTier, byDay, clock, focusStreak, formatFocus, hourDistribution, segmentsFor, stageName, summarize, timeline, type SessionLite } from "../src/lib/focus";

import { treeSpec } from "../src/lib/focus-tree";

let failed = 0;
function eq(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed += 1;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : `  got=${JSON.stringify(got)} want=${JSON.stringify(want)}`}`);
}

const t0 = Date.parse("2026-10-07T09:00:00");
const at = (sec: number) => t0 + sec * 1000;

// A plain 25 minute session.
const s = 25 * 60;
eq("single: halfway", Math.round(timeline(t0, s, "single", at(s / 2)).progress * 100), 50);
eq("single: done at the end", timeline(t0, s, "single", at(s)).done, true);
eq("single: not done a second early", timeline(t0, s, "single", at(s - 1)).done, false);
eq("single: before it starts is zero", timeline(t0, s, "single", at(-5)).progress, 0);

// Pomodoro: 100 minutes of focus is four blocks with breaks between (5, 5, 15).
const segs = segmentsFor(100 * 60, "pomodoro");
eq("pomodoro 100m: four focus blocks", segs.filter((x) => x.kind === "focus").length, 4);
eq("pomodoro 100m: three breaks", segs.filter((x) => x.kind === "break").map((x) => x.seconds / 60), [5, 5, 5]);
eq("pomodoro: a short session stays one block", segmentsFor(25 * 60, "pomodoro").length, 1);
const wallTotal = segs.reduce((n, x) => n + x.seconds, 0);
eq("pomodoro 100m: the clock runs 15 minutes longer", wallTotal / 60, 115);

// During a break the tree does not grow.
const inBreak = timeline(t0, 100 * 60, "pomodoro", at(26 * 60));
eq("pomodoro: minute 26 is a break", inBreak.phase, "break");
eq("pomodoro: focus stays at 25 minutes during the break", Math.round(inBreak.focusElapsed / 60), 25);
eq("pomodoro: the break has 4 minutes left", Math.round(inBreak.phaseRemaining / 60), 4);
eq("pomodoro: finished at the end of the clock", timeline(t0, 100 * 60, "pomodoro", at(wallTotal)).done, true);
eq("pomodoro: a short last block is folded in", segmentsFor(52 * 60, "pomodoro").filter((x) => x.kind === "focus").map((x) => x.seconds / 60), [25, 27]);

eq("tree tiers by session length", [5, 14, 15, 29, 30, 59, 60, 89, 90, 134, 135, 180].map((m) => treeTier(m * 60)), [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6]);
// A user in Malaysia (UTC+8, offset -480): 06:53 UTC is 2:53 PM there, and just before midnight UTC is already tomorrow.
const utc = Date.UTC(2026, 9, 7, 6, 53);
eq("clock time in the user's own zone", [formatClockTime(utc, -480), formatClockTime(utc, 0), formatClockTime(Date.UTC(2026, 9, 7, 15, 5), -480)], ["2:53 PM", "6:53 AM", "11:05 PM"]);
eq("the day follows the user's zone", [localDateFrom(Date.UTC(2026, 9, 7, 17, 0), -480), localDateFrom(Date.UTC(2026, 9, 7, 17, 0), 0)], ["2026-10-08", "2026-10-07"]);
eq("stage names", [stageName(0), stageName(0.5), stageName(1)], ["Seed", "Sapling", "Full tree"]);
eq("formatting", [formatFocus(5025), formatFocus(2700), clock(3725), clock(90)], ["1h 24m", "45m", "1:02:05", "1:30"]);

// Totals.
const mk = (id: number, date: string, status: SessionLite["status"], mins: number, hour = 9): SessionLite => ({
  id,
  date,
  startedAt: new Date(`${date}T${String(hour).padStart(2, "0")}:00:00`).getTime(),
  habitId: null,
  species: "oak",
  status,
  plannedSeconds: mins * 60,
  focusedSeconds: status === "completed" ? mins * 60 : Math.round(mins * 30),
});
const list = [mk(1, "2026-10-06", "completed", 25), mk(2, "2026-10-07", "completed", 50), mk(3, "2026-10-07", "withered", 30, 14), mk(4, "2026-10-07", "active", 25, 20)];
const days = byDay(list);
eq("a day counts trees and stumps, not active sessions", [days.get("2026-10-07")?.trees, days.get("2026-10-07")?.withered, days.get("2026-10-07")?.sessions.length], [1, 1, 2]);
const sum = summarize(list);
eq("summary", [sum.sessions, sum.trees, sum.withered, sum.longest / 60, sum.finishRate], [3, 2, 1, 50, 67]);
eq("focus streak runs back from today", focusStreak(days, "2026-10-07", addDays), 2);
eq("a day with only a stump breaks the streak", focusStreak(byDay([mk(5, "2026-10-07", "withered", 30)]), "2026-10-07", addDays), 0);
const hours = hourDistribution([mk(6, "2026-10-07", "completed", 90, 9)]);
eq("a 90 minute session at 9:00 covers hours 9 and 10", [Math.round(hours[9] / 60), Math.round(hours[10] / 60)], [60, 30]);

// The tree description both renderers share: the crown sits on the trunk and gets richer with the tier.
const tiers = [1, 2, 3, 4, 5, 6] as const;
const specs = tiers.map((t) => treeSpec({ progress: 1, species: "oak", tier: t, withered: false }));
eq("every leaf sits within reach of the trunk top", specs.every((sp) => sp.leaves.every((l) => Math.abs(l.y - sp.top[1]) <= 52 && Math.abs(l.x - sp.top[0]) <= 45)), true);
eq("more leaves for bigger tiers", specs.map((sp) => sp.leaves.length).every((n, i, a) => i === 0 || n >= a[i - 1]), true);
eq("blossoms from tier 3, none before", specs.map((sp) => sp.blooms.length > 0), [false, false, true, true, true, true]);
eq("glow from tier 5, rays only at 6", [specs[3].halo !== null, specs[4].halo !== null, specs[4].rays !== null, specs[5].rays !== null], [false, true, false, true]);
eq("roots from tier 4", specs.map((sp) => sp.roots !== null), [false, false, false, true, true, true]);
const pines = tiers.map((t) => treeSpec({ progress: 1, species: "pine", tier: t, withered: false }));
eq("pine layers grow with the tier and a star crowns tier 6", [pines.map((sp) => sp.pine!.layers.length), pines[5].pine!.star !== null, pines[4].pine!.star !== null], [[4, 4, 5, 5, 6, 7], true, false]);
const sprout = treeSpec({ progress: 0.05, species: "oak", tier: 3, withered: false });
eq("a barely started tree is a short stem with few leaves", [sprout.leaves.length <= 3, sprout.trunk.y1 > 80], [true, true]);

console.log(failed === 0 ? "\nAll checks passed" : `\n${failed} check(s) FAILED`);
process.exit(failed === 0 ? 0 : 1);
