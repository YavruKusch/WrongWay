// Wrong Way PWA Service Worker
const CACHE = 'wrongway-v1';
const OFFLINE = ['/WrongWay/', '/WrongWay/index.html'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(OFFLINE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Firebase und externe APIs immer live laden
  if (e.request.url.includes('firebase') ||
      e.request.url.includes('googleapis') ||
      e.request.url.includes('gstatic')) {
    return;
  }
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
