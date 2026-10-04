/* Sanity checks for the daily-routine planner logic. Run: npx tsx scripts/time-check.ts */
import {
  blockMinutes,
  dialSegments,
  findOverlap,
  formatDuration,
  formatHours,
  parseClock,
  starterBlocks,
  summarizeDay,
  summarizeWeek,
  toClock,
  totalsFromWeek,
  unplannedGaps,
  yearsLeft,
  type Block,
} from "../src/lib/time-planner";

let failed = 0;
function eq(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : `  got=${JSON.stringify(got)} want=${JSON.stringify(want)}`}`);
}

const b = (id: number, s: string, e: string, category: Block["category"], label: string | null = null): Block => ({
  id,
  start: parseClock(s)!,
  end: parseClock(e)!,
  category,
  label,
});

eq("parseClock", [parseClock("07:30"), parseClock("7:05"), parseClock("24:00"), parseClock("25:00"), parseClock("ab")], [450, 425, 1440, null, null]);
eq("toClock", [toClock(450), toClock(1440), toClock(0)], ["07:30", "24:00", "00:00"]);
eq("duration formats", [formatDuration(90), formatDuration(45), formatDuration(480), formatDuration(0)], ["1h 30m", "45m", "8h", "0m"]);

// A block that wraps past midnight.
const sleep = b(1, "22:30", "05:00", "sleep");
eq("wrap block minutes", blockMinutes(sleep), 390);
eq("wrap block draws as two arcs", dialSegments([sleep]).map((s) => [s.start, s.end]), [[1350, 1440], [0, 300]]);
eq("block ending at midnight is one arc", dialSegments([b(2, "20:00", "24:00", "free")]).length, 1);

// Overlap detection, including across midnight.
eq("overlap with a wrapping block", findOverlap([sleep], { start: parseClock("04:00")!, end: parseClock("06:00")! })?.id, 1);
eq("no overlap just after a block", findOverlap([sleep], { start: parseClock("05:00")!, end: parseClock("06:00")! }), null);
eq("overlap at the late end", findOverlap([sleep], { start: parseClock("23:00")!, end: parseClock("23:30")! })?.id, 1);
eq("no overlap before a block", findOverlap([sleep], { start: parseClock("20:00")!, end: parseClock("22:30")! }), null);

// Free time and summaries.
const day: Block[] = [sleep, b(2, "05:00", "06:00", "pray"), b(3, "18:00", "20:00", "free", "Reading"), b(4, "20:00", "21:00", "free", "Reading"), b(5, "12:00", "13:00", "eat")];
const s = summarizeDay(day);
eq("sleep minutes", s.byCategory.sleep, 390);
eq("busy excludes free-time activities", s.busy, 390 + 60 + 60);
eq("free = unplanned + free activities", s.free, 1440 - (390 + 60 + 60 + 180) + 180);
eq("free activities add up by label", s.freeActivities, { Reading: 180 });
eq("gaps", unplannedGaps(day).map((g) => [g.start, g.end]), [[360, 720], [780, 1080], [1260, 1350]]);

// Week + scaling.
const week = summarizeWeek([s, s, s, s, s, s, null]); // Sunday has no routine
eq("days planned", week.daysPlanned, 6);
eq("week sleep (6 days)", week.week.sleep, 390 * 6);
eq("unplanned adds the empty day", week.week.unplanned, (1440 - 690) * 6 + 1440);
const t = totalsFromWeek(60 * 56, 80, null); // 8 hours of sleep a day
eq("per day", t.perDay / 60, 8);
eq("per year", Math.round(t.perYear / 60), 2922);
eq("lifetime over 80 years", Math.round(t.lifetime / 60), 233_760);
eq("remaining is null without a birth date", t.remaining, null);
eq("formatHours big", formatHours(60 * 2922), "2,922 h");
eq("formatHours small", formatHours(90), "1.5 h");

// Remaining life.
const left = yearsLeft("2000-01-01", 80, "2026-10-03");
eq("years left", Math.round((left ?? 0) * 10) / 10, 53.2);
eq("years left without birth date", yearsLeft(null, 80, "2026-10-03"), null);

// Starter routines are valid: no overlaps, every minute accounted for.
for (const kind of ["weekday", "friday", "weekend"] as const) {
  const blocks: Block[] = starterBlocks(kind).map(([a, z, category, label], i) => ({ id: i, start: parseClock(a)!, end: parseClock(z)!, category, label }));
  const clash = blocks.some((x, i) => findOverlap(blocks.filter((_, j) => j !== i), x));
  const sum = summarizeDay(blocks);
  eq(`starter ${kind}: no overlaps`, clash, false);
  eq(`starter ${kind}: whole day accounted for`, sum.busy + sum.byCategory.free + sum.unplanned, 1440);
}

console.log(failed === 0 ? "\nAll checks passed" : `\n${failed} check(s) FAILED`);
process.exit(failed === 0 ? 0 : 1);
