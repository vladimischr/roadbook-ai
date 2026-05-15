import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Pause,
  Play,
  Coins,
  ChevronLeft,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ============================================================================
// /admin-affiliates — gestion du programme d'affiliation côté admin
// ============================================================================
// 3 sections :
//  1. Candidatures en attente (status='pending') → bouton Approve
//  2. Affiliés actifs (status='active') → stats + pause / update
//  3. Conversions non-payées → checklist + marquer comme payée

export const Route = createFileRoute("/admin-affiliates")({
  component: AdminAffiliatesPage,
  head: () => ({
    meta: [
      { title: "Admin Affiliés — Roadbook.ai" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

type Affiliate = {
  code: string;
  user_id: string | null;
  name: string;
  email: string;
  status: "pending" | "active" | "paused";
  commission_rate: number;
  commission_months: number;
  notes: string | null;
  pitch: string | null;
  social_url: string | null;
  created_at: string;
  approved_at: string | null;
};

type Conversion = {
  id: string;
  affiliate_code: string;
  referred_user_id: string;
  stripe_invoice_id: string;
  invoice_amount_cents: number;
  commission_amount_cents: number;
  commission_rate: number;
  payment_number: number;
  paid_to_affiliate: boolean;
  paid_at: string | null;
  paid_note: string | null;
  created_at: string;
};

type Stats = Record<
  string,
  { referred_count: number; total_due_cents: number; total_paid_cents: number }
>;

function AdminAffiliatesPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [stats, setStats] = useState<Stats>({});
  const [approveOpen, setApproveOpen] = useState<Affiliate | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    fetchData();
  }, [authLoading, user, navigate]);

  async function fetchData() {
    setLoading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Session expirée");
      const res = await fetch("/api/admin-affiliates", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erreur");
      setAffiliates(json.affiliates ?? []);
      setConversions(json.conversions ?? []);
      setStats(json.stats ?? {});
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function postAction(body: Record<string, unknown>) {
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) {
      toast.error("Session expirée");
      return;
    }
    const res = await fetch("/api/admin-affiliates", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? "Erreur");
      return false;
    }
    return true;
  }

  if (authLoading || loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  const pending = affiliates.filter((a) => a.status === "pending");
  const active = affiliates.filter((a) => a.status === "active");
  const paused = affiliates.filter((a) => a.status === "paused");
  const unpaidConv = conversions.filter((c) => !c.paid_to_affiliate);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <Link
            to="/admin"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            Retour admin
          </Link>
        </div>

        <h1 className="text-3xl font-bold">Programme d'affiliation</h1>
        <p className="mt-2 text-muted-foreground">
          Valide les candidatures, gère les codes, paye les commissions.
        </p>

        {/* Pending */}
        <Section title={`Candidatures en attente (${pending.length})`}>
          {pending.length === 0 ? (
            <Empty text="Aucune candidature en attente." />
          ) : (
            <div className="space-y-3">
              {pending.map((a) => (
                <div key={a.code} className="rounded-lg border bg-card p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="font-semibold">{a.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {a.email}{" "}
                        {a.social_url ? (
                          <>
                            ·{" "}
                            <a
                              href={a.social_url}
                              target="_blank"
                              rel="noreferrer"
                              className="underline"
                            >
                              {new URL(a.social_url).hostname}
                            </a>
                          </>
                        ) : null}
                      </div>
                      {a.pitch ? (
                        <p className="mt-2 text-sm whitespace-pre-wrap">
                          {a.pitch}
                        </p>
                      ) : null}
                      <div className="mt-2 text-xs text-muted-foreground">
                        Reçu le{" "}
                        {new Date(a.created_at).toLocaleDateString("fr-FR")}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        onClick={() => setApproveOpen(a)}
                      >
                        <CheckCircle2 className="mr-1 h-4 w-4" />
                        Approuver
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          if (
                            !confirm(
                              `Refuser la candidature de ${a.name} ? La ligne passera en "paused".`,
                            )
                          )
                            return;
                          const ok = await postAction({
                            action: "reject",
                            affiliate_id: a.code,
                          });
                          if (ok) {
                            toast.success("Candidature rejetée");
                            fetchData();
                          }
                        }}
                      >
                        <XCircle className="mr-1 h-4 w-4" />
                        Rejeter
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Active */}
        <Section title={`Affiliés actifs (${active.length})`}>
          {active.length === 0 ? (
            <Empty text="Aucun affilié actif pour l'instant." />
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Nom</th>
                    <th className="px-4 py-3">Taux</th>
                    <th className="px-4 py-3 text-right">Filleuls</th>
                    <th className="px-4 py-3 text-right">Cumul dû</th>
                    <th className="px-4 py-3 text-right">Payé</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {active.map((a) => {
                    const s = stats[a.code] ?? {
                      referred_count: 0,
                      total_due_cents: 0,
                      total_paid_cents: 0,
                    };
                    return (
                      <tr key={a.code}>
                        <td className="px-4 py-3 font-mono text-xs">
                          {a.code}
                        </td>
                        <td className="px-4 py-3">
                          <div>{a.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {a.email}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {a.commission_rate}%
                          <span className="text-xs text-muted-foreground">
                            {" "}
                            ×{" "}
                            {a.commission_months === 0
                              ? "∞"
                              : `${a.commission_months}m`}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {s.referred_count}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {formatEuro(s.total_due_cents)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatEuro(s.total_paid_cents)}
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={async () => {
                              if (!confirm(`Mettre en pause ${a.code} ?`))
                                return;
                              const ok = await postAction({
                                action: "pause",
                                affiliate_id: a.code,
                              });
                              if (ok) {
                                toast.success("Mis en pause");
                                fetchData();
                              }
                            }}
                          >
                            <Pause className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {/* Paused */}
        {paused.length > 0 && (
          <Section title={`En pause (${paused.length})`}>
            <div className="space-y-2">
              {paused.map((a) => (
                <div
                  key={a.code}
                  className="flex items-center justify-between rounded-lg border bg-card p-3 text-sm"
                >
                  <div>
                    <span className="font-mono text-xs">{a.code}</span> ·{" "}
                    {a.name} · {a.email}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      const ok = await postAction({
                        action: "reactivate",
                        affiliate_id: a.code,
                      });
                      if (ok) {
                        toast.success("Réactivé");
                        fetchData();
                      }
                    }}
                  >
                    <Play className="mr-1 h-4 w-4" />
                    Réactiver
                  </Button>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Conversions à payer */}
        <Section
          title={`Commissions à payer (${unpaidConv.length})`}
          icon={<Coins className="h-5 w-5" />}
        >
          {unpaidConv.length === 0 ? (
            <Empty text="Aucune commission en attente de paiement." />
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Filleul</th>
                    <th className="px-4 py-3 text-right">Abo</th>
                    <th className="px-4 py-3 text-right">Commission</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {unpaidConv.map((c) => (
                    <tr key={c.id}>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {c.affiliate_code}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {c.referred_user_id.slice(0, 8)}…
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatEuro(c.invoice_amount_cents)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {formatEuro(c.commission_amount_cents)}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          onClick={async () => {
                            const note = prompt(
                              "Note de paiement (optionnel) : ex. n° virement, date",
                            );
                            const ok = await postAction({
                              action: "mark_paid",
                              conversion_id: c.id,
                              paid_note: note || undefined,
                            });
                            if (ok) {
                              toast.success("Marqué comme payé");
                              fetchData();
                            }
                          }}
                        >
                          Marquer payé
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>

      {/* Dialog approve */}
      {approveOpen && (
        <ApproveDialog
          aff={approveOpen}
          onClose={() => setApproveOpen(null)}
          onApproved={async (newCode, rate, months) => {
            const ok = await postAction({
              action: "approve",
              affiliate_id: approveOpen.code,
              new_code: newCode,
              commission_rate: rate,
              commission_months: months,
            });
            if (ok) {
              toast.success(`Approuvé : ${newCode}`);
              setApproveOpen(null);
              fetchData();
            }
          }}
        />
      )}
    </AppShell>
  );
}

function ApproveDialog({
  aff,
  onClose,
  onApproved,
}: {
  aff: Affiliate;
  onClose: () => void;
  onApproved: (newCode: string, rate: number, months: number) => void;
}) {
  // Suggère un slug : 8 premiers caractères du nom en majuscules
  const suggested = aff.name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
  const [code, setCode] = useState(suggested);
  const [rate, setRate] = useState("30");
  const [months, setMonths] = useState("12");

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approuver {aff.name}</DialogTitle>
          <DialogDescription>
            Définis le code public, le taux et la durée. Tout est modifiable
            plus tard.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium" htmlFor="code">
              Code public
            </label>
            <Input
              id="code"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))
              }
              className="mt-1 font-mono"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Visible publiquement dans le lien (?ref={code}). 3-32 caractères,
              majuscules + chiffres.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium" htmlFor="rate">
                Taux (%)
              </label>
              <Input
                id="rate"
                type="number"
                min={0}
                max={100}
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="months">
                Durée (mois, 0 = à vie)
              </label>
              <Input
                id="months"
                type="number"
                min={0}
                max={120}
                value={months}
                onChange={(e) => setMonths(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button
            disabled={code.length < 3}
            onClick={() =>
              onApproved(code, Number(rate) || 30, Number(months) || 12)
            }
          >
            Approuver
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="flex items-center gap-2 text-xl font-semibold">
        {icon}
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function formatEuro(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  });
}
