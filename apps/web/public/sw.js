// Spendy service worker — installability + push notification delivery.
// Deliberately does not implement offline caching: this app's data (balances,
// transactions) must never be served stale, so there's no cache-first
// strategy here, just enough of a fetch handler for PWA install criteria.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Pass-through network fetch — no caching. Present only so the browser
  // recognizes this as a "real" service worker for install eligibility.
});

// Fired whether the app is in a background tab, minimized, or fully closed
// (as long as the service worker itself is still registered) — this is what
// makes "notify even when not actively using the app" possible at all.
self.addEventListener("push", (event) => {
  let payload = { title: "Spendy", body: "You have an update." };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    // Not JSON — fall back to the default payload rather than throwing away
    // a notification the server did intend to send.
  }

  const { title, ...options } = payload;
  options.icon = options.icon || "/icons/icon-192.png";
  options.badge = options.badge || "/icons/icon-192.png";
  options.data = { url: payload.url || "/", ...options.data };

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, options);

      // If the app happens to already be open in a foreground tab, also
      // hand it the payload directly — the page can show an in-app toast
      // instead of relying solely on the OS-level notification banner
      // (some browsers suppress/soften those while the tab is focused).
      const clientsList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clientsList) {
        client.postMessage({ type: "push-notification", payload });
      }
    })()
  );
});

// A notification's "url" travels through unchanged from the server payload
// (see lib/push.ts on the API side) — usually the specific statement that
// finished processing, so tapping the notification lands you exactly there
// instead of just the app's home screen.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const target = new URL(url, self.location.origin).href;

      for (const client of clientsList) {
        if (client.url === target && "focus" in client) {
          return client.focus();
        }
      }
      // Reuse any open Spendy tab (navigating it) rather than always opening
      // a new one, when no exact URL match was already open.
      if (clientsList.length > 0 && "navigate" in clientsList[0]) {
        await clientsList[0].focus();
        return clientsList[0].navigate(target);
      }
      return self.clients.openWindow(target);
    })()
  );
});
