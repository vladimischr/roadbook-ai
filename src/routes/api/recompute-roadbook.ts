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

          const inputDaysCount = Array.isArray((roadbook as any).days)
            ? (roadbook as any).days.length
            : 0;
          const inputStages = (Array.isArray((roadbook as any).days)
            ? (roadbook as any).days
            : []
          ).map((d: any) => d?.stage);
          console.log(
            "[recompute-roadbook] INPUT days:",
            inputDaysCount,
            "stages:",
            JSON.stringify(inputStages),
          );

          const userMessage = `# CONSIGNE STRICTE

L'utilisateur a apporté des modifications structurelles à ce roadbook (ajouts, suppressions, réorganisations d'étapes). Tu dois RÉGÉNÉRER intelligemment ce roadbook en gardant EXACTEMENT le squelette d'étapes existant.

Tu DOIS reproduire dans ta réponse JSON :

- Le NOMBRE EXACT de jours : il y a ACTUELLEMENT ${inputDaysCount} jours et tu DOIS renvoyer EXACTEMENT ${inputDaysCount} jours dans days[]. Ne supprime AUCUN jour, n'en ajoute AUCUN.
- L'ORDRE EXACT des jours (ne réorganise pas)
- Pour chaque jour : préserver stage, accommodation, type, lat, lng tels que reçus (sauf si vides ou 'À définir' → tu peux les compléter)

Tu peux réécrire :

- narrative (sauf si narrative_user_modified === true → tu recopies tel quel)
- date (recalculer à partir de start_date, +1 jour par étape successive)
- distance_km / drive_hours (recalculer logiquement à partir de la géographie réelle)
- flight (compléter si pertinent)
- overview, contacts, tips, cover.tagline, cover.subtitle, cover.dates_label (régénérer pour cohérence)
- end_date / duration_days (recalculer à partir de start_date + ${inputDaysCount} jours)

Mise à jour pratique :
- Lisse les transitions entre étapes (mentions explicites du déplacement, du changement de zone)
- Adapte les conseils pratiques à la nouvelle géographie

Stages actuels dans cet ordre EXACT (à reproduire à l'identique) :
${JSON.stringify(inputStages)}${preserveBlock}

# ROADBOOK ACTUEL À RECALCULER (préserve TOUTES les étapes)

${JSON.stringify(roadbook, null, 2)}

Réponds avec le JSON Roadbook complet recalculé. La longueur de days[] DOIT être EXACTEMENT ${inputDaysCount}. Réponds UNIQUEMENT avec le JSON brut, sans markdown, sans commentaire. Démarre directement par {.`;

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

          const outputDays = (recomputed as any).days as any[] | undefined;
          const outputDaysCount = Array.isArray(outputDays) ? outputDays.length : 0;
          const outputStages = Array.isArray(outputDays)
            ? outputDays.map((d: any) => d?.stage)
            : [];
          console.log(
            "[recompute-roadbook] OUTPUT days:",
            outputDaysCount,
            "stages:",
            JSON.stringify(outputStages),
          );

          if (outputDaysCount !== inputDaysCount) {
            console.error(
              "[recompute-roadbook] MISMATCH days count — input:",
              inputDaysCount,
              "output:",
              outputDaysCount,
            );
            return new Response(
              JSON.stringify({
                error: `Claude a renvoyé ${outputDaysCount} jours au lieu de ${inputDaysCount}. Réessaye.`,
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

          // Filet de sécurité supplémentaire : préserver stage / lat / lng
          // de chaque étape par index (Claude est instruit de le faire mais
          // peut faillir).
          {
            const origDays = (roadbook as any).days as any[] | undefined;
            const newDays = (recomputed as any).days as any[] | undefined;
            if (Array.isArray(origDays) && Array.isArray(newDays)) {
              for (let i = 0; i < newDays.length; i++) {
                const orig = origDays[i];
                if (!orig) continue;
                const cur = newDays[i] || {};
                const merged = { ...cur };
                if (orig.stage && !cur.stage) merged.stage = orig.stage;
                if (typeof orig.lat === "number") merged.lat = orig.lat;
                if (typeof orig.lng === "number") merged.lng = orig.lng;
                if (
                  orig.accommodation &&
                  !/^à définir$/i.test(orig.accommodation) &&
                  (!cur.accommodation || /^à définir$/i.test(cur.accommodation))
                ) {
                  merged.accommodation = orig.accommodation;
                }
                newDays[i] = merged;
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
