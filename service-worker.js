/* The Ticket Rail — service worker (v2)
   Caches the app shell (now including the ZXing scanner library) so the app opens
   and scans offline. Data lives in localStorage and syncs to your Google Sheet when
   online. Only the AI review and Open Food Facts lookups need a live connection. */

const CACHE = 'ticketrail-v2';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './zxing.min.js',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Never cache the backend, the Anthropic API, or Open Food Facts — always network.
  if (req.url.includes('script.google.com') ||
      req.url.includes('googleusercontent.com') ||
      req.url.includes('api.anthropic.com') ||
      req.url.includes('openfoodfacts.org')) {
    return;
  }

  if (req.method === 'GET') {
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req).then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }).catch(() => cached);
        return cached || network;
      })
    );
  }
});
