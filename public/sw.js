/* TLV Academic service worker.
   - Precaches the offline page and icons.
   - /_next/static: cache-first (files are content-hashed, safe forever).
   - Member pages: network-first, falling back to the last copy seen on this phone, then /offline.
   - Admin pages, auth routes and API calls are never cached.
   - Page cache is cleared on sign-out (CLEAR_PAGES message) because pages hold personal data.
   Bump VERSION when this file changes. */
const VERSION = 'v1';
const STATIC = `tlv-static-${VERSION}`;
const PAGES = `tlv-pages-${VERSION}`;
const PRECACHE = ['/offline', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];
const CACHEABLE_PAGES = ['/today', '/plan', '/support', '/updates', '/profile', '/assignments'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => ![STATIC, PAGES].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'CLEAR_PAGES') event.waitUntil(caches.delete(PAGES));
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Supabase calls go straight to the network

  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(request).then((hit) => hit || fetch(request).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(STATIC).then((c) => c.put(request, copy)); }
        return res;
      }))
    );
    return;
  }

  if (request.mode === 'navigate') {
    const cacheable = CACHEABLE_PAGES.some((p) => url.pathname === p || url.pathname.startsWith(p + '/'));
    event.respondWith(
      fetch(request)
        .then((res) => {
          // Only keep real pages (not redirects to sign-in) for member routes.
          if (cacheable && res.ok && !res.redirected) {
            const copy = res.clone();
            caches.open(PAGES).then((c) => c.put(url.pathname, copy));
          }
          return res;
        })
        .catch(async () => (cacheable && (await caches.match(url.pathname, { cacheName: PAGES }))) || caches.match('/offline'))
    );
  }
});
