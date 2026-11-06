/* ExamForge service worker — lets the site open and work offline.
   Our own files: network first (so updates show up straight away), cache as the offline fallback.
   Images (school crests, 3D icons), fonts, icons and Three.js: cache first (their URLs never change). */
const VERSION = 'ef-profile-auth-v17';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/js/config.js',
  './assets/css/app.css',
  './assets/css/skin.css',
  './assets/css/blend.css',
  './assets/css/profile.css',
  './assets/img/emby-mark.svg',
  './assets/js/content/religion.js',
  './assets/js/content/french.js',
  './assets/js/content/chemistry.js',
  './assets/js/content/biology.js',
  './assets/js/content/pe.js',
  './assets/js/content/business.js',
  './assets/js/content/history.js',
  './assets/js/content/g10-english.js',
  './assets/js/content/g10-math.js',
  './assets/js/content/g10-physics.js',
  './assets/js/content/g10-hsb.js',
  './assets/js/content/g10-it.js',
  './assets/js/content/g10-geography.js',
  './assets/js/content/g10-social.js',
  './assets/js/content/g10-pob.js',
  './assets/js/core/ui.js',
  './assets/js/core/look.js',
  './assets/js/core/blocks.js',
  './assets/js/core/three-scenes.js',
  './assets/js/core/skeleton.js',
  './assets/js/core/widgets.js',
  './assets/js/core/study.js',
  './assets/js/core/learn.js',
  './assets/js/core/play.js',
  './assets/js/core/live.js',
  './assets/js/core/cloud.js',
  './assets/js/core/profile-media.js',
  './assets/js/core/account-auth.js',
  './assets/js/core/motion.js',
  './assets/js/core/app.js',
  './assets/icons/icon-192.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // school crests and 3D icons never change under the same name: serve them from the cache when we have them
  if (url.origin === self.location.origin && url.pathname.includes('/assets/img/')) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
        return res;
      }))
    );
    return;
  }

  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
          return res;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error())))
    );
    return;
  }

  const cdn = /^(fonts\.googleapis\.com|fonts\.gstatic\.com|cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|upload\.wikimedia\.org|thumb\.wikimedia\.org)$/.test(url.hostname);
  if (cdn) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
        return res;
      }))
    );
  }
});
