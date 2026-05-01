import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { CHAT_SYSTEM_PROMPT } from "@/server/chat-prompt";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  getUserSubscriptionInfo,
  logAiAction,
} from "@/lib/subscription.server";
import { getPlan } from "@/lib/plans";
import { rateLimit, rateLimitedResponse } from "@/lib/rate-limit.server";

// ============================================================================
// /api/chat-roadbook
// ============================================================================
// Reçoit un roadbook + une commande utilisateur ("supprime le jour 3"),
// envoie le tout à Claude avec CHAT_SYSTEM_PROMPT, retourne le roadbook
// modifié + un summary court de la modification.
//
// Coût : 1 crédit par appel (qu'il y ait ou non modification effective).

const inputSchema = z.object({
  roadbook_id: z.string().uuid(),
  command: z.string().min(2).max(2000),
});

function stripMarkdownFence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```")) return trimmed;
  return trimmed
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();
}

function cleanClaudeJson(text: string): string {
  let cleaned = stripMarkdownFence(text);
  if (!cleaned.startsWith("{")) cleaned = "{" + cleaned;
  cleaned = stripMarkdownFence(cleaned);
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    cleaned = cleaned.substring(first, last + 1);
  }
  return cleaned.trim();
}

/**
 * Strip les champs "lourds" qui ne sont pas pertinents pour une mutation
 * éditoriale. Réduit drastiquement le payload envoyé à Claude (de ~80KB
 * à ~5-10KB pour un roadbook moyen) → réponse 5-10× plus rapide → pas de
 * timeout Worker.
 */
function stripHeavyFields(rb: any): any {
  const out = { ...rb };
  delete out.directions_segments;
  if (Array.isArray(out.days)) {
    out.days = out.days.map((d: any) => {
      const { photos, lat, lng, geocoding_status, geocoded_from, ...rest } = d;
      return rest;
    });
  }
  return out;
}

/**
 * Post-merge : réinjecte les champs lourds (photos, lat/lng) du roadbook
 * original dans la réponse de Claude, par index de jour. Si Claude a
 * changé le stage d'un jour, on RESET lat/lng pour forcer le re-géocodage
 * automatique côté client.
 */
function mergeHeavyFields(original: any, claudeOutput: any): any {
  const out = { ...claudeOutput };
  // directions_segments reset (sera recalculé par RoadbookMap)
  out.directions_segments = [];

  if (Array.isArray(out.days) && Array.isArray(original.days)) {
    out.days = out.days.map((newDay: any, idx: number) => {
      const oldDay = original.days[idx];
      if (!oldDay) return newDay;
      const merged = { ...newDay };
      // Réinjecte les photos si Claude n'en a pas mentionné
      if (!merged.photos && oldDay.photos) merged.photos = oldDay.photos;
      // Réinjecte lat/lng UNIQUEMENT si le stage n'a pas changé.
      // Si stage différent → re-géocodage requis, on laisse lat/lng vide.
      if (
        merged.stage === oldDay.stage &&
        typeof oldDay.lat === "number" &&
        typeof oldDay.lng === "number"
      ) {
        merged.lat = oldDay.lat;
        merged.lng = oldDay.lng;
        merged.geocoding_status = oldDay.geocoding_status;
        merged.geocoded_from = oldDay.geocoded_from;
      }
      return merged;
    });
  }
  return out;
}

export const Route = createFileRoute("/api/chat-roadbook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const apiKey = process.env.ANTHROPIC_API_KEY;
          if (!apiKey) {
            return jsonResponse(
              { error: "ANTHROPIC_API_KEY manquante" },
              500,
            );
          }

          const authHeader = request.headers.get("Authorization") || "";
          const token = authHeader.startsWith("Bearer ")
            ? authHeader.slice(7)
            : null;
          if (!token) {
            return jsonResponse({ error: "Authentification requise." }, 401);
          }
          const { data: userData, error: userErr } =
            await supabaseAdmin.auth.getUser(token);
          if (userErr || !userData?.user) {
            return jsonResponse({ error: "Session invalide." }, 401);
          }
          const userId = userData.user.id;

          // Rate limit anti-burst : 10 chats/min/user
          const rl = rateLimit(`chat:${userId}`, 10, 60_000);
          if (!rl.ok) {
            return rateLimitedResponse(rl.retryAfterSec ?? 30);
          }

          // Crédits modifications IA check (quota chat distinct du quota roadbook)
          const subInfo = await getUserSubscriptionInfo(userId);
          const plan = getPlan(subInfo.planKey);
          if (!plan.allowsAIChat) {
            return jsonResponse(
              {
                error: `Le chat IA n'est pas inclus dans le plan ${plan.name}.`,
                code: "feature_locked",
                subscription: subInfo,
              },
              402,
            );
          }
          if (
            subInfo.planStatus === "past_due" ||
            subInfo.planStatus === "unpaid"
          ) {
            return jsonResponse(
              {
                error: "Ton paiement a échoué — mets à jour ta CB.",
                code: "payment_required",
                subscription: subInfo,
              },
              402,
            );
          }
          if (!subInfo.canChat) {
            return jsonResponse(
              {
                error: `Crédits modifications IA épuisés (${subInfo.chatCreditsUsed} / ${subInfo.chatCreditsLimit}). Passe au plan supérieur ou attends le renouvellement.`,
                code: "quota_exceeded",
                subscription: subInfo,
              },
              402,
            );
          }

          const rawBody = await request.json().catch(() => null);
          const parsed = inputSchema.safeParse(rawBody);
          if (!parsed.success) {
            return jsonResponse(
              { error: "Payload invalide", issues: parsed.error.issues },
              400,
            );
          }
          const { roadbook_id, command } = parsed.data;

          // Charge le roadbook depuis la DB (en passant par service-role
          // pour éviter les pièges RLS — on vérifie l'ownership manuellement
          // ci-dessous).
          const { data: rb, error: fetchErr } = await supabaseAdmin
            .from("roadbooks")
            .select("user_id, content")
            .eq("id", roadbook_id)
            .maybeSingle();
          if (fetchErr || !rb) {
            return jsonResponse({ error: "Roadbook introuvable" }, 404);
          }
          if (rb.user_id !== userId) {
            return jsonResponse({ error: "Accès refusé" }, 403);
          }

          const currentRoadbook = rb.content;
          if (!currentRoadbook || typeof currentRoadbook !== "object") {
            return jsonResponse(
              { error: "Roadbook vide ou corrompu" },
              500,
            );
          }

          // ALLÈGEMENT du payload — on strip les champs lourds avant
          // d'envoyer à Claude. Sans ça, sur un roadbook avec 24 jours +
          // photos + directions_segments, le payload dépasse 80 KB et
          // Claude met >30s à répondre → timeout Worker → "Failed to fetch"
          // côté client.
          //
          // Champs strippés (réinjectés en post-merge server-side) :
          //   - photos (par jour) : URLs longues, jamais modifiées par chat
          //   - lat/lng/geocoding_status : re-géocodés si stage change
          //   - directions_segments : recalculés post-mutation
          //
          // L'IA ne touche que la structure éditoriale (jours, hébergement,
          // narrative, dates, distance, contacts, tips).
          const stripped = stripHeavyFields(currentRoadbook as any);

          const userMessage = `# COMMANDE UTILISATEUR

${command}

# ROADBOOK ACTUEL (allégé)

${JSON.stringify(stripped)}

# TÂCHE

Applique la commande au roadbook ci-dessus et retourne le JSON { summary, roadbook } selon ta structure. Le roadbook retourné doit être COMPLET (mêmes champs que reçus). Réponds UNIQUEMENT avec le JSON, démarrant directement par {.`;

          const t0 = Date.now();
          const resp = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model: "claude-haiku-4-5",
              max_tokens: 16000,
              system: CHAT_SYSTEM_PROMPT,
              messages: [
                { role: "user", content: userMessage },
                { role: "assistant", content: "{" },
              ],
            }),
          });
          console.log(
            "[chat-roadbook] Anthropic responded in",
            Date.now() - t0,
            "ms status:",
            resp.status,
          );

          if (!resp.ok) {
            const errText = await resp.text();
            return jsonResponse(
              {
                error: `Erreur Anthropic (${resp.status}): ${errText.slice(0, 300)}`,
              },
              500,
            );
          }

          const data = await resp.json();
          if (data?.stop_reason === "max_tokens") {
            return jsonResponse(
              {
                error:
                  "Réponse tronquée. La commande est trop complexe ou le roadbook trop long.",
              },
              500,
            );
          }

          let rawText: string =
            data?.content?.[0]?.text ??
            data?.content?.map?.((c: any) => c.text).join("\n") ??
            "";
          rawText = cleanClaudeJson(rawText);

          let parsedResp: { summary?: string; roadbook?: unknown };
          try {
            parsedResp = JSON.parse(rawText);
          } catch (e: any) {
            console.error("[chat-roadbook] JSON parse fail:", e);
            return jsonResponse(
              {
                error:
                  "Claude n'a pas renvoyé un JSON valide. Reformule ta demande.",
              },
              500,
            );
          }

          const updated = parsedResp.roadbook;
          const summary = typeof parsedResp.summary === "string"
            ? parsedResp.summary
            : "Modification appliquée.";

          if (!updated || typeof updated !== "object") {
            return jsonResponse(
              { error: "Réponse Claude invalide (pas de roadbook)." },
              500,
            );
          }
          const days = Array.isArray((updated as any).days)
            ? ((updated as any).days as unknown[])
            : null;
          if (!days || days.length === 0) {
            return jsonResponse(
              {
                error:
                  "L'IA a renvoyé un roadbook sans étapes — la commande a peut-être tout supprimé. Reformule.",
              },
              502,
            );
          }

          // Réinjecte les champs lourds (photos, lat/lng) qu'on n'avait pas
          // envoyés à Claude. Sans ça, l'agent perdrait toutes ses photos
          // uploadées à chaque modif IA.
          const merged = mergeHeavyFields(currentRoadbook, updated);

          // Persiste le nouveau contenu
          const { error: updateErr } = await supabaseAdmin
            .from("roadbooks")
            .update({ content: merged as never })
            .eq("id", roadbook_id);
          if (updateErr) {
            return jsonResponse(
              { error: "Échec sauvegarde : " + updateErr.message },
              500,
            );
          }

          // Log l'action IA (1 crédit)
          await logAiAction(userId, "chat", roadbook_id, {
            command: command.slice(0, 200),
            summary,
          });

          return jsonResponse(
            {
              ok: true,
              summary,
              roadbook: merged,
            },
            200,
          );
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error("[chat-roadbook] fatal:", msg);
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
