/* =========================================================
   VTY Logistics — Service Worker (PWA)
   Chiến lược: NETWORK-FIRST cho HTML/JS/CSS (luôn lấy bản mới khi online),
   fallback cache khi offline. Tránh kẹt file cũ như "Cache-First".
   ========================================================= */
const CACHE_VERSION = 'vty-v3-20260601';
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
  /* Xoá toàn bộ cache cũ (kể cả vty-v1 cache-first) */
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  /* Chỉ xử lý cùng origin; bỏ qua API Supabase/CDN để không cache nhầm */
  if (url.origin !== self.location.origin) return;

  /* NETWORK-FIRST: luôn thử mạng trước → cập nhật cache → fallback cache khi offline */
  e.respondWith(
    fetch(req).then(res => {
      if (res && res.ok && res.type === 'basic') {
        const clone = res.clone();
        caches.open(CACHE_VERSION).then(c => c.put(req, clone));
      }
      return res;
    }).catch(() =>
      caches.match(req).then(cached =>
        cached || (req.mode === 'navigate' ? caches.match('/pages/login.html') : undefined)
      )
    )
  );
});
