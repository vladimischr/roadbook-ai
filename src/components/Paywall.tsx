import { Sparkles, Check, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import {
  PAID_PLAN_ORDER,
  PLANS,
  formatPlanPrice,
  getDisplayedMonthlyPrice,
  type Billing,
  type PlanKey,
} from "@/lib/plans";
import { redirectToCheckout } from "@/lib/useSubscription";
import { cn } from "@/lib/utils";

interface PaywallProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Le plan actuel — utilisé pour griser le tier déjà actif. */
  currentPlanKey: PlanKey;
  /** Titre adapté au déclencheur (quota, feature, etc.). */
  title?: string;
  /** Sous-titre éditorial — pourquoi l'utilisateur voit cette modale. */
  subtitle?: string;
}

/**
 * Modale qui s'ouvre quand un utilisateur tente une action bloquée par son
 * plan : quota épuisé, export PDF en free, recalcul en free, etc. Affiche
 * les 3 plans payants et un bouton "Passer Pro" qui redirige vers Stripe
 * Checkout.
 */
export function Paywall({
  open,
  onOpenChange,
  currentPlanKey,
  title = "Passe à la vitesse supérieure",
  subtitle = "Tu as atteint la limite de ton plan actuel. Choisis un plan adapté à ton volume.",
}: PaywallProps) {
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);
  const [billing, setBilling] = useState<Billing>("annual");

  const handlePick = async (planKey: PlanKey) => {
    if (planKey === "free" || planKey === currentPlanKey) return;
    setLoadingPlan(planKey);
    try {
      await redirectToCheckout(planKey as Exclude<PlanKey, "free">, billing);
      // Le navigateur quitte l'app, pas besoin de reset l'état.
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
      setLoadingPlan(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="left-3 right-3 top-3 bottom-3 max-h-none w-auto max-w-none translate-x-0 translate-y-0 overflow-hidden rounded-2xl p-0 sm:left-[50%] sm:right-auto sm:top-[50%] sm:bottom-auto sm:max-h-[90vh] sm:w-full sm:max-w-3xl sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-lg">
        <div className="flex h-full min-h-0 flex-col p-5 pt-6 sm:max-h-[90vh] sm:p-6">
        <DialogHeader className="flex-shrink-0 pr-8">
          <div className="flex items-center gap-3">
            <span className="rule-warm" aria-hidden />
            <span className="eyebrow">Passer Pro</span>
          </div>
          <DialogTitle className="font-display mt-3 text-[26px] font-semibold leading-tight tracking-tight text-foreground sm:text-[30px]">
            {title}
          </DialogTitle>
          <DialogDescription className="pt-2 text-[14px] leading-relaxed">
            {subtitle}
          </DialogDescription>
        </DialogHeader>

        {/* Toggle Mensuel / Annuel — défaut Annuel pour pousser au -20% */}
        <div className="mt-3 flex flex-shrink-0 justify-center">
          <div className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-surface p-1">
            <button
              type="button"
              onClick={() => setBilling("monthly")}
              className={cn(
                "rounded-full px-4 py-1.5 text-[12.5px] font-medium transition",
                billing === "monthly"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Mensuel
            </button>
            <button
              type="button"
              onClick={() => setBilling("annual")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[12.5px] font-medium transition",
                billing === "annual"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Annuel
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.12em]",
                  billing === "annual"
                    ? "bg-primary text-primary-foreground"
                    : "bg-primary-soft text-primary",
                )}
              >
                −20%
              </span>
            </button>
          </div>
        </div>

        <div className="-mx-2 mt-4 flex-1 overflow-y-auto overscroll-contain px-2 pb-2 [-webkit-overflow-scrolling:touch]">
          <div className="grid gap-4 sm:grid-cols-3">
            {PAID_PLAN_ORDER.map((key) => {
              const plan = PLANS[key];
              const isActive = key === currentPlanKey;
              const isHighlighted = plan.highlighted;
              const isLoading = loadingPlan === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handlePick(key)}
                  disabled={isActive || loadingPlan !== null}
                  className={cn(
                    "group relative flex flex-col rounded-2xl border p-5 text-left transition-smooth",
                    isActive
                      ? "border-primary/40 bg-primary-soft/40 cursor-default opacity-70"
                      : isHighlighted
                        ? "border-primary/60 bg-surface shadow-soft-md hover:-translate-y-0.5 hover:shadow-soft-lg"
                        : "border-border/70 bg-surface hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft-md",
                    loadingPlan !== null && !isLoading && "opacity-50",
                  )}
                >
                {isHighlighted && !isActive && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-foreground">
                    Populaire
                  </span>
                )}
                {isActive && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-accent-warm px-3 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
                    Plan actuel
                  </span>
                )}
                <h3 className="font-display text-[20px] font-semibold leading-none text-foreground">
                  {plan.name}
                </h3>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {plan.tagline}
                </p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="font-display text-[34px] font-semibold leading-none text-foreground">
                    {formatPlanPrice(getDisplayedMonthlyPrice(plan, billing))}
                  </span>
                  <span className="text-[12px] text-muted-foreground">/mois</span>
                </div>
                {billing === "annual" && (
                  <p className="mt-1 text-[11px] text-accent-warm">
                    Soit {formatPlanPrice(plan.priceAnnual)} /an
                  </p>
                )}
                <ul className="mt-5 space-y-2 text-[12.5px] leading-relaxed text-muted-foreground">
                  {plan.features.slice(0, 4).map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-3 w-3 flex-shrink-0 text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-5 flex-1" />
                <div
                  className={cn(
                    "mt-4 inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-[12.5px] font-medium transition",
                    isActive
                      ? "bg-muted text-muted-foreground"
                      : isHighlighted
                        ? "bg-primary text-primary-foreground"
                        : "bg-foreground text-background",
                  )}
                >
                  {isLoading ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                      Redirection…
                    </span>
                  ) : isActive ? (
                    "Plan en cours"
                  ) : (
                    <>
                      Passer {plan.name}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center justify-between gap-3 border-t border-border/50 pt-3 text-[12px] text-text-soft">
          <span>14 jours d'essai gratuit · Annulation en un clic</span>
          <Button
            variant="ghost"
            size="sm"
            className="text-[12.5px]"
            onClick={() => onOpenChange(false)}
          >
            Plus tard
          </Button>
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
