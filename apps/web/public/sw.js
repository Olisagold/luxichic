/* LUXICHIC service worker: shows push notifications and opens the right page when one is tapped. */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'LUXICHIC', body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'LUXICHIC';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-96.png',
      tag: data.tag || undefined,
      data: { url: data.url || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const w of windows) {
        if (w.url === url && 'focus' in w) return w.focus();
      }
      const open = windows.find((w) => 'navigate' in w && new URL(w.url).origin === self.location.origin);
      if (open) return open.navigate(url).then((w) => w && w.focus());
      return self.clients.openWindow(url);
    }),
  );
});
