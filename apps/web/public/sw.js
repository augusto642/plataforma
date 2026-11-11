/* Fase 5 premium (desenho §6.2) — service worker próprio, sem dependência
 * nova. Escopo EXPLÍCITO, para nunca prometer offline total:
 * - app-shell + assets estáticos: cache-first (instalável, abre rápido);
 * - navegação: network-first com fallback ao cache do shell;
 * - API: NETWORK-ONLY, sempre. Nenhuma resposta de API é cacheada e
 *   nenhuma execução de código (Piston) passa por aqui — código fica
 *   SEMPRE online. A revisão offline vive na página /revisao
 *   (localStorage + POST /activities/:id/review-sync ao voltar online),
 *   não neste worker.
 * CSP: o next.config já serve script-src 'self' fora de /ide e /game,
 * então este worker same-origin não quebra a política.
 */
const CACHE = 'nexus-shell-v1';
const SHELL = ['/', '/dashboard', '/revisao', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;
  // API: nunca cachear, nunca servir stale.
  if (url.pathname.startsWith('/api/')) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/dashboard')),
    );
    return;
  }
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then(
        (hit) =>
          hit ||
          fetch(event.request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((cache) => cache.put(event.request, copy));
            }
            return res;
          }),
      ),
    );
  }
});
