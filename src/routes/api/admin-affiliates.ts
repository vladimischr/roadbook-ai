import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin as _supabaseAdmin } from "@/integrations/supabase/client.server";

// Cast `any` : tables affiliates non encore dans les types générés.
const supabaseAdmin = _supabaseAdmin as any;
import { isAdminUser } from "@/lib/admin.server";

// ============================================================================
// /api/admin-affiliates — CRUD admin sur le programme d'affiliation
// ============================================================================
// GET  : liste toutes les candidatures + actifs + paused
// POST : approve / reject / update / mark_paid
//
// Réservé aux admins (admin_roles ou ADMIN_EMAILS).

const codeSchema = z
  .string()
  .trim()
  .min(3)
  .max(32)
  .regex(/^[A-Z0-9_-]+$/, "Code en majuscules, chiffres, tirets, underscores");

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("approve"),
    affiliate_id: z.string(), // = code actuel (peut être PENDING_xxx)
    new_code: codeSchema,
    commission_rate: z.number().int().min(0).max(100).default(30),
    commission_months: z.number().int().min(0).max(120).default(12),
  }),
  z.object({
    action: z.literal("reject"),
    affiliate_id: z.string(),
    notes: z.string().optional(),
  }),
  z.object({
    action: z.literal("pause"),
    affiliate_id: z.string(),
  }),
  z.object({
    action: z.literal("reactivate"),
    affiliate_id: z.string(),
  }),
  z.object({
    action: z.literal("mark_paid"),
    conversion_id: z.string().uuid(),
    paid_note: z.string().optional(),
  }),
  z.object({
    action: z.literal("update_notes"),
    affiliate_id: z.string(),
    notes: z.string().max(2000),
  }),
]);

export const Route = createFileRoute("/api/admin-affiliates")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const admin = await requireAdmin(request);
        if ("error" in admin) return admin.error;

        try {
          const { data: affiliates, error: affErr } = await supabaseAdmin
            .from("affiliates")
            .select(
              "code, user_id, name, email, status, commission_rate, commission_months, notes, pitch, social_url, created_at, approved_at",
            )
            .order("created_at", { ascending: false });

          if (affErr) throw new Error(affErr.message);

          const { data: conversions, error: convErr } = await supabaseAdmin
            .from("affiliate_conversions")
            .select(
              "id, affiliate_code, referred_user_id, stripe_invoice_id, invoice_amount_cents, commission_amount_cents, commission_rate, payment_number, paid_to_affiliate, paid_at, paid_note, created_at",
            )
            .order("created_at", { ascending: false })
            .limit(500);

          if (convErr) throw new Error(convErr.message);

          // Agrégation : nb filleuls + commission cumulée par affilié
          const stats: Record<
            string,
            {
              referred_count: number;
              total_due_cents: number;
              total_paid_cents: number;
            }
          > = {};
          for (const c of conversions ?? []) {
            const code = c.affiliate_code;
            if (!stats[code]) {
              stats[code] = {
                referred_count: 0,
                total_due_cents: 0,
                total_paid_cents: 0,
              };
            }
            stats[code].total_due_cents += c.commission_amount_cents;
            if (c.paid_to_affiliate) {
              stats[code].total_paid_cents += c.commission_amount_cents;
            }
          }
          // referred_count = uniques referred_user_id par code
          const seen: Record<string, Set<string>> = {};
          for (const c of conversions ?? []) {
            if (!seen[c.affiliate_code]) seen[c.affiliate_code] = new Set();
            seen[c.affiliate_code].add(c.referred_user_id);
          }
          for (const code of Object.keys(seen)) {
            if (stats[code]) stats[code].referred_count = seen[code].size;
          }

          return jsonResponse(
            { affiliates: affiliates ?? [], conversions: conversions ?? [], stats },
            200,
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[admin-affiliates] GET error:", msg);
          return jsonResponse({ error: msg }, 500);
        }
      },

      POST: async ({ request }) => {
        const admin = await requireAdmin(request);
        if ("error" in admin) return admin.error;

        const body = await request.json().catch(() => null);
        const parsed = actionSchema.safeParse(body);
        if (!parsed.success) {
          return jsonResponse(
            { error: "Action invalide", issues: parsed.error.issues },
            400,
          );
        }
        const action = parsed.data;

        try {
          switch (action.action) {
            case "approve": {
              // On change le PK code et on passe à 'active'. Si new_code !=
              // affiliate_id (ex: PENDING_XXX → SOPHIE25), on doit faire
              // un UPDATE qui modifie la PK — Postgres l'accepte tant qu'il
              // n'y a pas de conflit unique.
              const { error } = await supabaseAdmin
                .from("affiliates")
                .update({
                  code: action.new_code,
                  status: "active",
                  commission_rate: action.commission_rate,
                  commission_months: action.commission_months,
                  approved_at: new Date().toISOString(),
                  approved_by: admin.userId,
                })
                .eq("code", action.affiliate_id);
              if (error) throw new Error(error.message);
              return jsonResponse({ ok: true, code: action.new_code }, 200);
            }

            case "reject": {
              const { error } = await supabaseAdmin
                .from("affiliates")
                .update({ status: "paused", notes: action.notes ?? null })
                .eq("code", action.affiliate_id);
              if (error) throw new Error(error.message);
              return jsonResponse({ ok: true }, 200);
            }

            case "pause": {
              const { error } = await supabaseAdmin
                .from("affiliates")
                .update({ status: "paused" })
                .eq("code", action.affiliate_id);
              if (error) throw new Error(error.message);
              return jsonResponse({ ok: true }, 200);
            }

            case "reactivate": {
              const { error } = await supabaseAdmin
                .from("affiliates")
                .update({ status: "active" })
                .eq("code", action.affiliate_id);
              if (error) throw new Error(error.message);
              return jsonResponse({ ok: true }, 200);
            }

            case "mark_paid": {
              const { error } = await supabaseAdmin
                .from("affiliate_conversions")
                .update({
                  paid_to_affiliate: true,
                  paid_at: new Date().toISOString(),
                  paid_note: action.paid_note ?? null,
                })
                .eq("id", action.conversion_id);
              if (error) throw new Error(error.message);
              return jsonResponse({ ok: true }, 200);
            }

            case "update_notes": {
              const { error } = await supabaseAdmin
                .from("affiliates")
                .update({ notes: action.notes })
                .eq("code", action.affiliate_id);
              if (error) throw new Error(error.message);
              return jsonResponse({ ok: true }, 200);
            }
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[admin-affiliates] POST error:", msg);
          return jsonResponse({ error: msg }, 500);
        }
      },
    },
  },
});

async function requireAdmin(
  request: Request,
): Promise<{ userId: string } | { error: Response }> {
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return { error: jsonResponse({ error: "Authentification requise." }, 401) };
  }
  const { data: userData, error: userErr } =
    await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData?.user) {
    return { error: jsonResponse({ error: "Session invalide." }, 401) };
  }
  const ok = await isAdminUser(userData.user.id, userData.user.email);
  if (!ok) {
    return { error: jsonResponse({ error: "Accès admin requis." }, 403) };
  }
  return { userId: userData.user.id };
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
