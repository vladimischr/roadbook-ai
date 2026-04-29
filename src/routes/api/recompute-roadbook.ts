import { createFileRoute } from "@tanstack/react-router";
import { ROADBOOK_SYSTEM_PROMPT } from "@/server/roadbook-prompt";

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
  if (!cleaned.startsWith("{")) cleaned = "{" + cleaned;
  cleaned = stripMarkdownFence(cleaned);
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  return cleaned.trim();
}

export const Route = createFileRoute("/api/recompute-roadbook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const apiKey = process.env.ANTHROPIC_API_KEY;
          if (!apiKey) {
            return new Response(
              JSON.stringify({ error: "ANTHROPIC_API_KEY manquante" }),
              { status: 500, headers: { "Content-Type": "application/json" } },
            );
          }

          const body = await request.json();
          const { roadbook, preserveModifiedNarratives } = body as {
            roadbook: Record<string, unknown>;
            preserveModifiedNarratives?: boolean;
          };

          if (!roadbook) {
            return new Response(
              JSON.stringify({ error: "roadbook manquant" }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          const preserveBlock = preserveModifiedNarratives
            ? `\n\nPRÉSERVATION STRICTE : pour chaque jour où narrative_user_modified === true, tu DOIS recopier le narrative existant TEL QUEL, sans aucune modification. Tu ne touches pas à ces narratives.`
            : "";

          const userMessage = `Voici un roadbook existant que l'utilisateur a modifié structurellement (ajouts, suppressions, réorganisations d'étapes). Tu dois RÉGÉNÉRER intelligemment ce roadbook en gardant exactement le squelette d'étapes, mais en :

1. Ajustant les dates (si l'utilisateur a ajouté des étapes, recalcule chaque date à partir de start_date en respectant le nombre de nuits par étape)
2. Régénérant le narrative de chaque jour pour qu'il s'inscrive dans l'enchaînement logique (transitions cohérentes avec les jours précédent/suivant)
3. Lissant les transitions entre étapes (mentions explicites du déplacement, du changement de zone)
4. Mettant à jour l'overview pour refléter le nouveau parcours complet
5. Adaptant les conseils pratiques à la nouvelle géographie (si nouvelles villes, nouveaux conseils)
6. Mettant à jour cover.tagline pour refléter la durée et la modalité

Tu PRÉSERVES :
- L'ordre exact des étapes (ne réorganise pas)
- Les noms d'hébergements précis donnés par l'utilisateur (sauf si vide ou "À définir")
- Les distance_km et drive_hours si > 0 (sinon recalcule)
- Le champ stage de chaque jour${preserveBlock}

Roadbook actuel à recalculer :

${JSON.stringify(roadbook, null, 2)}

Réponds UNIQUEMENT avec le JSON Roadbook complet recalculé, suivant la même structure que le system prompt. Démarre directement par {.`;

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
            "[recompute-roadbook] Anthropic responded in",
            Date.now() - t0,
            "ms status:",
            resp.status,
          );

          if (!resp.ok) {
            const errText = await resp.text();
            console.error("[recompute-roadbook] error:", resp.status, errText);
            return new Response(
              JSON.stringify({
                error: `Erreur Anthropic (${resp.status}): ${errText.slice(0, 300)}`,
              }),
              { status: 500, headers: { "Content-Type": "application/json" } },
            );
          }

          const data = await resp.json();
          if (data?.stop_reason === "max_tokens") {
            return new Response(
              JSON.stringify({
                error: "La régénération a été tronquée (voyage trop long).",
              }),
              { status: 500, headers: { "Content-Type": "application/json" } },
            );
          }

          let rawText: string =
            data?.content?.[0]?.text ??
            data?.content?.map?.((c: any) => c.text).join("\n") ??
            "";
          rawText = cleanClaudeJsonText(rawText);

          let recomputed: Record<string, unknown>;
          try {
            recomputed = JSON.parse(rawText);
          } catch (e: any) {
            console.error("[recompute-roadbook] JSON parse fail:", e);
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

          // Force preservation côté serveur (filet de sécurité) si demandé
          if (preserveModifiedNarratives) {
            const origDays = (roadbook as any).days as any[] | undefined;
            const newDays = (recomputed as any).days as any[] | undefined;
            if (Array.isArray(origDays) && Array.isArray(newDays)) {
              for (let i = 0; i < newDays.length; i++) {
                const orig = origDays[i];
                if (orig?.narrative_user_modified && orig?.narrative) {
                  newDays[i] = {
                    ...newDays[i],
                    narrative: orig.narrative,
                    narrative_user_modified: true,
                  };
                }
              }
            }
          }

          // Invalide le cache directions pour reforcer recalcul carte
          (recomputed as any).directions_segments = [];

          return new Response(JSON.stringify(recomputed), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error("[recompute-roadbook] fatal:", msg);
          return new Response(JSON.stringify({ error: msg }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
