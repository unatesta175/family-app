"use client";

import { useSyncExternalStore } from "react";
import { CheckCheck, X } from "lucide-react";

const SEEN_KEY = "istiqamahly_status_legend_seen";

const DISMISS_EVENT = "istiqamahly-status-legend-dismissed";

function subscribe(callback: () => void) {
  window.addEventListener(DISMISS_EVENT, callback);
  return () => window.removeEventListener(DISMISS_EVENT, callback);
}

function getSnapshot(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) !== null;
  } catch {
    // localStorage unavailable (private mode, etc) — treat as "seen" so the tip just never
    // shows rather than erroring or getting stuck.
    return true;
  }
}

function getServerSnapshot(): boolean {
  return true;
}

/**
 * A one-time coachmark explaining the status pills below it — specifically that "On Time+J"
 * means on time AND in jamaah (congregation), not just on time. First-time users kept
 * misreading the compact "+J" suffix at a glance and missing that distinction entirely.
 * Shown once ever per browser (localStorage), then gone for good.
 */
export function StatusLegendTip() {
  const seen = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function dismiss() {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      // nothing to persist to — it'll just show again next visit, not worth surfacing an error
    }
    window.dispatchEvent(new Event(DISMISS_EVENT));
  }

  if (seen) return null;

  return (
    <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600">
        <CheckCheck className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
      </div>
      <div className="flex-1 text-xs leading-relaxed text-emerald-900">
        <span className="font-bold">On Time+J</span> means prayed on time <span className="font-bold">and</span> in
        jamaah (congregation) &mdash; the best status. Plain <span className="font-bold">On Time</span> means alone,
        and <span className="font-bold">Jamaah</span> means in congregation but not necessarily on time.
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 rounded-full p-1 text-emerald-500 hover:bg-emerald-100 hover:text-emerald-700"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
