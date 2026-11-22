// Offline cache: app shell first, network for everything else with cache fallback.
// Poster art (image.tmdb.org) is cache first in its own cache, so a poster seen once still shows offline.
const V = 'peek-v59';
const ART = 'peek-art-v1';
const SHELL = ['./', 'index.html', 'styles.css', 'web.css', 'sfx.js', 'app.js', 'web.js', 'qrcode.min.js', 'films.json', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/icon.svg',
  'fonts/barlow-condensed-latin-600-italic.woff2', 'fonts/barlow-condensed-latin-700-italic.woff2', 'fonts/barlow-condensed-latin-900-italic.woff2', 'fonts/anton-latin-400-normal.woff2', 'fonts/archivo-latin-400-normal.woff2', 'fonts/archivo-latin-700-normal.woff2',
  ...['calm', 'curious', 'ready', 'cantlook', 'earsdown', 'scared', 'wave-1', 'cover-round', 'sit-0-cover', 'sit-1-peek', 'sit-2-bandaid', 'sit-3-shades',
    'boo-1-crouch', 'boo-2-rise', 'boo-3-pop', 'boo-4-land'].map(k => `cats/${k}.svg`)];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k !== ART).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.hostname === 'image.tmdb.org') {
    e.respondWith(caches.open(ART).then(c => c.match(e.request).then(hit => hit || fetch(e.request).then(r => {
      if (r.ok) c.put(e.request, r.clone());
      return r;
    }))));
    return;
  }
  e.respondWith(
    fetch(e.request).then(r => {
      if (r.ok && url.origin === location.origin) {
        const copy = r.clone(); caches.open(V).then(c => c.put(e.request, copy));
      }
      return r;
    }).catch(() => caches.match(e.request))
  );
});
