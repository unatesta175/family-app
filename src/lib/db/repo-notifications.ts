import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { notificationPrefs, notificationSends, pushSubscriptions, PRAYERS } from "@/lib/db/schema";
import type { Prayer, ReminderKind } from "@/lib/db/schema";

export type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect;
export type NotificationPrefsRow = typeof notificationPrefs.$inferSelect;

export type WebPushKeys = { endpoint: string; keys: { p256dh: string; auth: string } };

/** Saves (or refreshes) a device's push subscription. Keyed on the endpoint, so re-subscribing updates. */
export async function saveSubscription(profileId: number, sub: WebPushKeys, userAgent: string | null) {
  await db
    .insert(pushSubscriptions)
    .values({ profileId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, userAgent })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { profileId, p256dh: sub.keys.p256dh, auth: sub.keys.auth, userAgent },
    });
}

export async function deleteSubscriptionByEndpoint(endpoint: string) {
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
}

export async function getSubscriptionsForProfile(profileId: number): Promise<PushSubscriptionRow[]> {
  return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.profileId, profileId));
}

export async function countSubscriptionsForProfile(profileId: number): Promise<number> {
  return (await getSubscriptionsForProfile(profileId)).length;
}

/** The default preferences a profile has before it saves any of its own. */
export function defaultPrefs(profileId: number): NotificationPrefsRow {
  return {
    profileId,
    enabled: true,
    prayers: PRAYERS.join(","),
    leadMinutes: 0,
    followupMinutes: 15,
    quietStartMin: null,
    quietEndMin: null,
    updatedAt: "",
  };
}

export async function getPrefs(profileId: number): Promise<NotificationPrefsRow> {
  const [row] = await db.select().from(notificationPrefs).where(eq(notificationPrefs.profileId, profileId));
  return row ?? defaultPrefs(profileId);
}

export type PrefsInput = {
  enabled: boolean;
  prayers: Prayer[];
  leadMinutes: number;
  followupMinutes: number;
  quietStartMin: number | null;
  quietEndMin: number | null;
};

export async function savePrefs(profileId: number, input: PrefsInput) {
  const values = {
    profileId,
    enabled: input.enabled,
    prayers: input.prayers.join(","),
    leadMinutes: input.leadMinutes,
    followupMinutes: input.followupMinutes,
    quietStartMin: input.quietStartMin,
    quietEndMin: input.quietEndMin,
    updatedAt: new Date().toISOString(),
  };
  await db
    .insert(notificationPrefs)
    .values(values)
    .onConflictDoUpdate({ target: notificationPrefs.profileId, set: values });
}

/** The prayers a prefs row has switched on, filtered to valid values. */
export function prefsPrayers(row: NotificationPrefsRow): Prayer[] {
  const set = new Set(row.prayers.split(",").map((s) => s.trim()));
  return PRAYERS.filter((p) => set.has(p));
}

/** Which reminders (`prayer:kind`) have already gone out for a profile on a given local date. */
export async function sentKeysFor(profileId: number, date: string): Promise<Set<string>> {
  const rows = await db
    .select()
    .from(notificationSends)
    .where(and(eq(notificationSends.profileId, profileId), eq(notificationSends.date, date)));
  return new Set(rows.map((r) => `${r.prayer}:${r.kind}`));
}

/**
 * Records that a reminder was sent. The unique index makes this idempotent: a second insert for the
 * same (profile, date, prayer, kind) is ignored, so overlapping ticks never double-send. Returns
 * true only for the insert that actually claimed the slot.
 */
export async function recordSend(profileId: number, date: string, prayer: Prayer, kind: ReminderKind): Promise<boolean> {
  const res = await db
    .insert(notificationSends)
    .values({ profileId, date, prayer, kind })
    .onConflictDoNothing()
    .returning({ id: notificationSends.id });
  return res.length > 0;
}

/** Profiles (in any household) that have reminders enabled and at least one push subscription. */
export async function profilesWithReminders(): Promise<number[]> {
  const prefs = await db.select().from(notificationPrefs).where(eq(notificationPrefs.enabled, true));
  if (prefs.length === 0) return [];
  const ids = prefs.map((p) => p.profileId);
  const subs = await db
    .select({ profileId: pushSubscriptions.profileId })
    .from(pushSubscriptions)
    .where(inArray(pushSubscriptions.profileId, ids));
  const haveSub = new Set(subs.map((s) => s.profileId));
  return ids.filter((id) => haveSub.has(id));
}
