// Wrong Way PWA Service Worker
const CACHE = 'wrongway-v140';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(['/', '/index.html', '/js/i18n.js', '/js/game-logic.js', '/js/ai.js', '/js/sound.js', '/js/vendor/react.production.min.js', '/js/vendor/react-dom.production.min.js', '/js/vendor/babel.min.js']))
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
      .catch(() => caches.match(req, {ignoreSearch: true}).then(r => {
        // ignoreSearch: index.html fragt z.B. js/i18n.js?v=102 an, der Precache speichert ohne ?v= —
        // ohne diese Option matcht der Cache nie und jeder Offline-Start nach SW-Update bricht.
        if (r) return r;
        // HTML-Fallback NUR fuer Seiten-Aufrufe: eine JS-/Asset-Anfrage darf nie index.html bekommen
        // (sonst SyntaxError "Unexpected token '<'" und die App startet nicht mehr).
        return isHTML ? caches.match('/index.html') : Response.error();
      }))
  );
});
