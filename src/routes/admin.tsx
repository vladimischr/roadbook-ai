import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Users,
  TrendingUp,
  Search,
  Calendar,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { PLANS, type PlanKey } from "@/lib/plans";
import { cn } from "@/lib/utils";

// ============================================================================
// /admin — dashboard interne pour le owner du SaaS
// ============================================================================
// Liste tous les inscrits, leur plan, leur usage, MRR estimé.
// Accès gardé serveur-side (ADMIN_EMAILS env var).

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({
    meta: [
      { title: "Admin — Roadbook.ai" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

interface AdminUser {
  id: string;
  email: string | null;
  display_name: string | null;
  agency_name: string | null;
  plan_key: PlanKey;
  plan_status: string;
  current_period_end: string | null;
  trial_ends_at: string | null;
  created_at: string;
  roadbooks_total: number;
  ai_30d: {
    generate: number;
    chat: number;
    recompute: number;
    import: number;
  };
}

function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [planFilter, setPlanFilter] = useState<PlanKey | "all">("all");

  useEffect(() => {
    if (authLoading || !user) return;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setError("Session expirée");
        setLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/admin-users", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const text = await res.text();
        let parsed: any = null;
        try {
          parsed = JSON.parse(text);
        } catch {}
        if (!res.ok) {
          setError(parsed?.error || `Erreur ${res.status}`);
          setLoading(false);
          return;
        }
        setUsers(parsed?.users || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
      setLoading(false);
    })();
  }, [user, authLoading]);

  // Filtres + tri
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = users;
    if (planFilter !== "all") {
      list = list.filter((u) => u.plan_key === planFilter);
    }
    if (q) {
      list = list.filter(
        (u) =>
          u.email?.toLowerCase().includes(q) ||
          u.display_name?.toLowerCase().includes(q) ||
          u.agency_name?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [users, query, planFilter]);

  // Stats globales
  const stats = useMemo(() => {
    const byPlan: Record<PlanKey, number> = {
      free: 0,
      solo: 0,
      studio: 0,
      atelier: 0,
    };
    let mrrCents = 0;
    let payingActive = 0;
    let trialing = 0;
    let pastDue = 0;

    for (const u of users) {
      byPlan[u.plan_key] = (byPlan[u.plan_key] ?? 0) + 1;
      const plan = PLANS[u.plan_key];
      if (u.plan_key !== "free") {
        if (u.plan_status === "active") {
          payingActive += 1;
          mrrCents += plan.priceMonthly;
        } else if (u.plan_status === "trialing") {
          trialing += 1;
        } else if (
          u.plan_status === "past_due" ||
          u.plan_status === "unpaid"
        ) {
          pastDue += 1;
        }
      }
    }

    return {
      total: users.length,
      byPlan,
      mrrEur: Math.round(mrrCents / 100),
      payingActive,
      trialing,
      pastDue,
    };
  }, [users]);

  if (authLoading || loading) {
    return (
      <AppShell>
        <div className="grid min-h-[60vh] place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <div className="container-editorial px-6 py-16 sm:px-10">
          <div className="mx-auto max-w-md text-center">
            <h1 className="font-display text-[28px] font-semibold text-foreground">
              Accès refusé
            </h1>
            <p className="mt-3 text-[14.5px] text-muted-foreground">
              {error}
            </p>
            <p className="mt-6 text-[12.5px] text-text-soft">
              Si tu es admin, vérifie que ton email est dans la variable
              d'env <code className="rounded bg-muted px-1">ADMIN_EMAILS</code>{" "}
              côté Lovable.
            </p>
            <Link to="/dashboard">
              <Button variant="outline" className="mt-6 rounded-full">
                Retour au dashboard
              </Button>
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="container-editorial px-6 py-12 sm:px-10 lg:px-14 sm:py-16">
        <div>
          <div className="flex items-center gap-3">
            <span className="rule-warm" aria-hidden />
            <span className="eyebrow">Admin</span>
          </div>
          <h1 className="font-display mt-5 text-[42px] font-semibold leading-[1.05] tracking-tight text-foreground sm:text-[48px]">
            Tableau de bord interne
          </h1>
          <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground">
            Vue d'ensemble des inscrits, leurs plans et leur usage.
          </p>
        </div>

        {/* Stats globales */}
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Inscrits"
            value={stats.total.toString()}
            icon={Users}
            subtitle={`${stats.byPlan.free} en free`}
          />
          <StatCard
            label="Payants actifs"
            value={stats.payingActive.toString()}
            icon={Sparkles}
            subtitle={`${stats.trialing} en trial`}
            highlight
          />
          <StatCard
            label="MRR estimé"
            value={`${stats.mrrEur} €`}
            icon={TrendingUp}
            subtitle={`Annual run-rate ${(stats.mrrEur * 12).toLocaleString("fr-FR")} €`}
          />
          <StatCard
            label="Paiements en échec"
            value={stats.pastDue.toString()}
            icon={Calendar}
            subtitle={
              stats.pastDue > 0 ? "À relancer" : "Tout est OK"
            }
            warn={stats.pastDue > 0}
          />
        </div>

        {/* Répartition par plan */}
        <div className="mt-8 grid gap-4 sm:grid-cols-4">
          {(Object.keys(stats.byPlan) as PlanKey[]).map((k) => (
            <div
              key={k}
              className="rounded-2xl border border-border/60 bg-surface px-5 py-4"
            >
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-accent-warm">
                {PLANS[k].name}
              </p>
              <p className="font-display mt-2 text-[28px] font-semibold leading-none text-foreground">
                {stats.byPlan[k]}
              </p>
              <p className="mt-1 text-[11.5px] text-muted-foreground">
                {PLANS[k].priceMonthly === 0
                  ? "gratuit"
                  : `${PLANS[k].priceMonthly / 100}€/mois`}
              </p>
            </div>
          ))}
        </div>

        {/* Filtres */}
        <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher par email, nom, agence…"
              className="h-11 rounded-full border-border/70 bg-surface pl-11 text-[14px]"
            />
          </div>

          <div className="flex items-center gap-1 rounded-full border border-border/60 bg-surface p-1 shadow-soft">
            {(["all", "free", "solo", "studio", "atelier"] as const).map(
              (k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setPlanFilter(k)}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-smooth",
                    planFilter === k
                      ? "bg-primary text-primary-foreground shadow-soft"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {k === "all" ? "Tous" : PLANS[k].name}
                </button>
              ),
            )}
          </div>
        </div>

        {/* Table users */}
        <div className="mt-6 overflow-hidden rounded-2xl border border-border/60 bg-surface shadow-soft">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="border-b border-border/60 bg-surface-warm/60 text-left text-[10.5px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Utilisateur</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3 text-right">Roadbooks</th>
                  <th className="px-4 py-3 text-right">IA (30j)</th>
                  <th className="px-4 py-3">Inscrit</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-12 text-center text-muted-foreground"
                    >
                      Aucun utilisateur.
                    </td>
                  </tr>
                ) : (
                  filtered.map((u) => (
                    <tr
                      key={u.id}
                      className="border-t border-border/40 hover:bg-surface-warm/40"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">
                          {u.display_name || u.email || "?"}
                        </p>
                        <p className="text-[11.5px] text-muted-foreground">
                          {u.email}
                          {u.agency_name && ` · ${u.agency_name}`}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                            u.plan_key === "free"
                              ? "bg-muted text-muted-foreground"
                              : u.plan_key === "solo"
                                ? "bg-primary-soft text-primary"
                                : u.plan_key === "studio"
                                  ? "bg-accent-warm-soft text-foreground"
                                  : "bg-foreground/85 text-background",
                          )}
                        >
                          {PLANS[u.plan_key].name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <PlanStatusBadge status={u.plan_status} />
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">
                        {u.roadbooks_total}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <span className="text-foreground">
                          {u.ai_30d.generate +
                            u.ai_30d.chat +
                            u.ai_30d.recompute +
                            u.ai_30d.import}
                        </span>
                        <span className="ml-1 text-[10.5px] text-muted-foreground">
                          ({u.ai_30d.generate}g·{u.ai_30d.chat}c·
                          {u.ai_30d.recompute}r)
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(u.created_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mt-6 text-[11.5px] text-text-soft">
          IA (30j) : <strong>g</strong>énération · <strong>c</strong>hat ·{" "}
          <strong>r</strong>ecalcul · l'import est compté avec génération.
        </p>
      </div>
    </AppShell>
  );
}

/* ---------- Sub-components ---------- */

function StatCard({
  label,
  value,
  icon: Icon,
  subtitle,
  highlight,
  warn,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  subtitle: string;
  highlight?: boolean;
  warn?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-surface p-5 shadow-soft",
        highlight
          ? "border-primary/40"
          : warn
            ? "border-destructive/40"
            : "border-border/60",
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </p>
        <Icon
          className={cn(
            "h-4 w-4",
            highlight
              ? "text-primary"
              : warn
                ? "text-destructive"
                : "text-muted-foreground/50",
          )}
        />
      </div>
      <p className="font-display mt-3 text-[34px] font-semibold leading-none text-foreground">
        {value}
      </p>
      <p className="mt-2 text-[11.5px] text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function PlanStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    active: {
      label: "Actif",
      cls: "bg-primary-soft text-primary",
    },
    trialing: {
      label: "Trial",
      cls: "bg-accent-warm-soft text-foreground",
    },
    past_due: {
      label: "Échec CB",
      cls: "bg-destructive/10 text-destructive",
    },
    unpaid: {
      label: "Impayé",
      cls: "bg-destructive/10 text-destructive",
    },
    canceled: {
      label: "Annulé",
      cls: "bg-muted text-muted-foreground",
    },
    incomplete: {
      label: "Incomplet",
      cls: "bg-muted text-muted-foreground",
    },
  };
  const entry = map[status] || {
    label: status,
    cls: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
        entry.cls,
      )}
    >
      {entry.label}
    </span>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
    });
  } catch {
    return iso;
  }
}
