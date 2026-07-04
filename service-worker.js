/* The Ticket Rail — service worker
   Caches the app shell so the app opens with no connection. Data itself lives in
   localStorage (instant) and syncs to your Google Sheet when online, so the app is
   fully usable offline for logging; only the AI review needs a live connection. */

const CACHE = 'ticketrail-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
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

  // Never cache the Apps Script backend or the Anthropic API — always go to network.
  if (req.url.includes('script.google.com') ||
      req.url.includes('googleusercontent.com') ||
      req.url.includes('api.anthropic.com')) {
    return; // default network handling
  }

  // App shell: cache-first, fall back to network, update cache in background.
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
