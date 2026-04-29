import { createFileRoute } from "@tanstack/react-router";
import { ROADBOOK_SYSTEM_PROMPT } from "@/server/roadbook-prompt";

function daysBetween(a?: string, b?: string): number {
  if (!a || !b) return 7;
  const d = Math.round(
    (new Date(b).getTime() - new Date(a).getTime()) / 86400000,
  );
  return Math.max(1, d || 7);
}

function extractJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const stripped = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();
    try {
      return JSON.parse(stripped);
    } catch {
      const first = stripped.indexOf("{");
      const last = stripped.lastIndexOf("}");
      if (first >= 0 && last > first) {
        return JSON.parse(stripped.slice(first, last + 1));
      }
      throw new Error("Réponse Claude non parsable en JSON");
    }
  }
}

export const Route = createFileRoute("/api/generate-roadbook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const apiKey = process.env.ANTHROPIC_API_KEY;
          console.log(
            "[generate-roadbook] start, key present:",
            Boolean(apiKey),
          );
          if (!apiKey) {
            return new Response(
              JSON.stringify({
                error: "ANTHROPIC_API_KEY manquante côté serveur.",
              }),
              { status: 500, headers: { "Content-Type": "application/json" } },
            );
          }

          const form = await request.json();
          const duration_days = daysBetween(form.start_date, form.end_date);
          const inputs = { ...form, duration_days };

          const userMessage =
            "Voici les paramètres du voyage à mettre en forme :\n\n" +
            JSON.stringify(inputs, null, 2);

          const resp = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model: "claude-sonnet-4-5",
              max_tokens: 8000,
              system: ROADBOOK_SYSTEM_PROMPT,
              messages: [{ role: "user", content: userMessage }],
            }),
          });

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

          const data = await resp.json();
          const text =
            data?.content?.[0]?.text ??
            data?.content?.map?.((c: any) => c.text).join("\n") ??
            "";

          let parsed: unknown;
          try {
            parsed = extractJson(text);
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            console.error(
              "[generate-roadbook] Parse JSON failed:",
              msg,
              "raw:",
              text.slice(0, 1000),
            );
            return new Response(
              JSON.stringify({
                error: `La réponse de Claude n'était pas un JSON valide: ${msg}`,
              }),
              { status: 500, headers: { "Content-Type": "application/json" } },
            );
          }

          return new Response(JSON.stringify(parsed), {
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
