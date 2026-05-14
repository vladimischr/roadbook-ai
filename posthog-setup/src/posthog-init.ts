// ============================================================================
// src/lib/posthog-init.ts — Initialisation client PostHog
// ============================================================================
//
// Appelé une seule fois côté client (depuis analytics.ts).
// Lit les env vars VITE_POSTHOG_KEY et VITE_POSTHOG_HOST.
// Ne s'initialise PAS si la clé manque (silencieux, ne casse rien).
// ============================================================================

import posthog from "posthog-js";

let initialized = false;

export function initPostHog(): void {
  if (initialized) return;
  if (typeof window === "undefined") return;

  const apiKey = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
  const apiHost = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) || "https://eu.i.posthog.com";

  if (!apiKey) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.info("[analytics] VITE_POSTHOG_KEY missing — PostHog disabled");
    }
    return;
  }

  try {
    posthog.init(apiKey, {
      api_host: apiHost,
      // Capture des pageviews automatique. Activé pour avoir le funnel complet sans effort.
      capture_pageview: true,
      // Performance : ne pas envoyer en mode debug local
      autocapture: true,
      // Persistance dans localStorage + cookie
      persistence: "localStorage+cookie",
      // RGPD-friendly defaults pour un projet français
      respect_dnt: true,
      // Pas de session recording par défaut (privacy + coût). Activer plus tard si besoin.
      disable_session_recording: true,
      loaded: (ph) => {
        if (import.meta.env.DEV) {
          ph.debug();
        }
      },
    });
    initialized = true;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[analytics] posthog init failed", err);
  }
}

/**
 * Helper pour exposer l'instance posthog si besoin (rare).
 * Préférer les fonctions de `analytics.ts` dans le code applicatif.
 */
export { posthog };
