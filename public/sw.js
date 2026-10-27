// sw.js — Service Worker de Pausa (PWA).
// Estrategia sencilla y segura para no servir versiones antiguas tras un deploy:
//  - App shell (navegaciones): network-first con fallback a caché (offline).
//  - Assets con hash de Vite (/assets/...): cache-first (nunca cambian de nombre).
// Solo se guardan respuestas buenas: nunca una página de error o el HTML de la
// app en lugar de un archivo de código.
// Sube CACHE_VERSION cuando quieras invalidar todo a mano.
const CACHE_VERSION = "pausa-v2";
const OFFLINE_URL = "/index.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(["/", OFFLINE_URL]))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // no tocar Firebase, fuentes, etc.

  // Navegaciones (documento HTML): network-first.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(OFFLINE_URL, copy));
          }
          return res;
        })
        .catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Assets con hash: cache-first.
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            const isHtml = (res.headers.get("content-type") || "").includes("text/html");
            if (res.ok && !isHtml) {
              const copy = res.clone();
              caches.open(CACHE_VERSION).then((c) => c.put(request, copy));
            }
            return res;
          })
      )
    );
  }
});
