import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { NetworkFirst } from "workbox-strategies";

// Precache all assets injected by vite-plugin-pwa
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Runtime: Supabase API calls — network first, short cache
registerRoute(
  ({ url }) => url.href.includes(".supabase.co"),
  new NetworkFirst({
    cacheName: "supabase-cache",
    plugins: [{ maxEntries: 50, maxAgeSeconds: 300 }],
  })
);

// Push event — muestra notificación al dealer
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "oX NEXMOV", body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "oX NEXMOV", {
      body: payload.body || "",
      icon: "/favicon.svg",
      badge: "/favicon.ico",
      tag: payload.tag || "ox-lead",
      data: { url: payload.url || "/" },
      requireInteraction: true,
      vibrate: [200, 100, 200],
    })
  );
});

// Notification click — foca ventana o abre app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((wins) => {
        const existing = wins.find((w) => !w.url.includes("about:blank"));
        if (existing && "focus" in existing) {
          return existing.navigate(targetUrl).then(() => existing.focus());
        }
        return clients.openWindow(targetUrl);
      })
  );
});
