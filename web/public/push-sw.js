self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  try {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'Live update';
    const options = {
      body: data.body || '',
      tag: data.tag || 'liveblog-update',
      icon: data.icon || '/favicon.svg',
      badge: data.badge || '/favicon.svg',
      data: { url: data.url },
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch {
    // ignore invalid payloads
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification && event.notification.data && event.notification.data.url;
  if (!url) return;
  event.waitUntil((async () => {
    const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windowClients) {
      if (client.url === url && 'focus' in client) {
        return client.focus();
      }
    }
    if (self.clients.openWindow) return self.clients.openWindow(url);
  })());
});

