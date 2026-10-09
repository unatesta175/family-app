/* Sanity checks for the religiously-sensitive prayer logic: what counts as performed, how excused
 * (Hayd) and qada are treated, the quality scale, and streaks. A wrong answer here is a trust breach
 * (e.g. counting a valid exemption as a lapse), so this is exactly what must never regress.
 * Run: npx tsx scripts/prayer-logic-check.ts */
import { STATUS_QUALITY, isOnTime, isJamaah, isPerformed } from "../src/lib/prayers";
import { STATUSES, type Status } from "../src/lib/db/schema";
import { bestStreak, currentStreak, dayCompletionPct, dayCounts, streakLengthEndingOn, type DayLogMap } from "../src/lib/streaks";

let failed = 0;
function eq(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed += 1;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : `  got=${JSON.stringify(got)} want=${JSON.stringify(want)}`}`);
}

const full = (s: Status): DayLogMap => ({ fajr: s, dhuhr: s, asr: s, maghrib: s, isha: s });

// --- Excused (Hayd) is never a lapse -------------------------------------------------------
eq("excused counts as performed", isPerformed("excused"), true);
eq("a fully-excused day counts toward the streak", dayCounts(full("excused")), true);
eq("excused has full quality (not a lapse)", STATUS_QUALITY.excused, 100);

// --- What counts as performed --------------------------------------------------------------
eq("qada counts as performed (made up)", isPerformed("qada"), true);
eq("late counts as performed", isPerformed("late"), true);
eq("missed is not performed", isPerformed("missed"), false);
eq("not_yet is not performed", isPerformed("not_yet"), false);
eq("every status has a quality value", STATUSES.every((s) => typeof STATUS_QUALITY[s] === "number"), true);
eq("missed and not_yet are the quality floor", STATUS_QUALITY.missed === 0 && STATUS_QUALITY.not_yet === 0, true);
eq("on_time_jamaah is the quality ceiling", STATUS_QUALITY.on_time_jamaah, 100);

// --- Jamaah / on-time classification -------------------------------------------------------
eq("on_time_jamaah is both jamaah and on-time", isJamaah("on_time_jamaah") && isOnTime("on_time_jamaah"), true);
eq("plain jamaah is not 'on time'", isOnTime("jamaah"), false);
eq("late is neither jamaah nor on-time", !isJamaah("late") && !isOnTime("late"), true);

// --- Day completion ------------------------------------------------------------------------
eq("a full performed day is 100%", dayCompletionPct(full("on_time")), 100);
eq("a day missing two prayers is 60%", dayCompletionPct({ fajr: "on_time", dhuhr: "on_time", asr: "on_time" }), 60);
eq("a missed prayer breaks the day", dayCounts({ ...full("on_time"), isha: "missed" }), false);

// --- Streaks -------------------------------------------------------------------------------
const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
function range(end: string, days: number, s: Status): Record<string, DayLogMap> {
  const out: Record<string, DayLogMap> = {};
  for (let i = 0; i < days; i += 1) out[addDays(end, -i)] = full(s);
  return out;
}

const today = "2026-10-09";
eq("a 5-day run of full days is a streak of 5", currentStreak(range(today, 5, "on_time"), today), 5);
eq("an empty today doesn't break a prior streak", currentStreak({ ...range(addDays(today, -1), 4, "on_time") }, today), 4);
eq("a missed day yesterday ends the streak at 0 (today in progress)", currentStreak({ [addDays(today, -1)]: full("missed"), ...range(addDays(today, -4), 3, "on_time") }, today), 0);
eq("excused days keep a streak alive", currentStreak({ ...range(today, 3, "on_time"), [addDays(today, -1)]: full("excused") }, today), 3);
eq("streakLengthEndingOn walks back from a date", streakLengthEndingOn(range(today, 7, "on_time"), today), 7);
eq("bestStreak finds the longest run", bestStreak({ ...range("2026-01-05", 5, "on_time"), ...range("2026-02-10", 3, "on_time") }), 5);

console.log(failed === 0 ? "\nAll checks passed" : `\n${failed} check(s) FAILED`);
process.exit(failed === 0 ? 0 : 1);
