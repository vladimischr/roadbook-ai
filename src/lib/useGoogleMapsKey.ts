import { useEffect, useState } from "react";
import { getGoogleMapsApiKey } from "@/server/maps.functions";

let cached: string | null = null;
let inflight: Promise<string> | null = null;

async function loadKey(): Promise<string> {
  if (cached) return cached;
  if (!inflight) {
    inflight = getGoogleMapsApiKey()
      .then((r) => {
        cached = r.apiKey;
        return r.apiKey;
      })
      .catch((err) => {
        // Sans ce reset, un échec réseau ou une clé manquante côté serveur
        // gèlerait définitivement le hook : tous les appels suivants
        // recevraient la même promesse rejetée. On nettoie pour permettre
        // un retry au prochain mount.
        inflight = null;
        throw err;
      });
  }
  return inflight;
}

/**
 * Charge la clé Google Maps une fois côté client et la met en cache module.
 * Utilisé pour passer apiKey à <APIProvider>.
 */
export function useGoogleMapsKey() {
  const [apiKey, setApiKey] = useState<string | null>(cached);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (apiKey) return;
    let active = true;
    loadKey()
      .then((k) => active && setApiKey(k))
      .catch((e) => active && setError(e?.message ?? "load_failed"));
    return () => {
      active = false;
    };
  }, [apiKey]);

  return { apiKey, error };
}
