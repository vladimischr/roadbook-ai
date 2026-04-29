import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  destination: z.string().min(1).max(200),
});

interface PexelsPhoto {
  src: {
    landscape: string;
    large2x: string;
    large: string;
    medium: string;
  };
  alt: string;
  photographer: string;
  url: string;
}

interface PexelsResponse {
  photos: PexelsPhoto[];
}

/**
 * Fetch a hero cover image URL for a destination using Pexels API.
 * Server-side: keeps PEXELS_API_KEY private.
 *
 * Returns the landscape variant (1200x627) which is ideal for covers.
 * If the key is missing or the API errors, returns null — callers should
 * gracefully fall back to a gradient.
 */
export const fetchDestinationCover = createServerFn({ method: "GET" })
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.PEXELS_API_KEY;
    if (!apiKey) {
      return { url: null as string | null, alt: "", credit: "" };
    }

    // Append "travel landscape" to bias toward scenic photos vs. portraits.
    const query = `${data.destination} travel landscape`;
    const url =
      "https://api.pexels.com/v1/search?per_page=5&orientation=landscape&query=" +
      encodeURIComponent(query);

    try {
      const res = await fetch(url, {
        headers: { Authorization: apiKey },
      });
      if (!res.ok) {
        console.error("[Pexels] HTTP", res.status, await res.text());
        return { url: null, alt: "", credit: "" };
      }
      const json = (await res.json()) as PexelsResponse;
      const photo = json.photos?.[0];
      if (!photo) return { url: null, alt: "", credit: "" };
      return {
        url: photo.src.large2x || photo.src.landscape || photo.src.large,
        alt: photo.alt || data.destination,
        credit: `Photo: ${photo.photographer} / Pexels`,
      };
    } catch (err) {
      console.error("[Pexels] fetch failed:", err);
      return { url: null, alt: "", credit: "" };
    }
  });
