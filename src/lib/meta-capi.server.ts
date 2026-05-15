// ============================================================================
// src/lib/meta-capi.server.ts — Meta Conversions API (CAPI) server-side
// ============================================================================
//
// La CAPI envoie des events server-side directement à Meta, en complément
// du Pixel client. Elle :
//  - contourne les bloqueurs de pubs (~30% du trafic)
//  - permet de tracker des events qu'on connaît seulement côté serveur
//    (paiement confirmé via webhook Stripe, par exemple)
//  - améliore le scoring ML de Meta → meilleure attribution + ROAS
//
// La déduplication entre Pixel et CAPI se fait via un `event_id` unique
// commun aux deux signaux. Meta dédoublonne dans une fenêtre de 7 jours.
//
// Config requise :
//  - META_PIXEL_ID            (server) : id du pixel
//  - META_CAPI_ACCESS_TOKEN   (server) : token d'accès CAPI (Events Manager
//                                        → Pixel → Settings → Generate access token)
//  - META_CAPI_TEST_CODE      (server, optionnel) : code "TEST..." pour
//                                        valider en dev sans polluer prod
//
// Référence : https://developers.facebook.com/docs/marketing-api/conversions-api
// ============================================================================

import { createHash } from "node:crypto";

const CAPI_VERSION = "v22.0";

/**
 * Hash SHA-256 lowercase comme demandé par Meta pour PII (email, phone, name).
 * Permet à Meta de matcher l'utilisateur sans recevoir la donnée en clair.
 */
function hashPII(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  return createHash("sha256").update(normalized).digest("hex");
}

export type MetaCapiEvent =
  | "PageView"
  | "Lead"
  | "CompleteRegistration"
  | "Subscribe"
  | "Purchase"
  | "InitiateCheckout";

export interface MetaCapiPayload {
  event_name: MetaCapiEvent;
  /**
   * Unix timestamp en secondes. Default : maintenant.
   * Doit être ≤ 7 jours dans le passé pour être accepté.
   */
  event_time?: number;
  /**
   * Identifiant unique pour dédup avec le Pixel client.
   * Si tu envoies aussi un event Pixel côté client avec le même eventID,
   * Meta dédoublonne automatiquement.
   */
  event_id?: string;
  /**
   * URL de la page où l'event a eu lieu (recommandé par Meta pour matching).
   */
  event_source_url?: string;
  /**
   * "website" pour un event server-side d'origine web.
   */
  action_source?:
    | "website"
    | "email"
    | "app"
    | "phone_call"
    | "chat"
    | "physical_store"
    | "system_generated"
    | "other";

  /**
   * Données utilisateur (Meta hashera côté serveur ce qui est non-hashé).
   * On hash ici tout ce qui est PII pour respecter RGPD.
   */
  user_data?: {
    email?: string;
    phone?: string;
    first_name?: string;
    last_name?: string;
    external_id?: string; // notre user_id Supabase
    client_ip_address?: string;
    client_user_agent?: string;
    fbc?: string; // _fbc cookie (Facebook click id)
    fbp?: string; // _fbp cookie (Facebook browser id)
  };

  /**
   * Données du custom event (valeur, devise, content_ids, etc.)
   */
  custom_data?: {
    value?: number;
    currency?: string; // "EUR"
    content_name?: string;
    content_ids?: string[];
    content_type?: string;
    plan_key?: string;
    [key: string]: unknown;
  };
}

/**
 * Envoie un ou plusieurs events à la Conversions API.
 *
 * Best-effort : si l'API échoue, on log mais on ne crash pas l'appel parent.
 * Idéal pour appel non-bloquant depuis un webhook Stripe.
 *
 * @example
 *   await metaCapiSend({
 *     event_name: "Subscribe",
 *     event_id: "evt_123",
 *     user_data: { email: "user@x.com", external_id: userId },
 *     custom_data: { value: 29, currency: "EUR", plan_key: "solo" },
 *   });
 */
export async function metaCapiSend(
  payload: MetaCapiPayload | MetaCapiPayload[],
): Promise<{ ok: boolean; error?: string }> {
  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  const testCode = process.env.META_CAPI_TEST_CODE;

  if (!pixelId || !accessToken) {
    // Pas configuré, no-op
    if (process.env.NODE_ENV !== "production") {
      console.info("[meta-capi] env vars missing, skipping send");
    }
    return { ok: true };
  }

  const events = Array.isArray(payload) ? payload : [payload];

  // Hash PII + défauts
  const processedEvents = events.map((e) => {
    const ev: any = {
      event_name: e.event_name,
      event_time: e.event_time ?? Math.floor(Date.now() / 1000),
      event_id: e.event_id,
      event_source_url: e.event_source_url,
      action_source: e.action_source ?? "website",
    };
    if (e.user_data) {
      ev.user_data = {
        em: hashPII(e.user_data.email),
        ph: hashPII(e.user_data.phone),
        fn: hashPII(e.user_data.first_name),
        ln: hashPII(e.user_data.last_name),
        external_id: e.user_data.external_id
          ? hashPII(e.user_data.external_id)
          : undefined,
        client_ip_address: e.user_data.client_ip_address,
        client_user_agent: e.user_data.client_user_agent,
        fbc: e.user_data.fbc,
        fbp: e.user_data.fbp,
      };
      // Strip undefined
      Object.keys(ev.user_data).forEach((k) => {
        if (ev.user_data[k] === undefined) delete ev.user_data[k];
      });
    }
    if (e.custom_data) ev.custom_data = e.custom_data;
    return ev;
  });

  const body: Record<string, unknown> = {
    data: processedEvents,
    ...(testCode ? { test_event_code: testCode } : {}),
  };

  const url = `https://graph.facebook.com/${CAPI_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(
        `[meta-capi] HTTP ${res.status}: ${text.slice(0, 500)}`,
      );
      return { ok: false, error: `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[meta-capi] fetch error:", msg);
    return { ok: false, error: msg };
  }
}
