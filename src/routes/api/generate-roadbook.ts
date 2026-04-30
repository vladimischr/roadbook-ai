import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ROADBOOK_SYSTEM_PROMPT } from "@/server/roadbook-prompt";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Schéma Zod aligné sur RoadbookFormData (côté client) — refuse les payloads
// invalides AVANT d'appeler Anthropic, pour ne pas brûler du quota sur du
// garbage. Bornes strictes (longueurs max) pour éviter les attaques par
// inflation de prompt.
const formSchema = z.object({
  client_name: z.string().min(1).max(200),
  destination: z.string().min(1).max(200),
  start_date: z.string().max(40).optional().nullable(),
  end_date: z.string().max(40).optional().nullable(),
  travelers_count: z.number().int().min(0).max(50).optional().nullable(),
  traveler_profile: z.string().max(80).optional().nullable(),
  theme: z.string().max(80).optional().nullable(),
  budget_range: z.string().max(40).optional().nullable(),
  travel_mode: z.string().max(80).optional().nullable(),
  generation_mode: z.enum(["ai", "manual"]),
  agent_notes: z.string().max(4000).optional().nullable(),
  manual_steps: z
    .array(
      z.object({
        location: z.string().max(200),
        nights: z.number().int().min(0).max(60),
        activities: z.string().max(1000),
      }),
    )
    .max(60)
    .optional(),
});

function daysBetween(a?: string, b?: string): number {
  if (!a || !b) return 7;
  const d = Math.round(
    (new Date(b).getTime() - new Date(a).getTime()) / 86400000,
  );
  return Math.max(1, d || 7);
}

function stripMarkdownFence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```")) return trimmed;

  return trimmed
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();
}

function cleanClaudeJsonText(text: string): string {
  let cleaned = stripMarkdownFence(text);

  // Avec le prefill assistant "{", Claude renvoie souvent la suite sans l'accolade initiale.
  if (!cleaned.startsWith("{")) {
    cleaned = "{" + cleaned;
  }

  cleaned = stripMarkdownFence(cleaned);

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  return cleaned.trim();
}

export const Route = createFileRoute("/api/generate-roadbook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const apiKey = process.env.ANTHROPIC_API_KEY;
          console.log(
            "[generate-roadbook] ANTHROPIC_API_KEY présente:",
            !!process.env.ANTHROPIC_API_KEY,
          );
          if (!apiKey) {
            return new Response(
              JSON.stringify({
                error: "ANTHROPIC_API_KEY manquante côté serveur.",
              }),
              { status: 500, headers: { "Content-Type": "application/json" } },
            );
          }

          // Auth — sans cette vérification, n'importe qui peut taper sur cet
          // endpoint et brûler le quota Anthropic. Le bearer token est récupéré
          // via supabase pour identifier l'utilisateur connecté.
          const authHeader = request.headers.get("Authorization") || "";
          const token = authHeader.startsWith("Bearer ")
            ? authHeader.slice(7)
            : null;
          if (!token) {
            return new Response(
              JSON.stringify({ error: "Authentification requise." }),
              { status: 401, headers: { "Content-Type": "application/json" } },
            );
          }
          const { data: userData, error: userErr } =
            await supabaseAdmin.auth.getUser(token);
          if (userErr || !userData?.user) {
            return new Response(
              JSON.stringify({ error: "Session invalide." }),
              { status: 401, headers: { "Content-Type": "application/json" } },
            );
          }

          const rawBody = await request.json().catch(() => null);
          const parsed = formSchema.safeParse(rawBody);
          if (!parsed.success) {
            console.warn(
              "[generate-roadbook] Body invalide:",
              parsed.error.issues,
            );
            return new Response(
              JSON.stringify({
                error: "Payload invalide",
                issues: parsed.error.issues,
              }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }
          const formData = parsed.data;
          console.log(
            "[generate-roadbook] Reçu form:",
            JSON.stringify(formData),
          );
          const duration_days = daysBetween(
            formData.start_date ?? undefined,
            formData.end_date ?? undefined,
          );
          const inputs = { ...formData, duration_days };

          const userMessage = `# CONSIGNE STRICTE

Tu DOIS reprendre tels quels et sans aucune modification ces champs dans ta réponse JSON :

