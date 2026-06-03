// Wrong Way PWA Service Worker
const CACHE = 'wrongway-v4';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(['/', '/index.html']))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => {
        // Alle offenen Tabs über das Update informieren
        return self.clients.matchAll().then(clients => {
          clients.forEach(client => client.postMessage({type:'SW_UPDATED'}));
        });
      })
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;
  if (!url.includes('wrongway.app')) return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match('/index.html'))
  );
});
