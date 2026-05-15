import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";

// Cast en `any` car les types Supabase générés ne contiennent pas encore les
// tables `affiliates` / `affiliate_conversions` (migrations ajoutées dans le
// commit qui introduit l'affiliation). Une regen de types après application
// de la migration le rendra inutile. Pattern utilisé pour admin_roles avant
// regen.
const supabaseAdmin = _supabaseAdmin as any;

// ============================================================================
// /api/affiliate-apply — candidature au programme d'affiliation
// ============================================================================
// Endpoint public (pas d'auth requise pour candidater). On crée une ligne
// avec status='pending' que l'admin valide ensuite via /admin (onglet
// Affiliés). À la validation, l'admin assigne un code (slug) et le statut
// passe à 'active'.

const inputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().toLowerCase(),
  pitch: z.string().trim().min(20).max(2000),
  social_url: z.string().trim().url().optional().or(z.literal("")),
});

export const Route = createFileRoute("/api/affiliate-apply")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json().catch(() => null);
          const parsed = inputSchema.safeParse(body);
          if (!parsed.success) {
            return jsonResponse(
              { error: "Formulaire invalide", issues: parsed.error.issues },
              400,
            );
          }
          const { name, email, pitch, social_url } = parsed.data;

          // Anti-doublon : si on a déjà une candidature pour cet email, on
          // ne crée pas une 2e ligne (sauf si l'ancienne était 'paused').
          const { data: existing } = await supabaseAdmin
            .from("affiliates")
            .select("code, status")
            .eq("email", email)
            .maybeSingle();

          if (existing) {
            if (existing.status === "active") {
              return jsonResponse(
                {
                  message:
                    "Tu as déjà un code actif. Connecte-toi pour le retrouver.",
                  status: "already_active",
                },
                200,
              );
            }
            if (existing.status === "pending") {
              return jsonResponse(
                {
                  message:
                    "Ta candidature est déjà en cours d'examen. On revient vers toi sous 48h.",
                  status: "already_pending",
                },
                200,
              );
            }
            // 'paused' → on autorise la réouverture en repassant à 'pending'
          }

          // Code provisoire = "PENDING_<random>" pour qu'on respecte la
          // contrainte PK même avant validation admin. À l'approbation
          // l'admin remplace par un slug propre.
          const provisionalCode = `PENDING_${Math.random()
            .toString(36)
            .slice(2, 10)
            .toUpperCase()}`;

          // Si existing pending/paused : on met à jour (réouverture)
          if (existing) {
            const { error: updateErr } = await supabaseAdmin
              .from("affiliates")
              .update({
                name,
                pitch,
                social_url: social_url || null,
                status: "pending",
              })
              .eq("code", existing.code);
            if (updateErr) throw new Error(updateErr.message);
          } else {
            const { error: insertErr } = await supabaseAdmin
              .from("affiliates")
              .insert({
                code: provisionalCode,
                name,
                email,
                pitch,
                social_url: social_url || null,
                status: "pending",
              });
            if (insertErr) throw new Error(insertErr.message);
          }

          return jsonResponse(
            {
              message:
                "Candidature reçue. On revient vers toi sous 48h avec ton code.",
              status: "pending",
            },
            200,
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[affiliate-apply] error:", msg);
          return jsonResponse({ error: msg }, 500);
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
