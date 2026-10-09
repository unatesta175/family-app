"use client";

import { useEffect } from "react";

/**
 * Registers the service worker and, crucially, keeps it up to date: when a new version is deployed we
 * activate it immediately and reload the page once, so a plain refresh always lands on the freshest
 * client. Without this, a stale cached client can keep running after a deploy and every server action
 * (logging a prayer, switching profile) fails until the app is reinstalled.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    let reloaded = false;
    // When the active service worker changes (a new version took control), reload once to pick up the
    // matching client bundle. The guard prevents reload loops.
    const onControllerChange = () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    navigator.serviceWorker
      // updateViaCache: "none" means the browser never serves /sw.js from HTTP cache, so new versions
      // are always detected on load.
      .register("/sw.js", { updateViaCache: "none" })
      .then((reg) => {
        // If an updated worker is already waiting, tell it to take over now.
        if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
        reg.addEventListener("updatefound", () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            // A new worker has installed while an old one still controls the page: hand over now.
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              reg.waiting?.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });
        // Check for a new deployment on load (and the browser will also check periodically).
        reg.update().catch(() => undefined);
      })
      .catch(() => {
        // Installability degrades gracefully without a service worker (e.g. insecure context).
      });

    return () => navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
  }, []);

  return null;
}
