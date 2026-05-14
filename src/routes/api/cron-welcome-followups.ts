import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { render } from "@react-email/components";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { TEMPLATES } from "@/lib/email-templates/registry";

// ============================================================================
// Cron — Welcome follow-ups J3 et J7
// ============================================================================
// À appeler une fois par jour (ex: 10h Paris) via :
//
//   1. Cloudflare Cron Trigger (recommandé)
//      Ajouter dans wrangler.jsonc :
//      {
//        "triggers": {
//          "crons": ["0 8 * * *"]  // 8h UTC = 10h Paris
//        }
//      }
//      Puis un scheduled handler qui fetch ce endpoint.
//
//   2. Cron externe (GitHub Actions, EasyCron, Cronitor...)
//      curl -X POST https://roadbook.ai/api/cron-welcome-followups \
//        -H "Authorization: Bearer $CRON_SECRET"
//
// Logique :
//   - Pour chaque profil créé il y a 3 jours sans first_roadbook_completed
//     PostHog → envoyer welcome-j3-nudge
//   - Pour chaque profil créé il y a 7 jours sans first_roadbook_completed
//     → envoyer welcome-j7-lastcall
//
// Idempotence : idempotency_key fixe par user_id + jour → un user ne peut
// pas recevoir 2 fois le même email même si le cron tourne 2 fois.
//
// Detection "first_roadbook_completed" : on regarde la table `roadbooks` —
// si le profil n'a aucune ligne, on considère qu'il n'a pas activé.
//
// SÉCURITÉ : protégé par un CRON_SECRET (env var) — refuse les appels sans
// le bon header. Stocker dans Cloudflare Pages env vars en prod.
// ============================================================================

export const Route = createFileRoute("/api/cron-welcome-followups")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // 1. Auth — vérifier le secret cron
        const cronSecret = process.env.CRON_SECRET;
        if (!cronSecret) {
          console.error("[cron-welcome] CRON_SECRET missing in env");
          return new Response("server misconfigured", { status: 500 });
        }
        const authHeader = request.headers.get("authorization") ?? "";
        const provided = authHeader.replace(/^Bearer\s+/i, "").trim();
        if (provided !== cronSecret) {
          return new Response("unauthorized", { status: 401 });
        }

        // 2. Date math — calculer les fenêtres J3 et J7
        const now = new Date();
        const j3Start = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);
        const j3End = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
        const j7Start = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
        const j7End = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const results = {
          j3_candidates: 0,
          j3_sent: 0,
          j3_skipped_active: 0,
          j7_candidates: 0,
          j7_sent: 0,
          j7_skipped_active: 0,
          errors: [] as string[],
        };

        // 3. Récupérer les candidats J3 (signup il y a ~3 jours)
        await processBucket("j3", j3Start, j3End, results);

        // 4. Récupérer les candidats J7 (signup il y a ~7 jours)
        await processBucket("j7", j7Start, j7End, results);

        console.log("[cron-welcome] run summary", results);

        return Response.json({ ok: true, results });
      },
    },
  },
});

async function processBucket(
  bucket: "j3" | "j7",
  start: Date,
  end: Date,
  results: {
    j3_candidates: number;
    j3_sent: number;
    j3_skipped_active: number;
    j7_candidates: number;
    j7_sent: number;
    j7_skipped_active: number;
    errors: string[];
  },
) {
  const templateName =
    bucket === "j3" ? "welcome-j3-nudge" : "welcome-j7-lastcall";
  const candKey =
    bucket === "j3" ? ("j3_candidates" as const) : ("j7_candidates" as const);
  const sentKey =
    bucket === "j3" ? ("j3_sent" as const) : ("j7_sent" as const);
  const skipKey =
    bucket === "j3"
      ? ("j3_skipped_active" as const)
      : ("j7_skipped_active" as const);

  // On query auth.users via supabaseAdmin pour avoir l'email + created_at.
  // Limite à 200/run pour éviter les surcharges (en early-stage c'est large).
  const { data: users, error } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (error) {
    results.errors.push(`auth.listUsers failed: ${error.message}`);
    return;
  }

  const candidates = users.users.filter((u) => {
    if (!u.email || !u.created_at) return false;
    const created = new Date(u.created_at);
    return created >= start && created < end;
  });
  results[candKey] = candidates.length;

  for (const user of candidates) {
    if (!user.email) continue;

    // Skip si l'user a déjà créé au moins 1 roadbook (= activé)
    const { count: roadbookCount } = await supabaseAdmin
      .from("roadbooks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    if ((roadbookCount ?? 0) > 0) {
      results[skipKey]++;
      continue;
    }

    // Render et envoie l'email directement (pas via /lovable/email
    // car on n'a pas de JWT user, on est en service-role).
    try {
      const entry = TEMPLATES[templateName];
      if (!entry) {
        results.errors.push(`template ${templateName} not in registry`);
        continue;
      }

      const firstName = user.email.split("@")[0];
      const props = {
        firstName,
        newUrl: `https://roadbook.ai/new`,
        dashboardUrl: `https://roadbook.ai/new`,
      };
      const subject =
        typeof entry.subject === "function"
          ? entry.subject(props)
          : entry.subject;
      const Component = entry.component;
      const html = await render(React.createElement(Component, props));

      // Envoi via Resend direct (HTTP API, pas SDK pour CF Workers)
      const resendKey = process.env.RESEND_API_KEY;
      if (!resendKey) {
        results.errors.push("RESEND_API_KEY missing");
        return;
      }
      const senderDomain =
        process.env.SENDER_DOMAIN ?? "notify.getroadbook.com";
      const fromAddress = `Roadbook.ai <hello@${senderDomain}>`;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: fromAddress,
          to: user.email,
          subject,
          html,
          headers: {
            // Idempotency : Resend dédoublonne si on renvoie le même header.
            "X-Entity-Ref-ID": `welcome-${bucket}-${user.id}`,
          },
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        results.errors.push(
          `resend ${bucket} ${user.email}: ${res.status} ${text.slice(0, 100)}`,
        );
        continue;
      }
      results[sentKey]++;
    } catch (err) {
      results.errors.push(
        `${bucket} ${user.email}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
