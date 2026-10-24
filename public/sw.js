// Only static assets and the generic offline shell are persisted. Never store member HTML.
const VERSION = 'v4';
const PHOTOS = 'tlv-photos-v1';
const PHOTO_LIMIT = 40;
const STATIC = `tlv-static-${VERSION}`;
const PRECACHE = ['/offline', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys
    .filter((key) => key.startsWith('tlv-') && key !== STATIC && key !== PHOTOS)
    .map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('message', (event) => {
  if (event.data?.type === 'CLEAR_PAGES') {
    event.waitUntil(caches.keys().then((keys) => Promise.all(keys
      .filter((key) => key.startsWith('tlv-pages-')).map((key) => caches.delete(key)))));
  }
});
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Memory-verse nature photos (public images, no personal data): cache-first so they show offline.
  if (url.hostname === 'images.unsplash.com') {
    event.respondWith(caches.open(PHOTOS).then(async (cache) => {
      const hit = await cache.match(request);
      if (hit) return hit;
      const response = await fetch(request);
      if (response.ok || response.type === 'opaque') {
        await cache.put(request, response.clone());
        const keys = await cache.keys();
        if (keys.length > PHOTO_LIMIT) await cache.delete(keys[0]);
      }
      return response;
    }).catch(() => fetch(request)));
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(caches.match(request).then((hit) => hit || fetch(request).then(async (response) => {
      if (response.ok) await (await caches.open(STATIC)).put(request, response.clone());
      return response;
    })));
    return;
  }
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () =>
      (await caches.match('/offline')) || new Response('You are offline. Reconnect and try again.', {
        status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })));
  }
});

// Tapping the focus-timer notification brings the app back to the timer.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/today';
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    const open = list.find((c) => new URL(c.url).origin === self.location.origin);
    if (open) { open.navigate(target).catch(() => {}); return open.focus(); }
    return self.clients.openWindow(target);
  }));
});
