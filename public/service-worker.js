// Service Worker para Push Notifications e Cache

const CACHE_NAME = "stocksystem-cache-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/pwa-192x192.png",
  "/pwa-512x512.png",
  "/manifest.json",
];

// Instala o service worker e armazena em cache os arquivos principais
self.addEventListener("install", (event) => {
  console.log("Service Worker instalado");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache).catch((err) => {
        console.log("Erro ao adicionar ao cache:", err);
      });
    })
  );
  self.skipWaiting();
});

// Ativa o service worker
self.addEventListener("activate", (event) => {
  console.log("Service Worker ativado");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("Removendo cache antigo:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  event.waitUntil(clients.claim());
});

// Listener para push notifications
self.addEventListener("push", (event) => {
  console.log("Push event recebido", event);

  let data = {
    title: "StockSystem",
    body: "Você tem uma nova notificação",
    icon: "/pwa-192x192.png",
    badge: "/pwa-64x64.png",
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body || data.message,
    icon: data.icon || "/pwa-192x192.png",
    badge: data.badge || "/pwa-64x64.png",
    data: data.data || {},
    tag: data.tag || "notification",
    requireInteraction: data.requireInteraction || false,
    vibrate: [200, 100, 200], // Vibra no celular
    actions: [
      {
        action: "open",
        title: "Abrir Sistema",
      },
      {
        action: "close",
        title: "Fechar",
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "StockSystem", options)
  );
});

// Listener para cliques em notificações
self.addEventListener("notificationclick", (event) => {
  console.log("Notificação clicada", event);

  event.notification.close();

  // Se o usuário clicou em "Abrir Sistema"
  if (event.action === "open" || !event.action) {
    event.waitUntil(
      clients
        .matchAll({
          type: "window",
          includeUncontrolled: true,
        })
        .then((clientList) => {
          // Se já existe uma janela aberta, foca nela
          for (let i = 0; i < clientList.length; i++) {
            const client = clientList[i];
            if (
              client.url.includes(self.location.origin) &&
              "focus" in client
            ) {
              return client.focus();
            }
          }
          // Caso contrário, abre uma nova janela
          if (clients.openWindow) {
            return clients.openWindow("/");
          }
        })
    );
  }
});

// Intercepta requisições e responde com cache quando possível (opcional)
self.addEventListener("fetch", (event) => {
  try {
    const reqUrl = new URL(event.request.url);

    // Bypass Vite HMR/dev assets and any dev server query strings (t=...), evitar interceptar /@vite, /@react-refresh, /src etc.
    if (
      reqUrl.origin !== location.origin || // manter cross-origin sem interceptação por padrão
      reqUrl.pathname.startsWith("/@vite") ||
      reqUrl.pathname.startsWith("/@react-refresh") ||
      reqUrl.pathname.startsWith("/src") ||
      reqUrl.searchParams.has("t") // Vite cache-busting param
    ) {
      return; // não chamamos event.respondWith e deixamos a requisição seguir ao network normalmente
    }

    event.respondWith(
      (async () => {
        try {
          // trivial fallback: tentar rede primeiro (network-first). Ajuste conforme sua estratégia de cache.
          const networkResponse = await fetch(event.request);
          return networkResponse;
        } catch (err) {
          // Se o fetch falhar, retornamos uma resposta de erro simples (ou podemos tentar cache)
          return new Response("Service Worker fetch failed", {
            status: 504,
            statusText: "Gateway Timeout",
          });
        }
      })()
    );
  } catch (e) {
    // Em caso de URL parsing ou outro erro, não interceptar para não quebrar o dev server
    return;
  }
});
