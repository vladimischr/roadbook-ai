import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { withSchemaRetry } from "@/lib/supabaseRetry.server";

// ============================================================================
// /api/voyage-manifest?token=XXX — manifest PWA dynamique par voyage
// ============================================================================
// Chaque voyage devient une "app installable" sur le téléphone du voyageur,
// avec le nom de la destination, le branding de l'agence (couleur, icône
// avec initiale agence). Une fois installée, ouvre direct sur /voyage/<token>
// en mode standalone (sans barre d'adresse).

export const Route = createFileRoute("/api/voyage-manifest")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const token = url.searchParams.get("token");
        if (!token) {
          return new Response("token requis", { status: 400 });
        }

        // Récupère destination + branding designer
        const { data: rb } = await withSchemaRetry(() =>
          supabaseAdmin
            .from("roadbooks")
            .select("destination, client_name, user_id")
            .eq("share_token", token)
            .maybeSingle(),
        );

        const destination = (rb as any)?.destination ?? "Voyage";
        const userId = (rb as any)?.user_id;

        let agencyName = "Roadbook";
        let brandColor = "#0F6E56";
        if (userId) {
          const { data: profile } = await withSchemaRetry(() =>
            supabaseAdmin
              .from("profiles")
              .select("display_name, agency_name, brand_color")
              .eq("id", userId)
              .maybeSingle(),
          );
          if (profile) {
            agencyName =
              (profile as any).agency_name ||
              (profile as any).display_name ||
              "Roadbook";
            brandColor = (profile as any).brand_color || "#0F6E56";
          }
        }

        const startUrl = `/voyage/${token}`;
        const iconBase = `/api/voyage-icon?token=${encodeURIComponent(token)}`;

        const manifest = {
          name: `${destination} — ${agencyName}`,
          short_name: destination.slice(0, 12),
          description: `Carnet de voyage préparé par ${agencyName}`,
          start_url: startUrl,
          scope: startUrl,
          display: "standalone",
          orientation: "portrait",
          background_color: "#FAF9F6",
          theme_color: brandColor,
          icons: [
            {
              src: `${iconBase}&size=192`,
              sizes: "192x192",
              type: "image/svg+xml",
              purpose: "any",
            },
            {
              src: `${iconBase}&size=512`,
              sizes: "512x512",
              type: "image/svg+xml",
              purpose: "any maskable",
            },
          ],
        };

        return new Response(JSON.stringify(manifest, null, 2), {
          status: 200,
          headers: {
            "Content-Type": "application/manifest+json",
            "Cache-Control": "public, max-age=300",
          },
        });
      },
    },
  },
});
