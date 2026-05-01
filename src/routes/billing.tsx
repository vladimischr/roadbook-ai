import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Sparkles,
  CreditCard,
  ArrowRight,
  AlertTriangle,
  Loader2,
  Check,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useSubscription, redirectToPortal } from "@/lib/useSubscription";
import { Paywall } from "@/components/Paywall";
import { getPlan, formatPlanPrice } from "@/lib/plans";
import { toast } from "sonner";

export const Route = createFileRoute("/billing")({
  component: Billing,
  head: () => ({ meta: [{ title: "Mon abonnement — Roadbook.ai" }] }),
});

function Billing() {
  const navigate = useNavigate();
  const { info, loading, refetch } = useSubscription();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  // Si on revient de Stripe Checkout (?status=success), on affiche un toast
  // et on rafraîchit le profil. Le webhook met à jour la DB en parallèle —
  // un re-fetch après ~2s capte le nouveau plan.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    if (status === "success") {
      toast.success("Abonnement actif. Bienvenue à bord.");
      // Re-fetch deux fois pour laisser le temps au webhook
      setTimeout(refetch, 1500);
      setTimeout(refetch, 4000);
      // Nettoie l'URL pour ne pas re-trigger au refresh
      window.history.replaceState({}, "", "/billing");
    }
  }, [refetch]);

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      await redirectToPortal();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
      setPortalLoading(false);
    }
  };

  if (loading || !info) {
    return (
      <AppShell>
        <div className="grid min-h-[60vh] place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  const plan = getPlan(info.planKey);
  const isPaid = info.planKey !== "free";
  const roadbookPct =
    info.roadbooksLimit === null
      ? 0
      : Math.min(
          100,
          Math.round((info.roadbooksUsed / info.roadbooksLimit) * 100),
        );
  const chatPct =
    info.chatCreditsLimit === null
      ? 0
      : info.chatCreditsLimit === 0
        ? 100
        : Math.min(
            100,
            Math.round((info.chatCreditsUsed / info.chatCreditsLimit) * 100),
          );
  const isPastDue =
    info.planStatus === "past_due" || info.planStatus === "unpaid";
  const isTrialing = info.planStatus === "trialing";

  return (
    <AppShell>
      <div className="container-editorial px-6 py-12 sm:px-10 lg:px-14 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-3">
            <span className="rule-warm" aria-hidden />
            <span className="eyebrow">Mon abonnement</span>
          </div>
          <h1 className="font-display mt-5 text-[42px] font-semibold leading-[1.05] tracking-tight text-foreground sm:text-[52px]">
            Facturation
          </h1>

          {isPastDue && (
            <div className="mt-8 flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-5">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-destructive" />
              <div className="flex-1">
                <p className="font-medium text-foreground">
                  Paiement en échec
                </p>
                <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">
                  La dernière tentative de prélèvement a échoué. Mettez à jour
                  votre carte bancaire dans le portail pour reprendre la
                  génération.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePortal}
                  disabled={portalLoading}
                  className="mt-3 gap-2 rounded-full"
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  Mettre à jour ma CB
                </Button>
              </div>
            </div>
          )}

          {/* Carte plan actuel */}
          <section className="mt-10 rounded-2xl border border-border/60 bg-surface p-8 shadow-soft">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-accent-warm">
                  Plan actuel
                </p>
                <h2 className="font-display mt-3 text-[34px] font-semibold leading-none text-foreground">
                  {plan.name}
                </h2>
                <p className="mt-2 text-[14px] text-muted-foreground">
                  {plan.tagline}
                </p>
                <p className="mt-5 font-display text-[20px] text-foreground">
                  {formatPlanPrice(plan.priceMonthly)}
                  {plan.priceMonthly > 0 && (
                    <span className="text-[13px] text-muted-foreground">
                      {" "}
                      / mois
                    </span>
                  )}
                </p>
                {isTrialing && info.trialEndsAt && (
                  <p className="mt-2 text-[12.5px] text-muted-foreground">
                    Essai gratuit jusqu'au{" "}
                    <strong className="text-foreground">
                      {formatDate(info.trialEndsAt)}
                    </strong>
                    .
                  </p>
                )}
                {info.cancelAt && (
                  <p className="mt-2 text-[12.5px] text-amber-700">
                    Annulation effective le{" "}
                    <strong>{formatDate(info.cancelAt)}</strong>.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2 sm:items-end">
                {isPaid ? (
                  <Button
                    onClick={handlePortal}
                    disabled={portalLoading}
                    className="gap-2 rounded-full"
                  >
                    {portalLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CreditCard className="h-4 w-4" />
                    )}
                    Gérer mon abonnement
                  </Button>
                ) : (
                  <Button
                    onClick={() => setPaywallOpen(true)}
                    className="gap-2 rounded-full"
                  >
                    <Sparkles className="h-4 w-4" />
                    Passer Pro
                  </Button>
                )}
                {isPaid && (
                  <button
                    type="button"
                    onClick={() => setPaywallOpen(true)}
                    className="text-[12.5px] text-muted-foreground transition hover:text-foreground"
                  >
                    Changer de plan
                  </button>
                )}
              </div>
            </div>

            {/* Deux compteurs distincts — roadbooks + modifications IA */}
            <div className="mt-8 space-y-7 border-t border-border/60 pt-6">
              <p className="text-[12.5px] text-muted-foreground">
                Réinitialisé le {formatDate(info.periodStart)}
              </p>

              {/* Quota 1 : Roadbooks créés */}
              <div>
                <div className="flex items-baseline justify-between">
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-accent-warm">
                    Roadbooks créés
                  </p>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-display text-[28px] font-semibold leading-none text-foreground">
                    {info.roadbooksUsed}
                  </span>
                  <span className="text-[13px] text-muted-foreground">
                    / {info.roadbooksLimit === null ? "∞" : info.roadbooksLimit}
                  </span>
                </div>
                {info.roadbooksLimit !== null && (
                  <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full transition-all ${
                        roadbookPct >= 90
                          ? "bg-destructive"
                          : roadbookPct >= 75
                            ? "bg-amber-500"
                            : "bg-primary"
                      }`}
                      style={{ width: `${roadbookPct}%` }}
                    />
                  </div>
                )}
                <p className="mt-2 text-[11.5px] leading-relaxed text-muted-foreground">
                  Génération IA, saisie manuelle (avec assist IA) ou import
                  Excel.
                </p>
                {info.roadbooksLimit !== null && info.roadbooksRemaining === 0 && (
                  <p className="mt-2 text-[12.5px] text-amber-700">
                    Quota roadbooks épuisé.
                  </p>
                )}
              </div>

              {/* Quota 2 : Modifications IA (chat + recalcul) */}
              <div>
                <div className="flex items-baseline justify-between">
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-accent-warm">
                    Modifications IA (chat + recalcul)
                  </p>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-display text-[28px] font-semibold leading-none text-foreground">
                    {info.chatCreditsUsed}
                  </span>
                  <span className="text-[13px] text-muted-foreground">
                    /{" "}
                    {info.chatCreditsLimit === null
                      ? "∞"
                      : info.chatCreditsLimit}
                  </span>
                </div>
                {info.chatCreditsLimit !== null && (
                  <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full transition-all ${
                        chatPct >= 90
                          ? "bg-destructive"
                          : chatPct >= 75
                            ? "bg-amber-500"
                            : "bg-primary"
                      }`}
                      style={{ width: `${chatPct}%` }}
                    />
                  </div>
                )}
                <p className="mt-2 text-[11.5px] leading-relaxed text-muted-foreground">
                  Chat IA (1 demande = 1 modification) ou recalcul complet
                  (1 modification).
                </p>
                {info.chatCreditsLimit !== null &&
                  info.chatCreditsRemaining === 0 && (
                    <p className="mt-2 text-[12.5px] text-amber-700">
                      Modifications IA épuisées. Tu peux toujours créer de
                      nouveaux roadbooks et les éditer manuellement.
                    </p>
                  )}
              </div>
            </div>
          </section>

          {/* Avantages du plan */}
          <section className="mt-10 rounded-2xl border border-border/60 bg-surface p-8 shadow-soft">
            <h3 className="font-display text-[20px] font-semibold leading-tight text-foreground">
              Inclus dans votre plan
            </h3>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {plan.features.map((f, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 text-[14px] leading-relaxed text-foreground/85"
                >
                  <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
                  {f}
                </li>
              ))}
            </ul>
            {!isPaid && (
              <div className="mt-7 border-t border-border/60 pt-6">
                <p className="text-[14px] text-muted-foreground">
                  Besoin de plus de roadbooks ou de l'export PDF haute
                  qualité ?
                </p>
                <Button
                  onClick={() => setPaywallOpen(true)}
                  className="mt-3 gap-2 rounded-full"
                >
                  Voir tous les plans
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </section>

          <div className="mt-10 text-center">
            <Link
              to="/dashboard"
              className="text-[13px] text-muted-foreground transition hover:text-foreground"
            >
              ← Retour à mes roadbooks
            </Link>
          </div>
        </div>
      </div>

      <Paywall
        open={paywallOpen}
        onOpenChange={setPaywallOpen}
        currentPlanKey={info.planKey}
        title={isPaid ? "Changer de plan" : "Passer à un plan payant"}
        subtitle={
          isPaid
            ? "Choisis un plan plus haut ou plus bas selon ton volume."
            : "Accède à plus de roadbooks, à l'export PDF et au recalcul IA."
        }
      />
    </AppShell>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}
