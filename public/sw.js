// Only static assets and the generic offline shell are persisted. Never store member HTML.
const VERSION = 'v2';
const STATIC = `tlv-static-${VERSION}`;
const PRECACHE = ['/offline', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys
    .filter((key) => key.startsWith('tlv-') && key !== STATIC)
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
