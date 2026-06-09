// Odemes service worker — app-shell caching for a native-app feel.
// Strategy:
//   • Supabase (auth / data)        → never touched, always live network.
//   • Same-origin app shell         → stale-while-revalidate (instant load, updates in background).
//   • Trusted CDNs (React/Babel/fonts) → cache-first (immutable, versioned URLs).
const VERSION = 'odemes-v1';
const SHELL_CACHE = `${VERSION}-shell`;
const CDN_CACHE = `${VERSION}-cdn`;

// Local files that make up the app shell. Pre-cached on install so the app
// can boot offline. Kept in sync with the <script> tags in index.html.
const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './tweaks-panel.jsx',
  './data.jsx',
  './supabase.jsx',
  './i18n.jsx',
  './icons.jsx',
  './shell.jsx',
  './page-home.jsx',
  './page-transactions.jsx',
  './page-recurring.jsx',
  './page-report.jsx',
  './page-settings.jsx',
  './page-auth.jsx',
  './app.jsx',
  './favicon.ico',
  './assets/logo-black.png',
  './assets/logo-white.png',
  './assets/apple-touch-icon.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
];

const CDN_HOSTS = ['unpkg.com', 'cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch { return; }

  // Never intercept Supabase (auth tokens, live financial data) or any non-http(s).
  if (url.hostname.includes('supabase')) return;
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Trusted CDNs: cache-first (these URLs are version-pinned / immutable).
  if (CDN_HOSTS.includes(url.hostname)) {
    event.respondWith(cacheFirst(req, CDN_CACHE));
    return;
  }

  // Same-origin app shell: stale-while-revalidate.
  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(req, SHELL_CACHE));
  }
});

function cacheFirst(req, cacheName) {
  return caches.open(cacheName).then((cache) =>
    cache.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
        return res;
      });
    })
  );
}

function staleWhileRevalidate(req, cacheName) {
  return caches.open(cacheName).then((cache) =>
    cache.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
}

// Allow the page to trigger an immediate activation after an update.
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
