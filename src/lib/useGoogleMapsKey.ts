import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

let cached: string | null = null;
let inflight: Promise<string> | null = null;

async function loadKey(): Promise<string> {
  if (cached) return cached;
  if (!inflight) {
    inflight = (async () => {
      // Récupère le token de session Supabase pour authentifier l'appel.
      // Sans ce gate côté API, n'importe quel visiteur du site (ou un bot)
      // pourrait récupérer la clé Maps. La sécurité réelle de la clé reste
      // portée par les HTTP referrer restrictions Google Cloud, mais ce
      // gate empêche les appels triviaux.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Non authentifié");

      const res = await fetch("/api/maps-key", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error(`maps-key HTTP ${res.status}`);
      }
      const json = (await res.json()) as { apiKey?: string; error?: string };
      if (!json.apiKey) {
        throw new Error(json.error || "apiKey absente de la réponse");
      }
      cached = json.apiKey;
      return json.apiKey;
    })().catch((err) => {
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
