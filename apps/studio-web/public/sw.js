/**
 * Service worker: cache-first for same-origin shell assets, network fallback for
 * navigations, and an offline fallback to the cached shell.
 *
 * Version the cache name whenever the precache list changes; old caches are
 * dropped on activation.
 */
const CACHE = 'microapp-shell-v3';
const SHELL = [
  '/',
  '/manifest.webmanifest',
  '/theme-init.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/sandbox-bootstrap.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      for (const asset of SHELL) {
        try {
          await cache.add(asset);
        } catch {
          // A missing optional asset must not block installation.
        }
      }
      await self.skipWaiting();
    }),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Worker bundles are addressed by fragment-only differences (Turbopack), and
  // the Cache API ignores fragments — caching them would cross-wire workers.
  if (
    request.destination === 'worker' ||
    request.destination === 'sharedworker' ||
    request.destination === 'serviceworker' ||
    url.pathname.includes('turbopack-worker')
  ) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(CACHE);
          cache.put('/', fresh.clone());
          return fresh;
        } catch {
          const cached = await caches.match('/');
          return cached ?? Response.error();
        }
      })(),
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE);
          cache.put(request, response.clone());
        }
        return response;
      } catch {
        return Response.error();
      }
    })(),
  );
});
