/* Tide of Steel WW2 — service worker.
   Strategy: network-first for same-origin GETs, so a player who is online always
   pulls the newest index.html the moment you push a change; falls back to the
   cached copy when offline, so the game still plays with no connection.
   Bump CACHE_VERSION when you want every installed app to show the
   "Update ready — reload" banner (e.g. after changing icons/manifest). */
const CACHE_VERSION = 'v1';
const CACHE = 'tide-of-steel-' + CACHE_VERSION;
const CORE = [
  './', './index.html', './manifest.webmanifest',
  './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'
];

self.addEventListener('install', e => {
  // precache the shell, but WAIT (don't skipWaiting) so the page can offer an update banner
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let url; try { url = new URL(req.url); } catch (_) { return; }
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(req)
      .then(res => {
        // stash a fresh copy for offline use
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() =>
        caches.match(req).then(hit => hit || caches.match('./index.html'))
      )
  );
});

// the page asks the waiting worker to take over when the player taps "Update"
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
