import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy, Coins, Users, CheckCircle2, Clock } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

// ============================================================================
// /affiliate — dashboard de l'affilié
// ============================================================================
// Montre :
//  - le code personnel + bouton copier le lien
//  - statut (active / pending / paused)
//  - commission rate
//  - totaux : nb filleuls + commission due + commission payée
//  - liste des conversions (paiements détectés)
//
// Si l'user n'a pas de code, on redirige vers /affiliation (formulaire).

type Affiliate = {
  code: string;
  status: "pending" | "active" | "paused";
  name: string;
  email: string;
  commission_rate: number;
  commission_months: number;
  created_at: string;
  approved_at: string | null;
};

type Conversion = {
  id: string;
  stripe_invoice_id: string;
  invoice_amount_cents: number;
  commission_amount_cents: number;
  commission_rate: number;
  payment_number: number;
  paid_to_affiliate: boolean;
  paid_at: string | null;
  created_at: string;
  referred_user_id: string;
};

type Totals = {
  referred_count: number;
  total_due_cents: number;
  total_paid_cents: number;
  unpaid_cents: number;
};

export const Route = createFileRoute("/affiliate")({
  component: AffiliateDashboard,
  head: () => ({
    meta: [{ title: "Mon programme d'affiliation — Roadbook.ai" }],
  }),
});

