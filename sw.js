/* =========================================================
   Taj Trader Pro — Service Worker
   Version: v2 (bump this every time you change the app)
   ========================================================= */

const CACHE_NAME = 'taj-trader-v2';

/* Files that must work offline */
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

/* ---------- INSTALL ---------- */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Use individual add() so one missing file doesn't break the whole install
      return Promise.all(
        PRECACHE_URLS.map(url =>
          cache.add(url).catch(err => console.warn('[SW] Skipped:', url, err))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

/* ---------- ACTIVATE ---------- */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

/* ---------- FETCH (offline-first for app shell, network-first for others) ---------- */
self.addEventListener('fetch', event => {
  const req = event.request;

  // Only handle GET requests
  if (req.method !== 'GET') return;

  // Skip cross-origin (WhatsApp, CDN, etc.)
  if (!req.url.startsWith(self.location.origin)) return;

  // For HTML navigation → network first, fall back to cache
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // For everything else → cache first, then network
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;

      return fetch(req).then(res => {
        // Don't cache bad responses
        if (!res || res.status !== 200 || res.type === 'opaque') return res;

        const copy = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, copy));
        return res;
      }).catch(() => {
        // Optional: return a fallback for images
        if (req.destination === 'image') {
          return caches.match('./icon-192.png');
        }
      });
    })
  );
});

/* ---------- MESSAGE (for manual update trigger) ---------- */
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
