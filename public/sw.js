// Service worker minimal : installabilité PWA + repli hors ligne statique.
//
// Ne met en cache QUE le strict statique (manifeste, icônes, page de repli)
// et UNIQUEMENT pour les navigations complètes (request.mode === "navigate").
// Tout le reste — API, Server Actions, données RSC, assets /_next/* — passe
// directement au réseau, jamais mis en cache : le planning et le statut de
// pointage doivent toujours venir du serveur, jamais d'un cache qui pourrait
// être périmé. La file d'attente de pointage (offline) tourne côté client
// dans l'onglet ouvert (src/lib/clock-queue.ts), pas ici.

const CACHE_NAME = "dl-proprete-shell-v1";
const SHELL_ASSETS = ["/manifest.webmanifest", "/icons/192", "/icons/512", "/offline.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match("/offline.html")),
  );
});
