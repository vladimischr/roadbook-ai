// ============================================================================
// src/lib/meta-pixel.ts — Meta Pixel client (browser-side tracking)
// ============================================================================
//
// Initialise le Meta Pixel et expose une fonction `metaTrack` pour les events
// standards (PageView, Lead, CompleteRegistration, Subscribe, Purchase).
//
// Configuration : VITE_META_PIXEL_ID = "1234567890123456" (Pixel ID Meta)
// Si la var est absente, le module no-op (pas de crash).
//
// Le Pixel est complémentaire à la Conversions API serveur (cf. meta-capi.server.ts).
// La combinaison "Pixel + CAPI" est la setup recommandée par Meta en 2026 :
//  - Pixel = signal côté client (navigateur), partiel à cause des bloqueurs
//  - CAPI = signal côté serveur, fiable, déduplique avec le Pixel via event_id
//
// Référence : https://developers.facebook.com/docs/meta-pixel
// ============================================================================

let initialized = false;
let pixelId: string | undefined;

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

/**
 * Initialise le Meta Pixel. À appeler UNE seule fois au démarrage de l'app.
 * Idempotent.
 */
export function initMetaPixel(): void {
  if (initialized) return;
  if (typeof window === "undefined") return;

  pixelId = import.meta.env.VITE_META_PIXEL_ID as string | undefined;
  if (!pixelId) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.info("[meta-pixel] VITE_META_PIXEL_ID missing — Pixel disabled");
    }
    return;
  }

  // Injection du snippet officiel Meta Pixel (version stripped, équivalente).
  // On évite eval/Function — on définit fbq comme un buffer queue puis on
  // charge async le script Facebook.
  (function (f: Window, b: Document, e: string, v: string) {
    if (f.fbq) return;
    const n: any = function (...args: unknown[]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (n as any).callMethod
        ? (n as any).callMethod.apply(n, args)
        : (n as any).queue.push(args);
    };
    if (!f._fbq) f._fbq = n;
    (n as any).push = n;
    (n as any).loaded = true;
    (n as any).version = "2.0";
    (n as any).queue = [];
    const t = b.createElement(e) as HTMLScriptElement;
    t.async = true;
    t.src = v;
    const s = b.getElementsByTagName(e)[0];
    s.parentNode?.insertBefore(t, s);
    f.fbq = n;
  })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");

  window.fbq?.("init", pixelId);
  window.fbq?.("track", "PageView");
  initialized = true;
}

/**
 * Standard event names supportés par Meta. Liste exhaustive :
 * https://developers.facebook.com/docs/meta-pixel/reference#standard-events
 */
type MetaStandardEvent =
  | "PageView"
  | "Lead"
  | "CompleteRegistration"
  | "Subscribe"
  | "Purchase"
  | "InitiateCheckout"
  | "ViewContent"
  | "AddToCart";

/**
 * Track un event standard Meta.
 *
 * @param eventName — événement standard Meta (CompleteRegistration, Subscribe, etc.)
 * @param params — paramètres custom (value, currency, content_name, etc.)
 * @param eventId — id unique pour déduplication avec la CAPI serveur (optionnel)
 *
 * Exemples :
 *   metaTrack("CompleteRegistration", { content_name: "signup" }, eventId);
 *   metaTrack("Subscribe", { value: 29, currency: "EUR" }, eventId);
 */
export function metaTrack(
  eventName: MetaStandardEvent,
  params?: Record<string, unknown>,
  eventId?: string,
): void {
  if (typeof window === "undefined") return;
  if (!window.fbq) return;

  if (eventId) {
    window.fbq("track", eventName, params ?? {}, { eventID: eventId });
  } else {
    window.fbq("track", eventName, params ?? {});
  }
}

/**
 * Génère un event_id unique pour permettre à la CAPI serveur de
 * dédupliquer cet event. À envoyer à la fois côté client (Pixel) et
 * côté serveur (CAPI).
 */
export function generateMetaEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
