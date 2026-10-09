import "server-only";
import { getDayLog, getProfile } from "@/lib/db/repo";
import {
  getPrefs,
  getSubscriptionsForProfile,
  prefsPrayers,
  profilesWithReminders,
  recordSend,
  sentKeysFor,
} from "@/lib/db/repo-notifications";
import { computePrayerTimes } from "@/lib/prayer-times";
import { dueReminders } from "@/lib/prayer-reminders";
import { pushConfigured, sendToSubscriptions, type PushPayload } from "@/lib/push";
import { PRAYERS, type Prayer } from "@/lib/db/schema";

/** Plain prayer labels, kept here so the server scheduler doesn't pull the icon library from prayers.ts. */
const PRAYER_LABEL: Record<Prayer, string> = { fajr: "Fajr", dhuhr: "Dhuhr", asr: "Asr", maghrib: "Maghrib", isha: "Isha" };

/** The calendar date (yyyy-mm-dd) it is at `instant` in the given IANA timezone. */
function localDateInTz(instant: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(instant);
}

function payloadFor(prayer: Prayer, kind: "azan" | "followup"): PushPayload {
  const label = PRAYER_LABEL[prayer];
  return kind === "azan"
    ? { title: `${label} time`, body: `It's time for ${label}. Tap to log your prayer.`, url: "/", tag: `azan-${prayer}` }
    : { title: `Have you prayed ${label}?`, body: `A quick reminder to log ${label} before the window closes.`, url: "/", tag: `followup-${prayer}` };
}

/**
 * One pass of the reminder engine: for every profile with reminders on and a push subscription, work
 * out which reminders are due right now (in that profile's own timezone) and send them. Idempotent —
 * each reminder is claimed in the sends log before it goes out, so overlapping ticks never double-send.
 */
export async function runReminderTick(now: Date = new Date()): Promise<{ scanned: number; sent: number }> {
  if (!pushConfigured()) return { scanned: 0, sent: 0 };
  const ids = await profilesWithReminders();
  let sent = 0;

  for (const profileId of ids) {
    try {
      const profile = await getProfile(profileId);
      if (!profile || !profile.timezone) continue;
      const times = computePrayerTimes(
        { latitude: profile.latitude, longitude: profile.longitude, calcMethod: profile.calcMethod, madhab: profile.madhab, timezone: profile.timezone },
        now
      );
      if (!times) continue; // no saved location → can't compute times

      const prefs = await getPrefs(profileId);
      const date = localDateInTz(now, profile.timezone);
      const [alreadySent, dayLog] = await Promise.all([sentKeysFor(profileId, date), getDayLog(profileId, date)]);

      const timesMs = Object.fromEntries(PRAYERS.map((p) => [p, times[p].getTime()])) as Record<Prayer, number>;
      const due = dueReminders({
        prayers: prefsPrayers(prefs),
        times: timesMs,
        nowMs: now.getTime(),
        leadMinutes: prefs.leadMinutes,
        followupMinutes: prefs.followupMinutes,
        quietStartMin: prefs.quietStartMin,
        quietEndMin: prefs.quietEndMin,
        timezone: profile.timezone,
        alreadySent,
        isUnlogged: (p) => !(dayLog[p] && dayLog[p] !== "not_yet"),
      });
      if (due.length === 0) continue;

      const subs = await getSubscriptionsForProfile(profileId);
      if (subs.length === 0) continue;

      for (const r of due) {
        // Claim the slot first: if another tick already took it, recordSend returns false and we skip.
        if (!(await recordSend(profileId, date, r.prayer, r.kind))) continue;
        sent += await sendToSubscriptions(subs, payloadFor(r.prayer, r.kind));
      }
    } catch (err) {
      console.error(`[reminders] profile ${profileId} failed`, err);
    }
  }

  return { scanned: ids.length, sent };
}

// --- In-process ticker -----------------------------------------------------------------------
// A single interval on the long-running Node server (started from instrumentation.ts). The guard
// means a reload or a second worker never starts a second ticker. A tick is a cheap SQLite scan plus
// a few astronomical calcs; see the design note in the PR for the once-per-day precompute path if
// this ever grows to community scale.

const TICK_MS = 60 * 1000;
let started = false;

export function startReminderTicker() {
  if (started) return;
  if (!pushConfigured()) {
    console.log("[reminders] VAPID keys not set — reminder ticker disabled");
    return;
  }
  started = true;
  const tick = () => {
    runReminderTick().catch((err) => console.error("[reminders] tick failed", err));
  };
  // A small initial delay so startup migrations/seeding settle before the first scan.
  setTimeout(() => {
    tick();
    setInterval(tick, TICK_MS);
  }, 10 * 1000);
  console.log("[reminders] ticker started");
}
