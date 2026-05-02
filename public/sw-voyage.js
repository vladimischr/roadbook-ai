// ============================================================================
// Service Worker — voyage PWA
// ============================================================================
// Cache offline pour qu'un voyageur en avion / sans réseau accède quand même
// à son carnet. Stratégies :
//   - Page HTML /voyage/<token>     : network-first (toujours frais si online)
//   - JSON shared-roadbook          : stale-while-revalidate (instantané +
//                                     refresh en arrière-plan)
//   - Images (Pexels, Storage)      : cache-first (immutables en pratique)
//   - JS/CSS bundle                 : cache-first
//
// Note : on ne touche PAS aux pages /dashboard, /new, /clients, etc — le
// scope d'install est limité à /voyage/.

const CACHE_VERSION = "voyage-v2";
const HTML_CACHE = `${CACHE_VERSION}-html`;
const DATA_CACHE = `${CACHE_VERSION}-data`;
const ASSETS_CACHE = `${CACHE_VERSION}-assets`;
const IMG_CACHE = `${CACHE_VERSION}-images`;

self.addEventListener("install", (event) => {
  // Activation immédiate
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Nettoie les anciens caches
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Page HTML voyage : network-first
  if (
    url.origin === self.location.origin &&
    url.pathname.startsWith("/voyage/")
  ) {
    event.respondWith(networkFirst(req, HTML_CACHE));
    return;
  }

  // JSON shared roadbook : stale-while-revalidate
  if (
    url.origin === self.location.origin &&
    url.pathname === "/api/shared-roadbook"
  ) {
    event.respondWith(staleWhileRevalidate(req, DATA_CACHE));
    return;
  }

  // Images (Pexels, Supabase Storage, manifest icon)
  if (
    /\.(png|jpe?g|webp|svg|gif)$/i.test(url.pathname) ||
    url.hostname.includes("pexels") ||
    url.hostname.includes("supabase") ||
    url.pathname === "/api/voyage-icon" ||
    url.pathname === "/api/destination-cover"
  ) {
    event.respondWith(cacheFirst(req, IMG_CACHE));
    return;
  }

  // Bundle JS/CSS du domaine
  if (
    url.origin === self.location.origin &&
    /\.(js|css|woff2?|ttf)$/i.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(req, ASSETS_CACHE));
    return;
  }

  // Sinon : pass-through (laisse le navigateur gérer)
});

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const fresh = await fetch(req);
    if (fresh && fresh.ok) cache.put(req, fresh.clone());
    return fresh;
  } catch (err) {
    const cached = await cache.match(req);
    if (cached) return cached;
    // Fallback minimal si jamais rien en cache : page offline simple
    return new Response(
      `<!doctype html><html lang="fr"><head><meta charset="utf-8">
       <title>Hors ligne</title>
       <meta name="viewport" content="width=device-width, initial-scale=1">
       <style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;
       padding:40px;text-align:center;background:#FAF9F6;color:#1a1a1a}
       h1{font-weight:600;margin-top:60px}</style></head>
       <body><h1>Hors ligne</h1>
       <p>Le carnet n'est pas encore mis en cache. Reconnectez-vous une fois,
       puis vous pourrez l'utiliser sans réseau.</p></body></html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 200 },
    );
  }
}

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const fresh = await fetch(req);
    if (fresh && fresh.ok) cache.put(req, fresh.clone());
    return fresh;
  } catch {
    if (cached) return cached;
    return new Response("", { status: 504 });
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const fetchPromise = fetch(req)
    .then((res) => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => null);
  return cached || fetchPromise || new Response("", { status: 504 });
}
