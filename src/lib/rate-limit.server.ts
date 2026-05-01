// Rate limiter en mémoire — protège les routes IA d'un user qui spamerait
// (refresh en boucle, bug client, script). NE remplace PAS le quota mensuel,
// c'est un garde-fou anti-burst à la minute.
//
// LIMITATION : "en mémoire" = par instance Worker. Cloudflare Workers ne
// garantit pas qu'un user tape toujours la même instance, donc le rate limit
// est approximatif (peut autoriser 2-3× la limite si plusieurs instances
// servent le même user en parallèle). Suffisant pour bloquer un script qui
// spamme à 100 req/min ; insuffisant pour de la sécurité forte.
//
// Pour une vraie protection, brancher Cloudflare Rate Limiting (au niveau
// du Worker ou via un Durable Object). À faire en V2.

interface Bucket {
  /** Timestamps (ms) des requêtes dans la fenêtre courante. */
  hits: number[];
}

const buckets = new Map<string, Bucket>();

/**
 * Retourne true si la requête peut passer, false sinon.
 *
 * @param key   identifiant de l'utilisateur (id Supabase)
 * @param limit nombre maximum de hits dans la fenêtre
 * @param windowMs durée de la fenêtre en millisecondes
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const cutoff = now - windowMs;

  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { hits: [] };
    buckets.set(key, bucket);
  }

  // Purge les hits hors fenêtre
  bucket.hits = bucket.hits.filter((t) => t > cutoff);

  if (bucket.hits.length >= limit) {
    const oldestInWindow = bucket.hits[0];
    const retryAfterSec = Math.ceil((oldestInWindow + windowMs - now) / 1000);
    return { ok: false, retryAfterSec };
  }

  bucket.hits.push(now);

  // Garbage collection grossier — toutes les 1000 entrées en mémoire on
  // purge celles dont la dernière hit est ancienne, pour éviter la fuite
  // mémoire si le Worker reste up longtemps.
  if (buckets.size > 1000) {
    for (const [k, v] of buckets.entries()) {
      if (v.hits.length === 0 || v.hits[v.hits.length - 1] < now - windowMs * 2) {
        buckets.delete(k);
      }
    }
  }

  return { ok: true };
}

/**
 * Retourne une 429 standardisée avec header Retry-After.
 */
export function rateLimitedResponse(retryAfterSec: number) {
  return new Response(
    JSON.stringify({
      error: `Trop de requêtes — réessaye dans ${retryAfterSec}s.`,
      code: "rate_limited",
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSec),
      },
    },
  );
}
