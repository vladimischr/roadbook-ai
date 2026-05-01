// Helpers client → routes API authentifiées. Remplace les anciens
// `createServerFn` qui causaient des erreurs d'import-protection en build
// Cloudflare (le plugin TanStack flagge tout import client de fichiers
// `src/server/*`).
import { supabase } from "@/integrations/supabase/client";

async function authHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Session expirée. Reconnecte-toi.");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function readJsonOrThrow<T>(res: Response): Promise<T> {
  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    /* fallthrough */
  }
  if (!res.ok) {
    const msg =
      (parsed && typeof parsed === "object" && (parsed as any).error) ||
      `HTTP ${res.status}`;
    throw new Error(String(msg));
  }
  return parsed as T;
}

export interface GeocodeResult {
  lat: number | null;
  lng: number | null;
  formatted: string | null;
  geocoded_from: string | null;
  confidence: "high" | "fallback" | null;
  /** Status Google Maps remonté pour debug (ZERO_RESULTS, REQUEST_DENIED, etc.). */
  api_status?: string;
  error_message?: string;
}

export async function geocodePlace(input: {
  query: string;
  region?: string;
}): Promise<GeocodeResult> {
  const headers = await authHeaders();
  const res = await fetch("/api/geocode-place", {
    method: "POST",
    headers,
    body: JSON.stringify(input),
  });
  return readJsonOrThrow<GeocodeResult>(res);
}

export interface DirectionsResult {
  ok: boolean;
  encoded_polyline: string | null;
  distance_meters: number | null;
  duration_seconds: number | null;
  status?: string;
}

export async function getDirectionsSegment(input: {
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
}): Promise<DirectionsResult> {
  const headers = await authHeaders();
  const res = await fetch("/api/directions-segment", {
    method: "POST",
    headers,
    body: JSON.stringify(input),
  });
  return readJsonOrThrow<DirectionsResult>(res);
}

export interface DestinationCoverResult {
  url: string | null;
  alt: string;
  credit: string;
}

export async function fetchDestinationCover(input: {
  destination: string;
}): Promise<DestinationCoverResult> {
  const headers = await authHeaders();
  const url =
    "/api/destination-cover?destination=" +
    encodeURIComponent(input.destination);
  const res = await fetch(url, { headers });
  return readJsonOrThrow<DestinationCoverResult>(res);
}
