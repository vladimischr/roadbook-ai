import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ============================================================================
// /api/track-view?token={uuid}
// ============================================================================
// Endpoint PUBLIC (pas d'auth) — appelé par /voyage/{token} au mount pour
// enregistrer une vue. On dérive le device_type du User-Agent côté serveur
// (pas besoin de fingerprint), pas d'IP stockée (RGPD).
//
// Anti-spam : un même token vu dans la dernière minute ne réenregistre pas
// (évite les rechargements répétés qui gonfleraient artificiellement le
// compteur). C'est suffisant pour de l'analytics light.

export const Route = createFileRoute("/api/track-view")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const token = url.searchParams.get("token") || "";
        if (
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            token,
          )
        ) {
          return jsonResponse({ ok: false }, 400);
        }

        try {
          // Lookup roadbook_id par token
          const { data: rb, error: lookupErr } = await supabaseAdmin
            .from("roadbooks")
            .select("id")
            .eq("share_token", token)
            .maybeSingle();
          if (lookupErr || !rb) {
            // Token invalide → on ne crée pas de vue (silencieux pour le
            // visiteur, mais rien n'est tracké).
            return jsonResponse({ ok: false }, 200);
          }

          // Anti-spam : dernière vue < 60s = on skip
          const { data: lastView } = await supabaseAdmin
            .from("roadbook_views")
            .select("viewed_at")
            .eq("roadbook_id", rb.id)
            .order("viewed_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (lastView) {
            const last = new Date(lastView.viewed_at).getTime();
            if (Date.now() - last < 60_000) {
              return jsonResponse({ ok: true, skipped: true }, 200);
            }
          }

          // Détecte device_type via User-Agent (sommaire mais suffisant)
          const ua = (request.headers.get("user-agent") || "").toLowerCase();
          const isMobile =
            /mobile|iphone|ipad|android|tablet/.test(ua) && !/macintosh/.test(ua);
          const deviceType = isMobile ? "mobile" : "desktop";

          // Referrer sans query string (vie privée)
          const rawReferrer = request.headers.get("referer") || "";
          const referrer = rawReferrer
            ? rawReferrer.split("?")[0].slice(0, 500)
            : null;

          await supabaseAdmin.from("roadbook_views").insert({
            roadbook_id: rb.id,
            device_type: deviceType,
            referrer,
          });

          return jsonResponse({ ok: true }, 200);
        } catch (e) {
          // Silencieux — l'erreur de tracking ne doit jamais bloquer le
          // visiteur sur la page publique.
          console.error("[track-view] error:", e);
          return jsonResponse({ ok: false }, 200);
        }
      },
    },
  },
});

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
