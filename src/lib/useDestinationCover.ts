import { useEffect, useState } from "react";
import { fetchDestinationCover } from "@/server/cover.functions";

/** In-memory cache so repeat visits don't re-hit Pexels. */
const cache = new Map<string, string | null>();
const inflight = new Map<string, Promise<string | null>>();

async function loadCover(destination: string): Promise<string | null> {
  const key = destination.trim().toLowerCase();
  if (!key) return null;
  if (cache.has(key)) return cache.get(key) ?? null;
  if (inflight.has(key)) return inflight.get(key)!;
  const p = fetchDestinationCover({ data: { destination } })
    .then((r) => {
      cache.set(key, r.url);
      return r.url;
    })
    .catch(() => {
      cache.set(key, null);
      return null;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

/** Fetch a Pexels cover URL for a destination, with module-level cache. */
export function useDestinationCover(destination: string | undefined | null) {
  const [url, setUrl] = useState<string | null>(() => {
    if (!destination) return null;
    return cache.get(destination.trim().toLowerCase()) ?? null;
  });

  useEffect(() => {
    if (!destination) return;
    let active = true;
    loadCover(destination).then((u) => {
      if (active) setUrl(u);
    });
    return () => {
      active = false;
    };
  }, [destination]);

  return url;
}
