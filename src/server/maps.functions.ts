import { createServerFn } from "@tanstack/react-start";

/**
 * Renvoie la clé Google Maps au client.
 * La sécurité réelle vient des restrictions HTTP referrer configurées
 * dans Google Cloud Console (pas du stockage de la clé).
 */
export const getGoogleMapsApiKey = createServerFn({ method: "GET" }).handler(
  async () => {
    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key) {
      throw new Error("GOOGLE_MAPS_API_KEY is not configured");
    }
    return { apiKey: key };
  },
);
