import "server-only";
import webpush from "web-push";
import { deleteSubscriptionByEndpoint, type PushSubscriptionRow } from "@/lib/db/repo-notifications";

/** The payload the service worker's `push` handler expects (see public/sw.js). */
export type PushPayload = {
  title: string;
  body: string;
  /** Where clicking the notification should take the person. */
  url?: string;
  /** Collapses/replaces an earlier notification with the same tag. */
  tag?: string;
};

let configured = false;

/** Configures web-push with the VAPID keys once. Returns false if the keys aren't set (push is off). */
export function ensureVapid(): boolean {
  if (configured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@example.com";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export function pushConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

/**
 * Sends a push to one subscription. A 404/410 from the push service means the subscription is dead
 * (the browser/OS dropped it), so it's pruned. Returns true when the push was accepted.
 */
export async function sendPush(sub: PushSubscriptionRow, payload: PushPayload): Promise<boolean> {
  if (!ensureVapid()) return false;
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload)
    );
    return true;
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) {
      await deleteSubscriptionByEndpoint(sub.endpoint).catch(() => undefined);
    }
    return false;
  }
}

/** Sends the same payload to every device a profile has, pruning any that are dead. */
export async function sendToSubscriptions(subs: PushSubscriptionRow[], payload: PushPayload): Promise<number> {
  const results = await Promise.all(subs.map((s) => sendPush(s, payload)));
  return results.filter(Boolean).length;
}
