"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, Share, WifiOff, X } from "lucide-react";

const DISMISS_KEY = "habits-install-dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const noopSubscribe = () => () => {};

/** "standalone" (already installed), "ios" (needs manual Add to Home Screen), or "browser". */
function readEnv(): string {
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standalone) return "standalone";
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && navigator.maxTouchPoints > 1);
  let dismissed = false;
  try {
    dismissed = localStorage.getItem(DISMISS_KEY) === "1";
  } catch {}
  return `${ios ? "ios" : "browser"}${dismissed ? ":dismissed" : ""}`;
}

/**
 * Nudges the user to install the Habits app: a one-tap install on Chromium/Android (via
 * `beforeinstallprompt`) and Share → Add to Home Screen instructions on iOS. Hidden once installed
 * or dismissed.
 */
export function InstallPrompt() {
  const env = useSyncExternalStore(noopSubscribe, readEnv, () => "standalone");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    function onPrompt(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setDeferred(null);
      setHidden(true);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (hidden || env === "standalone" || env.endsWith(":dismissed")) return null;
  const isIos = env === "ios";
  // On non-iOS browsers only show once the browser says the app is installable.
  if (!isIos && !deferred) return null;

  function dismiss() {
    setHidden(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    if (choice.outcome === "accepted") setHidden(true);
  }

  return (
    <div className="h-card mb-3 flex items-center gap-3 border-h-brand/30 bg-h-brand-soft/60 p-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/habits-icon-192.png" alt="" className="h-11 w-11 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-extrabold leading-tight">Install Habits</p>
        <p className="text-[11px] leading-snug text-h-muted">
          {isIos ? (
            <>
              Tap <Share className="mx-0.5 inline h-3 w-3 align-[-1px]" /> then{" "}
              <span className="font-bold">Add to Home Screen</span> for a full-screen app.
            </>
          ) : (
            "Add it to your home screen for a full-screen app that works offline."
          )}
        </p>
      </div>
      {!isIos && (
        <button
          type="button"
          onClick={install}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-h-brand px-3 py-2 text-xs font-extrabold text-h-brand-fg"
        >
          <Download className="h-3.5 w-3.5" />
          Install
        </button>
      )}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-h-muted hover:bg-h-surface2"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

/** Slim banner shown while the device has no connection. */
export function OfflineBadge() {
  const online = useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true
  );
  if (online) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-[90] flex items-center justify-center gap-2 bg-h-fg px-4 pb-1.5 pt-[max(0.375rem,env(safe-area-inset-top))] text-[11px] font-bold text-h-bg"
    >
      <WifiOff className="h-3.5 w-3.5" />
      You&apos;re offline — changes can&apos;t be saved until you reconnect
    </div>
  );
}
