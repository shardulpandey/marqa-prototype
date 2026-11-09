/* MARQA Pipeline prototype: offline shell.
   App files are cached on install; pages are network-first so edits show up,
   fonts and product photos are cached as they are first used. */
const VERSION = 'mq-proto-v4';
const SHELL = [
  './', './index.html', './manifest.webmanifest', './css/app.css', './css/live.css', './css/deals.css',
  './css/dash.css', './css/stock.css', './css/settings.css', './css/saas.css', './js/brand.js',
  './js/images.js', './js/data.js', './js/model.js', './js/records.js', './js/ui.js', './js/logic.js',
  './js/screens-core.js', './js/screens-make.js', './js/screens-grow.js', './js/screens-admin.js',
  './js/screens-deals.js', './js/screens-deal.js', './js/screens-deal-order.js', './js/screens-dash.js',
  './js/screens-stock.js', './js/screens-settings.js', './js/assistant.js', './js/app.js',
  './icons/favicon.svg', './icons/icon-192.png', './icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if (sameOrigin && (req.mode === 'navigate' || /\.(html|js|css|webmanifest)$/.test(url.pathname))) {
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone();
      caches.open(VERSION).then(c => c.put(req, copy));
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res.ok || res.type === 'opaque') {
      const copy = res.clone();
      caches.open(VERSION).then(c => c.put(req, copy));
    }
    return res;
  })));
});
