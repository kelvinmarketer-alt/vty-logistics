/* =========================================================
   VTY Logistics — Service Worker (PWA offline + cache)
   ========================================================= */
const CACHE_VERSION = 'vty-v1';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/styles/tokens.css',
  '/styles/app.css',
  '/scripts/shared.js',
  '/scripts/store.js',
  '/scripts/auth.js',
  '/pages/login.html',
  '/pages/dashboard.html',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_VERSION).then(cache =>
      cache.addAll(CORE_ASSETS).catch(err => console.warn('[SW] Pre-cache miss:', err))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  /* Xóa cache cũ */
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  /* Strategy: Cache First, fallback Network, save to cache */
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE_VERSION).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match('/pages/login.html'));
    })
  );
});
