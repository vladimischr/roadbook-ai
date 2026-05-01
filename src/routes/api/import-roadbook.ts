import { createFileRoute } from "@tanstack/react-router";
import { read as xlsxRead, utils as xlsxUtils } from "xlsx";
import { IMPORT_SYSTEM_PROMPT } from "@/server/import-prompt";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

export const Route = createFileRoute("/api/import-roadbook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const apiKey = process.env.ANTHROPIC_API_KEY;
          if (!apiKey) {
            return new Response(
              JSON.stringify({ error: "ANTHROPIC_API_KEY manquante." }),
              { status: 500, headers: { "Content-Type": "application/json" } },
            );
          }

          // Auth — récupère le user via le bearer token
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
          const userId = userData.user.id;

          const formData = await request.formData();
          const file = formData.get("file");
          if (!(file instanceof File)) {
            return new Response(
              JSON.stringify({ error: "Aucun fichier reçu." }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }
          if (file.size > MAX_FILE_BYTES) {
            return new Response(
              JSON.stringify({
                error: `Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(1)} MB > 5 MB).`,
              }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          console.log(
            "[import-roadbook] Reçu:",
            file.name,
            "size:",
            file.size,
            "type:",
            file.type,
          );

          const arrayBuffer = await file.arrayBuffer();
          const buffer = new Uint8Array(arrayBuffer);

          let workbook;
          try {
            workbook = xlsxRead(buffer, { type: "array", cellDates: true });
          } catch (e: any) {
            console.error("[import-roadbook] xlsx read fail:", e);
            return new Response(
              JSON.stringify({
                error:
                  "Fichier illisible. Formats supportés : .xlsx, .xls, .csv, .tsv, .ods.",
              }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          console.log(
            "[import-roadbook] Sheets:",
            workbook.SheetNames.length,
            workbook.SheetNames,
          );

          // Construit un texte représentant la structure
          const parts: string[] = [];
          for (const sheetName of workbook.SheetNames) {
            const ws = workbook.Sheets[sheetName];
            const rows = xlsxUtils.sheet_to_json(ws, {
              header: 1,
              raw: false,
              dateNF: "yyyy-mm-dd",
              defval: "",
            }) as unknown[][];
            console.log(
              `[import-roadbook] Sheet '${sheetName}' lignes:`,
              rows.length,
            );
            parts.push(`### Sheet: ${sheetName}`);
            // Tronque très long sheet à 200 lignes pour éviter dépassement tokens
            const limited = rows.slice(0, 200);
            limited.forEach((row, i) => {
              const cells = (row || [])
                .map((c, ci) => {
                  const letter = String.fromCharCode(
                    65 + (ci % 26),
                  );
                  const val =
                    c === null || c === undefined ? "" : String(c).trim();
                  return val ? `${letter}=${val}` : "";
                })
                .filter(Boolean)
                .join(" | ");
              if (cells) parts.push(`Ligne ${i + 1}: ${cells}`);
            });
            if (rows.length > 200) {
              parts.push(`... (${rows.length - 200} lignes tronquées)`);
            }
            parts.push("");
          }

          const fileText = parts.join("\n");
          console.log(
            "[import-roadbook] Texte envoyé à Claude (500 premiers chars):",
            fileText.substring(0, 500),
          );

          const userMessage = `# FICHIER UPLOADÉ

Nom du fichier : ${file.name}

# CONTENU EXTRAIT

${fileText}

# TÂCHE

Parse ce programme de voyage et construis le JSON Roadbook complet selon ta structure. Réponds UNIQUEMENT avec le JSON, démarrant directement par {.`;

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
              system: IMPORT_SYSTEM_PROMPT,
              messages: [
                { role: "user", content: userMessage },
                { role: "assistant", content: "{" },
              ],
            }),
          });
          console.log(
            "[import-roadbook] Anthropic responded in",
            Date.now() - t0,
            "ms status:",
            resp.status,
          );

          if (!resp.ok) {
            const errText = await resp.text();
            console.error("[import-roadbook] Anthropic err:", errText);
            return new Response(
              JSON.stringify({
                error: `Erreur Anthropic (${resp.status}): ${errText.slice(0, 300)}`,
              }),
              { status: 500, headers: { "Content-Type": "application/json" } },
            );
          }

          const data = await resp.json();
          console.log(
            "[import-roadbook] stop_reason:",
            data?.stop_reason,
          );
          if (data?.stop_reason === "max_tokens") {
            return new Response(
              JSON.stringify({
                error: "Réponse tronquée. Le fichier est trop volumineux.",
              }),
              { status: 500, headers: { "Content-Type": "application/json" } },
            );
          }

          let rawText: string =
            data?.content?.[0]?.text ??
            data?.content?.map?.((c: any) => c.text).join("\n") ??
            "";
          rawText = cleanClaudeJsonText(rawText);

          let roadbook: any;
          try {
            roadbook = JSON.parse(rawText);
          } catch (e: any) {
            console.error(
              "[import-roadbook] JSON parse fail. Texte:",
              rawText.substring(0, 1000),
            );
            return new Response(
              JSON.stringify({
                error: "Claude n'a pas renvoyé un JSON valide. Réessaye.",
              }),
              { status: 500, headers: { "Content-Type": "application/json" } },
            );
          }

          // Validation post-parsing : Claude doit renvoyer des days non vides.
          // Sans ça, l'utilisateur arrive sur une page de roadbook avec une
          // timeline vide (ce qu'il interprète comme "page blanche").
          const days = Array.isArray(roadbook?.days) ? roadbook.days : null;
          if (!days || days.length === 0) {
            console.error(
              "[import-roadbook] Pas de days dans la réponse Claude:",
              rawText.substring(0, 500),
            );
            return new Response(
              JSON.stringify({
                error:
                  "L'IA n'a pas réussi à extraire d'étapes du fichier. Vérifie que ton Excel contient au moins des lignes avec dates ou étapes, ou créé un roadbook manuellement.",
              }),
              { status: 422, headers: { "Content-Type": "application/json" } },
            );
          }

          // Normalise chaque jour : garantit les types numériques pour
          // distance_km / drive_hours et que le narrative est une string.
          // Sans ça, un jour avec drive_hours: "8h" (string) crash le rendu
          // .toFixed() côté client.
          roadbook.days = days.map((d: any, idx: number) => {
            const numeric = (v: unknown, fallback = 0): number => {
              const n =
                typeof v === "number"
                  ? v
                  : typeof v === "string"
                    ? parseFloat(v)
                    : NaN;
              return Number.isFinite(n) ? n : fallback;
            };
            return {
              day: numeric(d.day, idx + 1),
              date: typeof d.date === "string" ? d.date : "",
              stage: typeof d.stage === "string" ? d.stage : "",
              accommodation:
                typeof d.accommodation === "string" ? d.accommodation : "",
              type: typeof d.type === "string" ? d.type : "",
              distance_km: numeric(d.distance_km, 0),
              drive_hours: numeric(d.drive_hours, 0),
              flight: typeof d.flight === "string" ? d.flight : "—",
              narrative: typeof d.narrative === "string" ? d.narrative : "",
            };
          });

          // Insert en DB
          const { data: inserted, error: insertErr } = await supabaseAdmin
            .from("roadbooks")
            .insert({
              user_id: userId,
              client_name: roadbook.client_name || "À définir",
              destination: roadbook.destination || "À définir",
              start_date: roadbook.start_date || null,
              end_date: roadbook.end_date || null,
              travelers_count:
                typeof roadbook.travelers === "number"
                  ? roadbook.travelers
                  : 2,
              traveler_profile: roadbook.profile || null,
              theme: roadbook.theme || null,
              budget_range: roadbook.budget_range || null,
              generation_mode: "ai",
              content: roadbook,
              status: "ready",
            })
            .select("id")
            .single();

          if (insertErr || !inserted) {
            console.error("[import-roadbook] insert fail:", insertErr);
            return new Response(
              JSON.stringify({
                error: "Échec d'enregistrement: " + (insertErr?.message || ""),
              }),
              { status: 500, headers: { "Content-Type": "application/json" } },
            );
          }

          console.log("[import-roadbook] Roadbook créé:", inserted.id);
          return new Response(JSON.stringify({ id: inserted.id }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error("[import-roadbook] fatal:", msg);
          return new Response(JSON.stringify({ error: msg }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