function AffiliateDashboard() {
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    affiliate: Affiliate | null;
    conversions: Conversion[];
    totals?: Totals;
  } | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      navigate({ to: "/login" });
      return;
    }
    fetchData(session.access_token);
  }, [authLoading, session, navigate]);

  async function fetchData(token: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/affiliate-dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erreur");
      setData(json);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (loading || authLoading) {
    return (
      <PageShell>
        <div className="py-16 text-center text-muted-foreground">
          Chargement…
        </div>
      </PageShell>
    );
  }

  if (!data?.affiliate) {
    return (
      <PageShell>
        <div className="mx-auto max-w-2xl py-16 text-center">
          <h1 className="text-3xl font-bold">Pas encore affilié</h1>
          <p className="mt-4 text-muted-foreground">
            Candidate au programme pour toucher 30% des abonnements de tes
            filleuls pendant 12 mois.
          </p>
          <Button asChild size="lg" className="mt-6">
            <Link to="/affiliation">Candidater</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  const aff = data.affiliate;
  const totals = data.totals!;
  const baseUrl =
    typeof window !== "undefined" ? window.location.origin : "https://getroadbook.com";
  const refLink = `${baseUrl}?ref=${aff.code}`;

  return (
    <PageShell>
      <div className="mx-auto max-w-5xl px-4 py-12">
        <h1 className="text-3xl font-bold">Mon programme d'affiliation</h1>
        <p className="mt-2 text-muted-foreground">
          Ton code, tes stats, et l'historique des commissions.
        </p>

        {/* Statut + code */}
        <div className="mt-8 rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Ton code
              </div>
              <div className="mt-1 font-mono text-3xl font-bold tracking-tight">
                {aff.code}
              </div>
              <div className="mt-2">
                <StatusBadge status={aff.status} />
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Commission
              </div>
              <div className="mt-1 text-2xl font-bold text-primary">
                {aff.commission_rate}%
              </div>
              <div className="text-xs text-muted-foreground">
                pendant{" "}
                {aff.commission_months === 0
                  ? "à vie"
                  : `${aff.commission_months} mois`}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Ton lien à partager
            </div>
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                readOnly
                value={refLink}
                className="flex-1 rounded-md border bg-muted/30 px-3 py-2 text-sm font-mono"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(refLink);
                  toast.success("Lien copié");
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copier
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Partage ce lien sur LinkedIn, dans tes mails, sur ton site. À
              chaque inscription via ce lien, le code reste actif 30 jours dans
              le navigateur du visiteur.
            </p>
          </div>
        </div>

        {/* Totaux */}
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <StatCard
            icon={<Users className="h-5 w-5" />}
            label="Filleuls actifs"
            value={String(totals.referred_count)}
          />
          <StatCard
            icon={<Coins className="h-5 w-5" />}
            label="Commission due (cumulée)"
            value={formatEuro(totals.total_due_cents)}
          />
          <StatCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            label="Déjà payée"
            value={formatEuro(totals.total_paid_cents)}
            secondary={
              totals.unpaid_cents > 0
                ? `${formatEuro(totals.unpaid_cents)} en attente`
                : undefined
            }
          />
        </div>

        {/* Conversions */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold">Historique des commissions</h2>
          {data.conversions.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Pas encore de conversion. Quand un de tes filleuls souscrit à un
              plan payant, sa commission apparaîtra ici à chaque paiement
              mensuel.
            </p>
          ) : (
            <div className="mt-4 overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Filleul</th>
                    <th className="px-4 py-3">Paiement n°</th>
                    <th className="px-4 py-3 text-right">Abo</th>
                    <th className="px-4 py-3 text-right">Commission</th>
                    <th className="px-4 py-3">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.conversions.map((c) => (
                    <tr key={c.id}>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {c.referred_user_id.slice(0, 8)}…
                      </td>
                      <td className="px-4 py-3">
                        {c.payment_number}
                        {aff.commission_months > 0
                          ? ` / ${aff.commission_months}`
                          : ""}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatEuro(c.invoice_amount_cents)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-primary">
                        {formatEuro(c.commission_amount_cents)}
                      </td>
                      <td className="px-4 py-3">
                        {c.paid_to_affiliate ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Payée
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
                            <Clock className="h-3.5 w-3.5" /> En attente
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* FAQ */}
        <div className="mt-12 rounded-2xl border bg-muted/30 p-6">
          <h2 className="text-lg font-semibold">Quelques infos pratiques</h2>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li>
              <b className="text-foreground">Quand suis-je payé ?</b> Les
              commissions sont payées par virement le 5 du mois suivant. Le
              filleul doit avoir payé son abonnement (pas en essai gratuit).
            </li>
            <li>
              <b className="text-foreground">Quel suivi des filleuls ?</b> Le
              code reste valable 30 jours dans le navigateur. Si le filleul
              s'inscrit dans cette fenêtre, l'attribution se fait au signup.
              Une fois attribué, c'est définitif sur ce filleul.
            </li>
            <li>
              <b className="text-foreground">Combien de temps dure la
              commission ?</b>{" "}
              {aff.commission_months === 0
                ? "À vie. Tant que le filleul reste abonné, tu touches ta commission."
                : `${aff.commission_months} mois à compter du premier paiement du filleul.`}
            </li>
            <li>
              <b className="text-foreground">Une question ?</b> Écris à{" "}
              <a
                className="text-primary underline"
                href="mailto:hello@getroadbook.com"
              >
                hello@getroadbook.com
              </a>
              .
            </li>
          </ul>
        </div>
      </div>
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/">
            <Logo />
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link
              to="/dashboard"
              className="text-muted-foreground hover:text-foreground"
            >
              Mes roadbooks
            </Link>
            <Link
              to="/affiliation"
              className="text-muted-foreground hover:text-foreground"
            >
              Programme
            </Link>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  secondary,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  secondary?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <div className="mt-3 text-2xl font-bold">{value}</div>
      {secondary ? (
        <div className="mt-1 text-xs text-muted-foreground">{secondary}</div>
      ) : null}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles =
    status === "active"
      ? "bg-green-100 text-green-700"
      : status === "pending"
        ? "bg-amber-100 text-amber-700"
        : "bg-muted text-muted-foreground";
  const label =
    status === "active"
      ? "Code actif"
      : status === "pending"
        ? "Candidature en cours"
        : "En pause";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles}`}
    >
      {label}
    </span>
  );
}

function formatEuro(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  });
}
