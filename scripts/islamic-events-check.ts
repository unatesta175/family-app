/* Sanity checks for the Hijri / Islamic-events engine. Run: npx tsx scripts/islamic-events-check.ts */
import { toHijri } from "../src/lib/hijri";
import { eventsOn, isFastingDay, ramadanProgress, upcomingEvents } from "../src/lib/islamic-events";

let failed = 0;
function eq(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed += 1;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : `  got=${JSON.stringify(got)} want=${JSON.stringify(want)}`}`);
}
const d = (iso: string) => new Date(iso + "T12:00:00");
const keys = (iso: string) => eventsOn(d(iso)).map((e) => e.key);

// --- Anchored dates (tabular Kuwaiti algorithm) --------------------------------------------
eq("1 Ramadan 1447 falls on 2026-02-18", toHijri(d("2026-02-18")), { year: 1447, month: 9, day: 1, monthName: "Ramadan" });
eq("Ramadan is detected", keys("2026-02-18").includes("ramadan"), true);
eq("Arafah on 9 Dhul-Hijjah", keys("2027-05-14").includes("arafah"), true);
eq("Eid al-Adha on 10 Dhul-Hijjah", keys("2027-05-15").includes("eid_al_adha"), true);
eq("Eid al-Fitr on 1 Shawwal", keys("2027-03-08").includes("eid_al_fitr"), true);
eq("Islamic New Year on 1 Muharram", keys("2027-06-04").includes("islamic_new_year"), true);
eq("Ashura on 10 Muharram", keys("2027-06-13").includes("ashura"), true);

// --- Weekly / monthly observances ----------------------------------------------------------
eq("Friday is Jummah", keys("2026-10-09").includes("jummah"), true); // 2026-10-09 is a Friday
eq("a non-Friday is not Jummah", keys("2026-10-08").includes("jummah"), false);
eq("the 13th-15th are white days", toHijri(d("2026-10-23")).day >= 13 && keys("2026-10-23").includes("ayyam_al_beed"), true);

// --- Fasting rules (correctness-critical: never nudge a fast on Eid) ------------------------
eq("Ramadan is a fasting day", isFastingDay(d("2026-02-18")), true);
eq("Arafah is a fasting day", isFastingDay(d("2027-05-14")), true);
eq("Eid al-Adha is NOT a fasting day", isFastingDay(d("2027-05-15")), false);
eq("Eid al-Fitr is NOT a fasting day", isFastingDay(d("2027-03-08")), false);
eq("Eid days carry the noFast flag", eventsOn(d("2027-05-15")).some((e) => e.noFast), true);
eq("the white days do not clash with Tashriq on 13 Dhul-Hijjah", keys("2025-06-08").includes("ayyam_al_beed"), false);

// --- Structural invariants over a full Hijri year ------------------------------------------
// Ayyam al-Beed is three days in (almost) every month; across a year it should be well over 30.
let beed = 0;
let jummahs = 0;
for (let i = 0; i < 355; i += 1) {
  const day = new Date(2026, 0, 1 + i);
  const k = eventsOn(day).map((e) => e.key);
  if (k.includes("ayyam_al_beed")) beed += 1;
  if (k.includes("jummah")) jummahs += 1;
}
eq("white days recur through the year (30-36)", beed >= 30 && beed <= 36, true);
eq("about 50-51 Fridays in a 355-day span", jummahs >= 50 && jummahs <= 51, true);

// --- Ramadan progress ----------------------------------------------------------------------
eq("Ramadan progress: day 1 active, 29 left, not last ten", ramadanProgress(d("2026-02-18")), { active: true, day: 1, daysLeft: 29, isLastTen: false });
eq("Ramadan progress: outside Ramadan is inactive", ramadanProgress(d("2026-10-09")).active, false);

// --- Upcoming ------------------------------------------------------------------------------
const up = upcomingEvents(d("2026-10-09"));
eq("upcoming is sorted by soonest", up.every((e, i) => i === 0 || up[i - 1].daysUntil <= e.daysUntil), true);
eq("each major event appears at most once", new Set(up.map((e) => e.key)).size === up.length, true);
eq("upcoming includes Ramadan", up.some((e) => e.key === "ramadan"), true);

console.log(failed === 0 ? "\nAll checks passed" : `\n${failed} check(s) FAILED`);
process.exit(failed === 0 ? 0 : 1);
