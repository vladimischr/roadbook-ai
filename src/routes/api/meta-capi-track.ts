import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { metaCapiSend, type MetaCapiEvent } from "@/lib/meta-capi.server";

// ============================================================================
// /api/meta-capi-track — relais Meta Conversions API depuis le client
// ============================================================================
// Le client appelle cet endpoint juste après avoir fire un event Pixel,
// avec le même `event_id` → Meta dédoublonne. La CAPI ajoute le signal
// server-side (immune aux bloqueurs) + permet de joindre l'IP/UA réels.
//
// Endpoint PUBLIC (pas d'auth) — la sécurité ici est limitée :
//  - Validation stricte du payload via Zod
//  - Pas de PII en clair stockée (tout est hashé avant envoi à Meta)
//  - Rate-limit côté Cloudflare en cas d'abus
//
// Le client est volontairement non authentifié car CompleteRegistration
// arrive AVANT que la session Supabase soit confirmée par email.

const inputSchema = z.object({
  event_name: z.enum([
    "PageView",
    "Lead",
    "CompleteRegistration",
    "Subscribe",
    "Purchase",
    "InitiateCheckout",
  ]),
  event_id: z.string().min(1).max(128),
  user_email: z.string().email().optional(),
  user_id: z.string().optional(),
  value: z.number().optional(),
  currency: z.string().length(3).optional(),
  content_name: z.string().max(200).optional(),
  plan_key: z.string().max(50).optional(),
});

export const Route = createFileRoute("/api/meta-capi-track")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json().catch(() => null);
          const parsed = inputSchema.safeParse(body);
          if (!parsed.success) {
            return jsonResponse(
              { error: "Payload invalide", issues: parsed.error.issues },
              400,
            );
          }
          const d = parsed.data;

          // Extract IP + User-Agent pour meilleur matching côté Meta
          const ip =
            request.headers.get("cf-connecting-ip") ||
            request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            undefined;
          const ua = request.headers.get("user-agent") || undefined;
          const referer = request.headers.get("referer") || undefined;

          // Extract fbc/fbp cookies si présents (Facebook click + browser id)
          const cookieHeader = request.headers.get("cookie") || "";
          const fbc = parseCookie(cookieHeader, "_fbc");
          const fbp = parseCookie(cookieHeader, "_fbp");

          const result = await metaCapiSend({
            event_name: d.event_name as MetaCapiEvent,
            event_id: d.event_id,
            event_source_url: referer,
            action_source: "website",
            user_data: {
              email: d.user_email,
              external_id: d.user_id,
              client_ip_address: ip,
              client_user_agent: ua,
              fbc: fbc || undefined,
              fbp: fbp || undefined,
            },
            custom_data: {
              ...(d.value !== undefined ? { value: d.value } : {}),
              ...(d.currency ? { currency: d.currency } : {}),
              ...(d.content_name ? { content_name: d.content_name } : {}),
              ...(d.plan_key ? { plan_key: d.plan_key } : {}),
            },
          });

          if (!result.ok) {
            return jsonResponse(
              { ok: false, error: result.error ?? "Erreur CAPI" },
              500,
            );
          }
          return jsonResponse({ ok: true }, 200);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[meta-capi-track] error:", msg);
          return jsonResponse({ ok: false, error: msg }, 500);
        }
      },
    },
  },
});

function parseCookie(header: string, name: string): string | null {
  const match = header
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  return match ? match.slice(name.length + 1) : null;
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
