import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import {
  ALL_PLAN_ORDER,
  PLANS,
  formatPlanPrice,
  type PlanKey,
} from "@/lib/plans";
import { redirectToCheckout } from "@/lib/useSubscription";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pricing")({
  component: Pricing,
  head: () => ({
    meta: [
      { title: "Tarifs — Roadbook.ai" },
      {
        name: "description",
        content:
          "Choisissez le plan adapté à votre volume — du Découverte gratuit à l'Atelier illimité.",
      },
    ],
  }),
});

function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);

  const handlePick = async (key: PlanKey) => {
    if (key === "free") {
      // Free → on envoie sur login (le profil est créé automatiquement à
      // l'inscription via le trigger DB).
      navigate({ to: user ? "/dashboard" : "/login" });
      return;
    }
    if (!user) {
      toast.info("Connecte-toi pour souscrire — c'est en deux clics.");
      navigate({ to: "/login" });
      return;
    }
    setLoadingPlan(key);
    try {
      await redirectToCheckout(key as Exclude<PlanKey, "free">);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/85 backdrop-blur-xl">
        <div className="container-editorial flex items-center justify-between px-6 py-4 sm:px-10">
          <Logo />
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link to={user ? "/dashboard" : "/login"}>
              <Button
                variant="ghost"
                size="sm"
                className="text-[13px]"
              >
                {user ? "Mon atelier" : "Se connecter"}
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-gradient-to-b from-surface-warm/60 via-background to-background"
          />
          <div className="container-editorial px-6 pb-12 pt-20 sm:px-10 sm:pt-28">
            <div className="mx-auto max-w-3xl text-center">
              <div className="inline-flex items-center gap-3 rounded-full border border-border/60 bg-surface px-3.5 py-1.5 shadow-soft">
                <span className="rule-warm" aria-hidden />
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                  Tarifs
                </span>
              </div>
              <h1 className="font-display mt-8 text-[44px] font-semibold leading-[1.04] tracking-tight text-foreground sm:text-[60px]">
                Choisissez le plan adapté à votre volume.
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-[16px] leading-[1.65] text-muted-foreground sm:text-[17.5px]">
                Tous les plans payants démarrent par 14 jours d'essai gratuit.
                Annulation en un clic depuis le portail Stripe.
              </p>
            </div>
          </div>
        </section>

        <section className="container-editorial px-6 pb-24 sm:px-10 sm:pb-32">
          <div className="grid gap-5 lg:grid-cols-4">
            {ALL_PLAN_ORDER.map((key) => {
              const plan = PLANS[key];
              const isHighlighted = plan.highlighted;
              const isLoading = loadingPlan === key;
              return (
                <article
                  key={key}
                  className={cn(
                    "relative flex flex-col rounded-2xl border bg-surface p-7 transition-smooth",
                    isHighlighted
                      ? "border-primary/60 shadow-soft-lg lg:-translate-y-2"
                      : "border-border/60 shadow-soft hover:-translate-y-0.5 hover:shadow-soft-md",
                  )}
                >
                  {isHighlighted && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.22em] text-primary-foreground">
                      Plus populaire
                    </span>
                  )}

                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-accent-warm">
                    {plan.tagline}
                  </p>
                  <h2 className="font-display mt-3 text-[28px] font-semibold leading-none text-foreground">
                    {plan.name}
                  </h2>

                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="font-display text-[44px] font-semibold leading-none text-foreground">
                      {formatPlanPrice(plan.priceMonthly)}
                    </span>
                    {plan.priceMonthly > 0 && (
                      <span className="text-[13px] text-muted-foreground">
                        /mois
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-[12.5px] text-muted-foreground">
                    {plan.monthlyRoadbookLimit === null
                      ? "Roadbooks illimités"
                      : `${plan.monthlyRoadbookLimit} roadbooks par mois`}
                  </p>

                  <ul className="mt-7 space-y-2.5 text-[13.5px] leading-relaxed text-foreground/85">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="flex-1" />

                  <Button
                    onClick={() => handlePick(key)}
                    disabled={loadingPlan !== null && !isLoading}
                    className={cn(
                      "mt-8 h-11 w-full gap-2 rounded-full transition-smooth",
                      isHighlighted
                        ? ""
                        : key === "free"
                          ? "bg-foreground text-background hover:bg-foreground/90"
                          : "bg-foreground text-background hover:bg-foreground/90",
                    )}
                    variant={isHighlighted ? "default" : "default"}
                  >
                    {isLoading ? (
                      <>
                        <Sparkles className="h-4 w-4 animate-pulse" />
                        Redirection…
                      </>
                    ) : key === "free" ? (
                      <>
                        Démarrer gratuitement
                        <ArrowRight className="h-4 w-4" />
                      </>
                    ) : (
                      <>
                        Essayer {plan.name}
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </article>
              );
            })}
          </div>

          {/* FAQ rapide pour rassurer */}
          <div className="mt-24 grid gap-x-12 gap-y-10 md:grid-cols-2">
            {[
              {
                q: "Puis-je changer de plan à tout moment ?",
                a: "Oui. Le portail Stripe permet de monter ou descendre de plan en un clic. Le prorata est calculé automatiquement.",
              },
              {
                q: "Que se passe-t-il après l'essai gratuit ?",
                a: "Au bout de 14 jours, le premier prélèvement a lieu sauf si vous annulez avant. Aucun engagement.",
              },
              {
                q: "Que comptent mes « roadbooks générés » ?",
                a: "Chaque génération IA compte pour un. L'édition manuelle, les recalculs et l'export PDF n'entament pas votre quota.",
              },
              {
                q: "Mes clients voient-ils Roadbook.ai ?",
                a: "Le PDF exporté est neutre — uniquement le nom de votre agence. Le mode marque blanche est inclus dès le plan Atelier.",
              },
            ].map((it, i) => (
              <div key={i}>
                <h3 className="font-display text-[18px] font-semibold leading-tight text-foreground">
                  {it.q}
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                  {it.a}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border/40 bg-background">
        <div className="container-editorial px-6 py-10 sm:px-10">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <Logo />
            <p className="text-[12.5px] text-muted-foreground">
              © {new Date().getFullYear()} Roadbook.ai · Pensé pour les
              travel designers indépendants.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
