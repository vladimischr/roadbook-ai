import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PlanKey } from "@/lib/plans";

export interface SubscriptionInfo {
  planKey: PlanKey;
  planStatus: string;
  used: number;
  limit: number | null;
  remaining: number | null;
  periodStart: string;
  canGenerate: boolean;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  cancelAt: string | null;
}

/**
 * Hook React qui expose le plan + quota courant. Re-fetch sur demande
 * (ex: après un checkout réussi). Coût : 1 appel /api/me-subscription par
 * mount.
 */
export function useSubscription() {
  const [info, setInfo] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setInfo(null);
        setLoading(false);
        return;
      }
      const res = await fetch("/api/me-subscription", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as SubscriptionInfo;
      setInfo(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { info, loading, error, refetch };
}

/**
 * Helper client : redirige vers Stripe Checkout pour souscrire à un plan.
 * Le navigateur quitte l'app temporairement, Stripe encaisse, puis renvoie
 * sur /billing?status=success.
 */
export async function redirectToCheckout(
  planKey: Exclude<PlanKey, "free">,
  billing: "monthly" | "annual" = "monthly",
) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    throw new Error("Connecte-toi pour souscrire.");
  }
  const res = await fetch("/api/stripe-checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      plan_key: planKey,
      billing,
      origin: window.location.origin,
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try {
      msg = JSON.parse(text).error || text;
    } catch {}
    throw new Error(msg);
  }
  const data = JSON.parse(text) as { url: string };
  window.location.href = data.url;
}

/**
 * Helper client : ouvre le portail de gestion Stripe (factures, CB,
 * annulation).
 */
export async function redirectToPortal() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    throw new Error("Connecte-toi pour accéder au portail.");
  }
  const res = await fetch("/api/stripe-portal", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ origin: window.location.origin }),
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try {
      msg = JSON.parse(text).error || text;
    } catch {}
    throw new Error(msg);
  }
  const data = JSON.parse(text) as { url: string };
  window.location.href = data.url;
}
