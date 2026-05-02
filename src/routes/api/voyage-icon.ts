import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { withSchemaRetry } from "@/lib/supabaseRetry.server";

// ============================================================================
// /api/voyage-icon?token=XXX&size=192 — icône SVG dynamique pour PWA
// ============================================================================
// Fond couleur de marque agence + initiale agence en grand. Pas besoin de
// fichiers statiques — tout généré à la volée. Cache 1h côté client.

export const Route = createFileRoute("/api/voyage-icon")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const token = url.searchParams.get("token");
        const size = parseInt(url.searchParams.get("size") || "192", 10);

        let brandColor = "#0F6E56";
        let initial = "R";

        if (token) {
          const { data: rb } = await withSchemaRetry(() =>
            supabaseAdmin
              .from("roadbooks")
              .select("user_id")
              .eq("share_token", token)
              .maybeSingle(),
          );
          const userId = (rb as any)?.user_id;
          if (userId) {
            const { data: profile } = await withSchemaRetry(() =>
              supabaseAdmin
                .from("profiles")
                .select("display_name, agency_name, brand_color")
                .eq("id", userId)
                .maybeSingle(),
            );
            if (profile) {
              brandColor = (profile as any).brand_color || brandColor;
              const name =
                (profile as any).agency_name ||
                (profile as any).display_name ||
                "R";
              initial = name.trim().charAt(0).toUpperCase() || "R";
            }
          }
        }

        const fontSize = Math.round(size * 0.55);
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" fill="${escapeAttr(brandColor)}"/>
  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central"
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
        font-size="${fontSize}" font-weight="600" fill="#FAF9F6">${escapeText(initial)}</text>
</svg>`;

        return new Response(svg, {
          status: 200,
          headers: {
            "Content-Type": "image/svg+xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});

function escapeAttr(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
  );
}
function escapeText(s: string): string {
  return s.replace(/[&<>]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] ?? c,
  );
}