- client_name : "${formData.client_name}"
- destination : "${formData.destination}"
- start_date : "${formData.start_date}"  (format YYYY-MM-DD, à reproduire à l'identique)
- end_date : "${formData.end_date}"  (format YYYY-MM-DD, à reproduire à l'identique)
- travelers : ${formData.travelers_count}
- profile : "${formData.traveler_profile}"
- theme : "${formData.theme}"
- budget_range : "${formData.budget_range}"
- travel_mode : "${formData.travel_mode || ""}"

Calcule duration_days = nombre de jours entre start_date et end_date inclus.

# CONTEXTE COMPLÉMENTAIRE

- Mode de génération : ${formData.generation_mode}
- Modalité de voyage : ${formData.travel_mode || "(non précisée)"} — adapte le ton, le rythme, le type d'hébergements et de transports en conséquence (voir règle 11 du system prompt).
- Notes de l'agent : ${formData.agent_notes || "(aucune)"}
${formData.generation_mode === "manual" && formData.manual_steps ? `- Étapes imposées par l'agent : ${JSON.stringify(formData.manual_steps)}` : ""}

# TÂCHE

Génère le roadbook complet en JSON conforme à la structure définie dans ton system prompt. Réponds UNIQUEMENT avec le JSON, démarrant directement par {.`;
          void inputs;

          console.log(
            "[generate-roadbook] System prompt longueur:",
            ROADBOOK_SYSTEM_PROMPT.length,
          );
          console.log("[generate-roadbook] Appel Claude...");
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
              system: ROADBOOK_SYSTEM_PROMPT,
              messages: [
                { role: "user", content: userMessage },
                { role: "assistant", content: "{" },
              ],
            }),
          });
          console.log(
            "[generate-roadbook] Anthropic responded in",
            Date.now() - t0,
            "ms status:",
            resp.status,
          );

          if (!resp.ok) {
            const errText = await resp.text();
            console.error(
              "[generate-roadbook] Anthropic error:",
              resp.status,
              errText,
            );
            return new Response(
              JSON.stringify({
                error: `Erreur Anthropic (${resp.status}): ${errText.slice(0, 300)}`,
              }),
              { status: 500, headers: { "Content-Type": "application/json" } },
            );
          }

          console.log("[generate-roadbook] Réponse Claude reçue, parsing...");
          const data = await resp.json();

          if (data?.stop_reason === "max_tokens") {
            console.error(
              "[generate-roadbook] Claude tronqué — réponse incomplète",
            );
            return new Response(
              JSON.stringify({
                error:
                  "La génération a été tronquée. Le voyage est trop long pour la limite actuelle. Réessaie ou contacte le support.",
              }),
              { status: 500, headers: { "Content-Type": "application/json" } },
            );
          }

          let rawText: string =
            data?.content?.[0]?.text ??
            data?.content?.map?.((c: any) => c.text).join("\n") ??
            "";
          console.log(
            "[generate-roadbook] Texte brut Claude (300 premiers chars):",
            rawText.substring(0, 300),
          );

          rawText = cleanClaudeJsonText(rawText);

          console.log(
            "[generate-roadbook] Texte nettoyé prêt à parser (200 premiers chars):",
            rawText.substring(0, 200),
          );

          let roadbook: Record<string, unknown>;
          try {
            roadbook = JSON.parse(rawText) as Record<string, unknown>;
          } catch (e: any) {
            console.error("[generate-roadbook] Parsing JSON échoué:", e);
            console.error(
              "[generate-roadbook] Texte complet qui a échoué:",
              rawText,
            );
            return new Response(
              JSON.stringify({
                error:
                  "JSON invalide après nettoyage: " +
                  e.message +
                  ". Texte: " +
                  rawText.substring(0, 300),
              }),
              { status: 500, headers: { "Content-Type": "application/json" } },
            );
          }

          // Garde-fous : Claude peut renvoyer un JSON parsable mais sans days
          // (ou avec un tableau vide), ce qui amène l'utilisateur sur une page
          // de roadbook vide sans message d'erreur. On rejette explicitement.
          const days = Array.isArray((roadbook as any).days)
            ? ((roadbook as any).days as unknown[])
            : null;
          if (!days || days.length === 0) {
            console.error(
              "[generate-roadbook] Réponse sans days valides:",
              rawText.substring(0, 500),
            );
            return new Response(
              JSON.stringify({
                error:
                  "L'IA a renvoyé un roadbook sans étapes. Réessaye, ou ajuste la destination / les dates si le problème persiste.",
              }),
              { status: 502, headers: { "Content-Type": "application/json" } },
            );
          }

          // Si la durée est très éloignée de ce qui était demandé, on renvoie
          // une 502 plutôt que de persister un roadbook tronqué (1 jour quand
          // l'utilisateur en a demandé 14, par exemple).
          if (
            duration_days >= 2 &&
            (days.length < Math.max(2, Math.floor(duration_days * 0.5)) ||
              days.length > duration_days * 1.5 + 2)
          ) {
            console.error(
              "[generate-roadbook] Mismatch durée — attendu",
              duration_days,
              "reçu",
              days.length,
            );
            return new Response(
              JSON.stringify({
                error: `L'IA a renvoyé ${days.length} jour(s) au lieu des ${duration_days} attendus. Réessaye.`,
              }),
              { status: 502, headers: { "Content-Type": "application/json" } },
            );
          }

          return new Response(JSON.stringify(roadbook), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error("[generate-roadbook] fatal error:", msg, e);
          return new Response(
            JSON.stringify({ error: msg || "Erreur inconnue" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
