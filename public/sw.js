const VERSION = "v4";
const RUNTIME_CACHE = `istiqamahly-runtime-${VERSION}`;
const KEEP = [RUNTIME_CACHE];

// Small shell that must work offline: the fallback page and the app icons.
const PRECACHE = [
  "/offline.html",
  "/icons/icon-192.png",
  "/icons/habits-icon-192.png",
  "/icons/habits-icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(RUNTIME_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !KEEP.includes(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// The app asks us to forget cached pages on logout so the next person on a shared device
// never sees a previous user's data offline.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "CLEAR_PAGES") {
    event.waitUntil(caches.delete(RUNTIME_CACHE));
  }
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Network-first for everything on our own origin. This is deliberate: the app is online-first, and a
// cache-first strategy for build assets could keep serving an OLD client bundle after a deploy, whose
// server-action ids no longer match the new server — which breaks every mutation (logging a prayer,
// switching profile) until the app is reinstalled. Network-first means a normal refresh always loads
// the fresh, matching client when online, and the cache is only a fallback when truly offline.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return; // never cache auth / export / cron endpoints

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache a copy of successful same-origin responses for offline fallback only.
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((hit) => {
          if (hit) return hit;
          if (request.mode === "navigate") return caches.match("/offline.html");
          return Response.error();
        })
      )
  );
});

// --- Prayer reminders (Web Push) -------------------------------------------------------------
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "" };
  }
  const title = payload.title || "Prayer reminder";
  const options = {
    body: payload.body || "",
    tag: payload.tag,
    renotify: Boolean(payload.tag),
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: payload.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(target).catch(() => {});
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
