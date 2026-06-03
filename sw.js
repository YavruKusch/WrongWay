// Wrong Way PWA Service Worker - minimal caching
const CACHE = 'wrongway-v2';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(['/WrongWay/', '/WrongWay/index.html']))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;
  // Alles außer dem eigenen index.html direkt vom Netz laden
  if (!url.includes('yavrukusch.github.io/WrongWay')) return;
  // Nur HTML aus Cache, alles andere live
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match('/WrongWay/index.html'))
  );
});
