/* Sanity checks for the prayer-reminder timing logic. Run: npx tsx scripts/reminder-check.ts */
import { dueReminders, inQuietHours, localMinuteOfDay, sendKey, MAX_LATE_MS } from "../src/lib/prayer-reminders";
import type { Prayer } from "../src/lib/db/schema";

let failed = 0;
function eq(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed += 1;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : `  got=${JSON.stringify(got)} want=${JSON.stringify(want)}`}`);
}

// A day's prayer times, in UTC for the test (the tz only affects quiet-hours minute-of-day).
const TZ = "UTC";
const day = "2026-10-09T00:00:00Z";
const t = (hhmm: string) => Date.parse(`2026-10-09T${hhmm}:00Z`);
const times: Record<Prayer, number> = {
  fajr: t("05:00"),
  dhuhr: t("12:30"),
  asr: t("15:45"),
  maghrib: t("18:20"),
  isha: t("19:40"),
};
void day;

const base = {
  prayers: ["fajr", "dhuhr", "asr", "maghrib", "isha"] as Prayer[],
  times,
  leadMinutes: 0,
  followupMinutes: 15,
  quietStartMin: null as number | null,
  quietEndMin: null as number | null,
  timezone: TZ,
  alreadySent: new Set<string>(),
  isUnlogged: () => true,
};

// --- azan reminders fire at the time -------------------------------------------------------
eq("azan fires exactly at the prayer time", dueReminders({ ...base, nowMs: t("12:30") }).some((r) => r.prayer === "dhuhr" && r.kind === "azan"), true);
eq("azan does not fire a minute early", dueReminders({ ...base, nowMs: t("12:29") }).some((r) => r.prayer === "dhuhr" && r.kind === "azan"), false);

// --- lead time -----------------------------------------------------------------------------
eq("with 10m lead, azan fires 10 minutes before", dueReminders({ ...base, leadMinutes: 10, nowMs: t("12:20") }).some((r) => r.prayer === "dhuhr" && r.kind === "azan"), true);

// --- follow-up nudge -----------------------------------------------------------------------
eq("follow-up fires 15 minutes after when unlogged", dueReminders({ ...base, nowMs: t("12:45") }).some((r) => r.prayer === "dhuhr" && r.kind === "followup"), true);
eq("follow-up is suppressed once the prayer is logged", dueReminders({ ...base, nowMs: t("12:45"), isUnlogged: () => false }).some((r) => r.kind === "followup"), false);
eq("follow-up off when followupMinutes is 0", dueReminders({ ...base, followupMinutes: 0, nowMs: t("12:45") }).some((r) => r.kind === "followup"), false);

// --- dedup ---------------------------------------------------------------------------------
eq("an already-sent reminder is not repeated", dueReminders({ ...base, nowMs: t("12:30"), alreadySent: new Set([sendKey("dhuhr", "azan")]) }).some((r) => r.prayer === "dhuhr" && r.kind === "azan"), false);

// --- staleness -----------------------------------------------------------------------------
eq("a reminder more than 30 min stale is skipped", dueReminders({ ...base, nowMs: t("12:30") + MAX_LATE_MS + 60_000 }).some((r) => r.prayer === "dhuhr" && r.kind === "azan"), false);
eq("a reminder just within the stale window still fires", dueReminders({ ...base, nowMs: t("12:30") + MAX_LATE_MS - 60_000 }).some((r) => r.prayer === "dhuhr" && r.kind === "azan"), true);

// --- disabled prayers ----------------------------------------------------------------------
eq("a prayer not in the list never fires", dueReminders({ ...base, prayers: ["fajr"], nowMs: t("12:30") }).some((r) => r.prayer === "dhuhr"), false);

// --- quiet hours ---------------------------------------------------------------------------
eq("fajr at 05:00 is suppressed inside 22:00–06:00 quiet hours", dueReminders({ ...base, nowMs: t("05:00"), quietStartMin: 22 * 60, quietEndMin: 6 * 60 }).some((r) => r.prayer === "fajr"), false);
eq("dhuhr at 12:30 is allowed with 22:00–06:00 quiet hours", dueReminders({ ...base, nowMs: t("12:30"), quietStartMin: 22 * 60, quietEndMin: 6 * 60 }).some((r) => r.prayer === "dhuhr" && r.kind === "azan"), true);

// --- quiet-hours helper --------------------------------------------------------------------
eq("inQuietHours: wrapping window matches late night", inQuietHours(23 * 60, 22 * 60, 6 * 60), true);
eq("inQuietHours: wrapping window matches early morning", inQuietHours(5 * 60, 22 * 60, 6 * 60), true);
eq("inQuietHours: wrapping window excludes midday", inQuietHours(12 * 60, 22 * 60, 6 * 60), false);
eq("inQuietHours: normal window matches inside", inQuietHours(13 * 60, 12 * 60, 14 * 60), true);
eq("inQuietHours: equal start/end means no window", inQuietHours(12 * 60, 9 * 60, 9 * 60), false);
eq("inQuietHours: null bounds mean no window", inQuietHours(12 * 60, null, null), false);

// --- minute-of-day -------------------------------------------------------------------------
eq("localMinuteOfDay: 12:30 UTC", localMinuteOfDay(t("12:30"), "UTC"), 12 * 60 + 30);

console.log(failed === 0 ? "\nAll checks passed" : `\n${failed} check(s) FAILED`);
process.exit(failed === 0 ? 0 : 1);
