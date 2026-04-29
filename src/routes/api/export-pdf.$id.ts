import { createFileRoute } from "@tanstack/react-router";
import { renderToStream } from "@react-pdf/renderer";
import React from "react";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { RoadbookPDF, type RoadbookContent } from "@/lib/pdf/RoadbookPDF";

function slug(s: string | undefined | null): string {
  if (!s) return "";
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const Route = createFileRoute("/api/export-pdf/$id")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        try {
          const { id } = params;

          // Authenticate using bearer token if provided, otherwise fall back to admin.
          const authHeader = request.headers.get("authorization");
          let userId: string | null = null;
          if (authHeader?.startsWith("Bearer ")) {
            const token = authHeader.slice(7);
            const { data, error } = await supabaseAdmin.auth.getUser(token);
            if (!error && data.user) userId = data.user.id;
          }

          const { data: rb, error } = await supabaseAdmin
            .from("roadbooks")
            .select("id, user_id, client_name, destination, content")
            .eq("id", id)
            .maybeSingle();

          if (error || !rb) {
            return new Response(
              JSON.stringify({ error: "Roadbook introuvable" }),
              { status: 404, headers: { "Content-Type": "application/json" } },
            );
          }

          if (userId && rb.user_id !== userId) {
            return new Response(
              JSON.stringify({ error: "Accès refusé" }),
              { status: 403, headers: { "Content-Type": "application/json" } },
            );
          }

          const content = (rb.content || {}) as RoadbookContent;
          const merged: RoadbookContent = {
            ...content,
            client_name: content.client_name ?? rb.client_name ?? "",
            destination: content.destination ?? rb.destination ?? "",
          };

          const apiKey = process.env.GOOGLE_MAPS_API_KEY;

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const element: any = React.createElement(RoadbookPDF, {
            roadbook: merged,
            mapsApiKey: apiKey,
          });
          const stream = await renderToStream(element);

          const chunks: Uint8Array[] = [];
          for await (const chunk of stream as unknown as AsyncIterable<Uint8Array>) {
            chunks.push(chunk);
          }
          const totalLen = chunks.reduce((n, c) => n + c.length, 0);
          const buffer = new Uint8Array(totalLen);
          let offset = 0;
          for (const c of chunks) {
            buffer.set(c, offset);
            offset += c.length;
          }

          const filename = `Roadbook-${slug(merged.client_name) || "voyage"}-${
            slug(merged.destination) || "itineraire"
          }.pdf`;

          return new Response(buffer, {
            status: 200,
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `attachment; filename="${filename}"`,
              "Cache-Control": "no-store",
            },
          });
        } catch (e: unknown) {
          const err = e as { message?: string; stack?: string };
          console.error("[export-pdf] Erreur génération PDF:", err);
          console.error("[export-pdf] Stack:", err?.stack);
          return new Response(
            JSON.stringify({
              error: "Erreur génération PDF: " + (err?.message || "unknown"),
              stack: err?.stack?.substring(0, 500),
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
      },
    },
  },
});
