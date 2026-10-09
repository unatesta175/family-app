"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Bell, BellOff, Check, Loader2, Send } from "lucide-react";
import {
  saveReminderPrefsAction,
  sendTestNotificationAction,
  subscribePushAction,
  unsubscribePushAction,
} from "@/lib/notification-actions";
import { PRAYER_META, PRAYER_ORDER } from "@/lib/prayers";
import type { Prayer } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

export type ReminderInitial = {
  enabled: boolean;
  prayers: Prayer[];
  leadMinutes: number;
  followupMinutes: number;
  quietStartMin: number | null;
  quietEndMin: number | null;
};

/** base64url VAPID key → the Uint8Array the Push API wants for applicationServerKey. */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

/** "HH:MM" string ↔ minutes since midnight, for the quiet-hours inputs. */
function minToTime(min: number | null): string {
  if (min === null) return "";
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}
function timeToMin(value: string): number | null {
  if (!value) return null;
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

export function PrayerRemindersForm({ initial, devices: initialDevices, vapidPublicKey }: { initial: ReminderInitial; devices: number; vapidPublicKey: string }) {
  const supported = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  const configured = vapidPublicKey.length > 0;

  const [subscribed, setSubscribed] = useState(initialDevices > 0);
  const [prayers, setPrayers] = useState<Set<Prayer>>(new Set(initial.prayers));
  const [leadMinutes, setLeadMinutes] = useState(initial.leadMinutes);
  const [followupMinutes, setFollowupMinutes] = useState(initial.followupMinutes);
  const [quietStart, setQuietStart] = useState(minToTime(initial.quietStartMin));
  const [quietEnd, setQuietEnd] = useState(minToTime(initial.quietEndMin));
  const [busy, startBusy] = useTransition();
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const firstRender = useRef(true);

  // Reflect the real subscription state of *this* device on mount.
  useEffect(() => {
    if (!supported) return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(Boolean(sub)))
      .catch(() => undefined);
  }, [supported]);

  function currentPrefs() {
    return {
      enabled: subscribed,
      prayers: PRAYER_ORDER.filter((p) => prayers.has(p)),
      leadMinutes,
      followupMinutes,
      quietStartMin: timeToMin(quietStart),
      quietEndMin: timeToMin(quietEnd),
    };
  }

  // Save preferences whenever they change (after the first paint), with a small "Saved" flash.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setStatus("saving");
    const prefs = currentPrefs();
    const t = setTimeout(() => {
      startBusy(async () => {
        const res = await saveReminderPrefsAction(prefs);
        if (res.ok) {
          setStatus("saved");
          setTimeout(() => setStatus("idle"), 1500);
        } else {
          setStatus("idle");
          setError(res.error);
        }
      });
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prayers, leadMinutes, followupMinutes, quietStart, quietEnd]);

  async function enable() {
    setError(null);
    setTestMsg(null);
    if (!supported) return setError("This browser doesn't support notifications.");
    if (!configured) return setError("Reminders aren't configured on the server yet.");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setError("Notifications are blocked. Allow them in your browser settings.");
      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) }));
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      const res = await subscribePushAction({ endpoint: json.endpoint, keys: json.keys });
      if (!res.ok) return setError(res.error);
      setSubscribed(true);
      // Make sure prefs exist/enabled for this profile now that a device is registered.
      await saveReminderPrefsAction({ ...currentPrefs(), enabled: true });
    } catch {
      setError("Couldn't enable reminders. Please try again.");
    }
  }

  async function disableThisDevice() {
    setError(null);
    setTestMsg(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await unsubscribePushAction(sub.endpoint);
        await sub.unsubscribe().catch(() => undefined);
      }
      setSubscribed(false);
    } catch {
      setError("Couldn't turn off reminders on this device.");
    }
  }

  function sendTest() {
    setTestMsg(null);
    setError(null);
    startBusy(async () => {
      const res = await sendTestNotificationAction();
      if (res.ok) setTestMsg(`Test sent to ${res.data.sent} device${res.data.sent === 1 ? "" : "s"}.`);
      else setError(res.error);
    });
  }

  const togglePrayer = (p: Prayer) =>
    setPrayers((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-neutral-900">Prayer reminders</p>
          <p className="mt-0.5 text-xs text-neutral-400">
            A push notification at each prayer time, worked out from your location. Reminders arrive even when the app is closed.
          </p>
        </div>
        <Bell className="h-5 w-5 shrink-0 text-emerald-600" />
      </div>

      {!supported && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2.5 text-xs font-medium text-amber-700">This browser can&apos;t show reminders. On iPhone, add the app to your Home Screen first, then enable them.</p>}
      {supported && !configured && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2.5 text-xs font-medium text-amber-700">Reminders aren&apos;t set up on the server yet (missing VAPID key).</p>}

      {supported && configured && (
        <>
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-neutral-50 px-3 py-2.5">
            <p className="text-xs font-semibold text-neutral-700">{subscribed ? "Reminders are on for this device" : "Reminders are off on this device"}</p>
            {subscribed ? (
              <button type="button" onClick={disableThisDevice} className="flex shrink-0 items-center gap-1.5 rounded-full bg-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-300">
                <BellOff className="h-3.5 w-3.5" />
                Turn off
              </button>
            ) : (
              <button type="button" onClick={enable} className="flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-800">
                <Bell className="h-3.5 w-3.5" />
                Enable
              </button>
            )}
          </div>

          {subscribed && (
            <>
              <div className="mt-4">
                <p className="mb-1.5 text-xs font-medium text-neutral-400">Remind me for</p>
                <div className="flex flex-wrap gap-1.5">
                  {PRAYER_ORDER.map((p) => {
                    const on = prayers.has(p);
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => togglePrayer(p)}
                        className={cn("rounded-full px-3 py-1.5 text-xs font-semibold transition-colors", on ? "bg-emerald-700 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200")}
                      >
                        {PRAYER_META[p].label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-neutral-400">Remind before</span>
                  <select value={leadMinutes} onChange={(e) => setLeadMinutes(Number(e.target.value))} className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-900 outline-none focus:border-emerald-400">
                    {[0, 5, 10, 15, 30].map((m) => (
                      <option key={m} value={m}>{m === 0 ? "At the time" : `${m} min before`}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-neutral-400">Follow-up nudge</span>
                  <select value={followupMinutes} onChange={(e) => setFollowupMinutes(Number(e.target.value))} className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-900 outline-none focus:border-emerald-400">
                    {[0, 10, 15, 20, 30].map((m) => (
                      <option key={m} value={m}>{m === 0 ? "Off" : `${m} min after`}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-3">
                <p className="mb-1.5 text-xs font-medium text-neutral-400">Quiet hours (no reminders)</p>
                <div className="flex items-center gap-2">
                  <input type="time" value={quietStart} onChange={(e) => setQuietStart(e.target.value)} className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-900 outline-none focus:border-emerald-400" />
                  <span className="text-xs text-neutral-400">to</span>
                  <input type="time" value={quietEnd} onChange={(e) => setQuietEnd(e.target.value)} className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-900 outline-none focus:border-emerald-400" />
                  {(quietStart || quietEnd) && (
                    <button type="button" onClick={() => { setQuietStart(""); setQuietEnd(""); }} className="shrink-0 rounded-full bg-neutral-100 px-2.5 py-1.5 text-xs font-semibold text-neutral-500 hover:bg-neutral-200">Clear</button>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <button type="button" onClick={sendTest} disabled={busy} className="flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-200 disabled:opacity-60">
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Send a test
                </button>
                <span className="flex items-center gap-1 text-xs font-medium text-neutral-400" aria-live="polite">
                  {status === "saving" && <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</>}
                  {status === "saved" && <><Check className="h-3.5 w-3.5 text-emerald-600" /> Saved</>}
                </span>
              </div>
              {testMsg && <p className="mt-2 text-xs font-medium text-emerald-600">{testMsg}</p>}
            </>
          )}
        </>
      )}

      {error && <p className="mt-2 text-xs font-medium text-rose-600">{error}</p>}
    </div>
  );
}
