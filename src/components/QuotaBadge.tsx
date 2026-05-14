import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { useSubscription } from "@/lib/useSubscription";
import { cn } from "@/lib/utils";

/**
 * QuotaBadge — Indicateur discret du quota restant pour les utilisateurs
 * sur le plan gratuit.
 *
 * Logique d'affichage :
 *   - User non chargé / paid plan      → null (pas de pression sur les payants)
 *   - Free, 0 roadbook utilisé         → null (rien à signaler, on ne stresse pas)
 *   - Free, 1-N roadbook utilisé        → "X/Y ce mois · Passer Pro" (info + soft CTA)
 *   - Free, quota atteint              → "Quota atteint · Passer Pro" (rouge subtil)
 *
 * Placement : injecté dans la topbar via le slot AppShell, sur les pages
 * de l'app authentifiée.
 */
export function QuotaBadge() {
  const { info, loading } = useSubscription();

  if (loading || !info) return null;
  // Pas de pression sur les payants
  if (info.planKey !== "free") return null;

  const used = info.roadbooksUsed ?? 0;
  const limit = info.roadbooksLimit ?? 2;
  // Pas de bruit visuel si l'user n'a pas commencé à consommer
  if (used === 0) return null;

  const remaining = Math.max(0, limit - used);
  const exhausted = remaining === 0;

  return (
    <Link
      to="/pricing"
      className={cn(
        "hidden h-8 items-center gap-1.5 rounded-full border px-3 text-[11.5px] font-medium transition-smooth sm:inline-flex",
        exhausted
          ? "border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
          : "border-border bg-surface text-muted-foreground hover:border-primary/40 hover:bg-primary-soft hover:text-primary",
      )}
      aria-label={
        exhausted
          ? "Quota atteint — passer à un plan payant"
          : `${remaining} roadbook${remaining > 1 ? "s" : ""} restant${remaining > 1 ? "s" : ""} ce mois — voir les plans`
      }
    >
      <Sparkles className="h-3 w-3" />
      {exhausted ? (
        <span>Quota atteint · <span className="underline-offset-2 hover:underline">Pro</span></span>
      ) : (
        <span>
          {used}/{limit} ce mois · <span className="underline-offset-2 hover:underline">Pro</span>
        </span>
      )}
    </Link>
  );
}
