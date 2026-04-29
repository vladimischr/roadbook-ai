import { createFileRoute } from "@tanstack/react-router";
import { ROADBOOK_SYSTEM_PROMPT } from "@/server/roadbook-prompt";

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

          const formData = await request.json();
          console.log(
            "[generate-roadbook] Reçu form:",
            JSON.stringify(formData),
          );
          const duration_days = daysBetween(
            formData.start_date,
            formData.end_date,
          );
          const inputs = { ...formData, duration_days };

          const userMessage =
            "Voici les paramètres du voyage à mettre en forme :\n\n" +
            JSON.stringify(inputs, null, 2);

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
              max_tokens: 4000,
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

          let roadbook: unknown;
          try {
            roadbook = JSON.parse(rawText);
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
