const CACHE_NAME = 'stocksystem-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/manifest.json',
  '/css/style.css',
  '/js/app.js'
];

// Instala o service worker e armazena em cache os arquivos principais
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

// Intercepta requisições e responde com cache quando possível
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});

// Atualiza o cache quando uma nova versão for publicada
self.addEventListener('activate', event => {
  const allowlist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!allowlist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
