/* Sanity checks for the proactive prayer-insights engine. Run: npx tsx scripts/prayer-insights-check.ts */
import { buildInsights, prayerPerformedRates, weakestPrayer, weakestWeekday, type DayLogMap } from "../src/lib/prayer-insights";
import type { Prayer, Status } from "../src/lib/db/schema";

let failed = 0;
function eq(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed += 1;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : `  got=${JSON.stringify(got)} want=${JSON.stringify(want)}`}`);
}

const PRAYERS: Prayer[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const full = (s: Status): DayLogMap => Object.fromEntries(PRAYERS.map((p) => [p, s])) as DayLogMap;
/** `days` days ending on `end`, all `s`, but with `except` prayers set to `missed`. */
function days(end: string, count: number, s: Status, except: Prayer[] = []): Record<string, DayLogMap> {
  const out: Record<string, DayLogMap> = {};
  for (let i = 0; i < count; i += 1) {
    const day = { ...full(s) };
    for (const p of except) day[p] = "missed";
    out[addDays(end, -i)] = day;
  }
  return out;
}

const today = "2026-10-09";

// --- performed rates -----------------------------------------------------------------------
const perfect = days(today, 10, "on_time");
eq("a perfect fortnight is 100% on every prayer", prayerPerformedRates(perfect).rates.fajr, 1);
eq("day count is tracked", prayerPerformedRates(perfect).days, 10);

// --- weakest prayer ------------------------------------------------------------------------
eq("too little data → no weakest prayer", weakestPrayer(days(today, 3, "on_time", ["asr"])), null);
eq("asr missed all fortnight is the weakest at 0%", weakestPrayer(days(today, 14, "on_time", ["asr"])), { prayer: "asr", rate: 0 });
eq("a perfect record flags no weakest prayer", weakestPrayer(perfect), null);

// --- weakest weekday -----------------------------------------------------------------------
// Miss everything only on Saturdays (UTC getUTCDay === 6) across several weeks.
const mixed: Record<string, DayLogMap> = {};
for (let i = 0; i < 28; i += 1) {
  const date = addDays(today, -i);
  const wd = new Date(date + "T00:00:00Z").getUTCDay();
  mixed[date] = wd === 6 ? full("missed") : full("on_time");
}
eq("Saturdays are flagged as the hardest weekday", weakestWeekday(mixed)?.weekday, 6);

// --- insight synthesis ---------------------------------------------------------------------
const streakRisk = buildInsights({ logsByDate: perfect, today, streak: 12, remainingToday: 2, qadaOwed: 0 });
eq("a live streak with prayers left raises a streak-risk warning", streakRisk.some((i) => i.key === "streak-risk" && i.severity === "warning"), true);
eq("streak-risk is listed first (most actionable)", streakRisk[0]?.key, "streak-risk");

const noRisk = buildInsights({ logsByDate: perfect, today, streak: 12, remainingToday: 0, qadaOwed: 0 });
eq("a completed day raises no streak-risk", noRisk.some((i) => i.key === "streak-risk"), false);

const qada = buildInsights({ logsByDate: perfect, today, streak: 0, remainingToday: 0, qadaOwed: 10 });
eq("owed qada produces a burn-down plan", qada.some((i) => i.key === "qada-plan"), true);

const lowStreak = buildInsights({ logsByDate: perfect, today, streak: 2, remainingToday: 3, qadaOwed: 0 });
eq("a 2-day streak is too short to warn about", lowStreak.some((i) => i.key === "streak-risk"), false);

// Momentum: a weak previous week, a strong recent week.
const momentum = { ...days(today, 7, "on_time"), ...days(addDays(today, -7), 7, "missed") };
eq("improvement over last week is celebrated", buildInsights({ logsByDate: momentum, today, streak: 0, remainingToday: 0, qadaOwed: 0 }).some((i) => i.key === "momentum" && i.severity === "positive"), true);

console.log(failed === 0 ? "\nAll checks passed" : `\n${failed} check(s) FAILED`);
process.exit(failed === 0 ? 0 : 1);
