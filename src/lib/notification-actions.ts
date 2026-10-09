"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { getOwnProfileId } from "@/lib/auth";
import {
  countSubscriptionsForProfile,
  deleteSubscriptionByEndpoint,
  getPrefs,
  getSubscriptionsForProfile,
  prefsPrayers,
  savePrefs,
  saveSubscription,
} from "@/lib/db/repo-notifications";
import { pushConfigured, sendToSubscriptions } from "@/lib/push";
import { PRAYERS } from "@/lib/db/schema";
import type { Prayer } from "@/lib/db/schema";

export type NotifResult<T = undefined> = ({ ok: true } & (T extends undefined ? object : { data: T })) | { ok: false; error: string };

async function ownProfile(): Promise<number> {
  const id = await getOwnProfileId();
  if (id === null) throw new Error("No profile for this account.");
  return id;
}

function fail(err: unknown): { ok: false; error: string } {
  if (err instanceof z.ZodError) return { ok: false, error: err.issues[0]?.message ?? "Check your settings." };
  return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
}

const subSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

/** Stores a device's push subscription for the signed-in profile. */
export async function subscribePushAction(input: z.input<typeof subSchema>): Promise<NotifResult> {
  try {
    if (!pushConfigured()) throw new Error("Push notifications aren't configured on the server.");
    const profileId = await ownProfile();
    const sub = subSchema.parse(input);
    const ua = (await headers()).get("user-agent");
    await saveSubscription(profileId, sub, ua);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/** Removes a device's subscription (when the person turns reminders off on that device). */
export async function unsubscribePushAction(endpoint: string): Promise<NotifResult> {
  try {
    await ownProfile();
    await deleteSubscriptionByEndpoint(z.string().url().parse(endpoint));
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

const prefsSchema = z.object({
  enabled: z.boolean(),
  prayers: z.array(z.enum(PRAYERS)).max(5),
  leadMinutes: z.number().int().min(0).max(60),
  followupMinutes: z.number().int().min(0).max(120),
  quietStartMin: z.number().int().min(0).max(1439).nullable(),
  quietEndMin: z.number().int().min(0).max(1439).nullable(),
});

/** Saves the profile's reminder preferences. */
export async function saveReminderPrefsAction(input: z.input<typeof prefsSchema>): Promise<NotifResult> {
  try {
    const profileId = await ownProfile();
    const v = prefsSchema.parse(input);
    await savePrefs(profileId, {
      enabled: v.enabled,
      prayers: v.prayers as Prayer[],
      leadMinutes: v.leadMinutes,
      followupMinutes: v.followupMinutes,
      quietStartMin: v.quietStartMin,
      quietEndMin: v.quietEndMin,
    });
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/** The current reminder settings and whether this profile has any registered devices. */
export async function getReminderStateAction(): Promise<NotifResult<{ enabled: boolean; prayers: Prayer[]; leadMinutes: number; followupMinutes: number; quietStartMin: number | null; quietEndMin: number | null; devices: number }>> {
  try {
    const profileId = await ownProfile();
    const [prefs, devices] = await Promise.all([getPrefs(profileId), countSubscriptionsForProfile(profileId)]);
    return {
      ok: true,
      data: {
        enabled: prefs.enabled,
        prayers: prefsPrayers(prefs),
        leadMinutes: prefs.leadMinutes,
        followupMinutes: prefs.followupMinutes,
        quietStartMin: prefs.quietStartMin,
        quietEndMin: prefs.quietEndMin,
        devices,
      },
    };
  } catch (err) {
    return fail(err);
  }
}

/** Sends a one-off test push to all of the profile's devices, so reminders can be verified instantly. */
export async function sendTestNotificationAction(): Promise<NotifResult<{ sent: number }>> {
  try {
    if (!pushConfigured()) throw new Error("Push notifications aren't configured on the server.");
    const profileId = await ownProfile();
    const subs = await getSubscriptionsForProfile(profileId);
    if (subs.length === 0) throw new Error("No devices registered yet. Enable reminders first.");
    const sent = await sendToSubscriptions(subs, { title: "Reminders are on", body: "This is a test — your prayer reminders will arrive like this.", url: "/", tag: "test" });
    if (sent === 0) throw new Error("Couldn't deliver to any device. Try turning reminders off and on again.");
    return { ok: true, data: { sent } };
  } catch (err) {
    return fail(err);
  }
}
