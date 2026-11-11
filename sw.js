/* The Big Carrot · camera kiosk — offline copy (service worker).
 * Keeps this page, the camera scanner and the fonts on the tablet, so the kiosk opens with
 * no internet — even after a restart. Punches themselves are kept by the page (IndexedDB).
 * Change V when you upload a new index.html, so tablets pick up the new copy. */
const V = 'tbc-kiosk-v3.4.0';
const CORE = ['./', './index.html', './html5-qrcode.min.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const keep = (req, res) => { if (res && res.ok) { const c = res.clone(); caches.open(V).then(x => x.put(req, c)); } return res; };
const timeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('slow')), ms))]);

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;                       // punches (POST to Time Hub) are never touched
  const u = new URL(r.url);
  if (u.origin === location.origin) {
    if (r.mode === 'navigate' || /\/$|\.html$/.test(u.pathname)) {
      // the page: newest copy when online (4 s), saved copy when offline
      e.respondWith(timeout(fetch(r), 4000).then(res => keep(r, res))
        .catch(() => caches.match(r).then(m => m || caches.match('./index.html')).then(m => m || caches.match('./'))));
    } else {
      e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => keep(r, res))));
    }
  } else if (/(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(u.hostname) || u.hostname === 'unpkg.com') {
    e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => keep(r, res))));
  }
});
