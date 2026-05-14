// ============================================================================
// src/lib/posthog.server.ts — Capture PostHog côté serveur (Cloudflare Workers)
// ============================================================================
//
// Use case principal : tracker depuis le webhook Stripe (events serveur uniquement).
// Pas de SDK (posthog-node est lourd pour CF Workers). On utilise l'API HTTP
// directement.
//
// Variables d'env requises côté serveur :
//   - POSTHOG_KEY   = clé du projet PostHog (peut être la même que côté frontend)
//   - POSTHOG_HOST  = https://eu.i.posthog.com (par défaut)
//
// Toutes les fonctions sont silencieuses en cas d'erreur — on ne casse JAMAIS
// le webhook Stripe pour un event analytics manqué.
// ============================================================================

interface CaptureOptions {
  distinctId: string;
  event: string;
  properties?: Record<string, unknown>;
}

export async function captureServer({
  distinctId,
  event,
  properties,
}: CaptureOptions): Promise<void> {
  const apiKey = process.env.POSTHOG_KEY;
  const apiHost = process.env.POSTHOG_HOST ?? "https://eu.i.posthog.com";

  if (!apiKey) {
    console.info("[analytics:server] POSTHOG_KEY missing — event skipped");
    return;
  }

  try {
    const res = await fetch(`${apiHost}/i/v0/e/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        event,
        distinct_id: distinctId,
        properties,
        timestamp: new Date().toISOString(),
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.warn(
        `[analytics:server] capture failed (${res.status}): ${text}`,
      );
    }
  } catch (err) {
    console.warn(
      "[analytics:server] capture network error",
      err instanceof Error ? err.message : String(err),
    );
  }
}
