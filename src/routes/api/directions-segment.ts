import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const inputSchema = z.object({
  from: z.object({ lat: z.number().finite(), lng: z.number().finite() }),
  to: z.object({ lat: z.number().finite(), lng: z.number().finite() }),
});

export const Route = createFileRoute("/api/directions-segment")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          return new Response(
            JSON.stringify({ error: "GOOGLE_MAPS_API_KEY non configurée" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

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
        const parsed = inputSchema.safeParse(rawBody);
        if (!parsed.success) {
          return new Response(
            JSON.stringify({
              error: "Payload invalide",
              issues: parsed.error.issues,
            }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        const { from, to } = parsed.data;
        const url = new URL(
          "https://maps.googleapis.com/maps/api/directions/json",
        );
        url.searchParams.set("origin", `${from.lat},${from.lng}`);
        url.searchParams.set("destination", `${to.lat},${to.lng}`);
        url.searchParams.set("mode", "driving");
        url.searchParams.set("language", "fr");
        url.searchParams.set("key", apiKey);

        try {
          const res = await fetch(url.toString());
          if (!res.ok) {
            console.error("[directions-segment] HTTP", res.status);
            return new Response(
              JSON.stringify({
                ok: false,
                encoded_polyline: null,
                distance_meters: null,
                duration_seconds: null,
              }),
              { status: 200, headers: { "Content-Type": "application/json" } },
            );
          }
          const json = (await res.json()) as {
            status: string;
            routes?: Array<{
              overview_polyline?: { points?: string };
              legs?: Array<{
                distance?: { value?: number };
                duration?: { value?: number };
              }>;
            }>;
          };
          if (json.status !== "OK" || !json.routes?.length) {
            return new Response(
              JSON.stringify({
                ok: false,
                encoded_polyline: null,
                distance_meters: null,
                duration_seconds: null,
                status: json.status,
              }),
              { status: 200, headers: { "Content-Type": "application/json" } },
            );
          }
          const route = json.routes[0];
          const encoded = route.overview_polyline?.points ?? null;
          const totalDist =
            route.legs?.reduce(
              (acc, l) => acc + (l.distance?.value ?? 0),
              0,
            ) ?? null;
          const totalDur =
            route.legs?.reduce(
              (acc, l) => acc + (l.duration?.value ?? 0),
              0,
            ) ?? null;
          return new Response(
            JSON.stringify({
              ok: true,
              encoded_polyline: encoded,
              distance_meters: totalDist,
              duration_seconds: totalDur,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        } catch (err) {
          console.error("[directions-segment] fetch failed:", err);
          return new Response(
            JSON.stringify({
              ok: false,
              encoded_polyline: null,
              distance_meters: null,
              duration_seconds: null,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
