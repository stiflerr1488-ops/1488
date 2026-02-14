/* NP.Maps — SW cache (v109) — stable update, no mid-load takeover */
const CACHE = 'npmaps-v109';
const CORE = [
  './offline.html',
  './privacy.html',
  './offer.html',
  './css/styles.css?v=109',
  './js/core.js?v=109',
  './js/home.js?v=109',
  './js/doc.js?v=109',
  './js/services.js?v=109',
  './manifest.webmanifest?v=109',
  './img/icons/np-logo-light.webp',
  './img/icons/np-logo-dark.webp',
  './img/hero-map.svg',
  './img/ui-icons/list.svg',
  './img/ui-icons/message.svg',
  './img/ui-icons/star.svg',
  './img/ui-icons/clock.svg',
  './img/ui-icons/price-tag.svg',
  './img/icons/nav/01-home.svg?v=109',
  './img/icons/nav/02-warning.svg?v=109',
  './img/icons/nav/03-sparkles.svg?v=109',
  './img/icons/nav/04-list.svg?v=109',
  './img/icons/nav/05-edit.svg?v=109',
  './img/icons/nav/06-calendar.svg?v=109',
  './img/icons/nav/07-box.svg?v=109',
  './img/icons/nav/08-briefcase.svg?v=109',
  './img/icons/nav/09-shield-check.svg?v=109',
  './img/icons/nav/10-user.svg?v=109',
  './img/icons/nav/11-help.svg?v=109',
  './img/icons/nav/12-phone.svg?v=109',
  './img/icons/nav/13-telegram.svg?v=109',
  './img/icons/nav/14-chart.svg?v=109',
  './downloads/review-request-script.txt',
  './downloads/reply-regulation.txt',
  './downloads/card-packaging-checklist.txt',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE)).catch(() => null)
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .catch(() => null)
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navigations: always network-first (prevents "two versions" mixing).
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .catch(async () => (await caches.match('./offline.html')) || Response.error())
    );
    return;
  }

  // Static assets: cache-first, update cache in background.
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            caches.open(CACHE).then((c) => c.put(req, res.clone())).catch(() => null);
          }
          return res;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
