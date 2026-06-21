// Wrong Way PWA Service Worker
const CACHE = 'wrongway-v74';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(['/', '/index.html', '/js/i18n.js', '/js/game-logic.js', '/js/ai.js', '/js/sound.js']))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => {
        return self.clients.matchAll().then(clients => {
          clients.forEach(client => client.postMessage({type:'SW_UPDATED'}));
        });
      })
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = req.url;
  if (!url.includes('wrongway.app')) return;
  // HTML/Navigation immer frisch vom Netz holen (umgeht den Browser-Cache),
  // damit neue Versionen sofort erscheinen. Cache nur als Offline-Fallback.
  const isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  e.respondWith(
    fetch(isHTML ? new Request(req.url, {cache: 'reload'}) : req)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req).then(r => r || caches.match('/index.html')))
  );
});
