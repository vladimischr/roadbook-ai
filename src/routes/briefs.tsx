import {
  createFileRoute,
  Link,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2,
  Plus,
  Send,
  Copy,
  Check,
  Sparkles,
  Mail,
  User as UserIcon,
  MapPin,
  ArrowRight,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BRIEF_QUESTIONS } from "@/lib/briefQuestions";

// ============================================================================
// /briefs — page designer pour gérer les briefs envoyés aux clients
// ============================================================================

interface BriefsSearch {
  client_id?: string;
}

export const Route = createFileRoute("/briefs")({
  component: BriefsPage,
  head: () => ({ meta: [{ title: "Briefs clients — Roadbook.ai" }] }),
  validateSearch: (search: Record<string, unknown>): BriefsSearch => ({
    client_id:
      typeof search.client_id === "string" ? search.client_id : undefined,
  }),
});

interface Brief {
  id: string;
  token: string;
  client_name: string | null;
  client_email: string | null;
  destination_hint: string | null;
  status: "pending" | "completed" | "used";
  answers: Record<string, any>;
  roadbook_id: string | null;
  created_at: string;
  completed_at: string | null;
}

function BriefsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const search = useSearch({ from: "/briefs" }) as BriefsSearch;
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState<Brief | null>(null);
  const [detailOpen, setDetailOpen] = useState<Brief | null>(null);
  const [prefillClient, setPrefillClient] = useState<{
    id: string;
    display_name: string;
    email: string | null;
  } | null>(null);

  // Track quel client_id on a déjà traité — sinon, fermer le dialog réinit
  // prefillClient à null, le useEffect re-trigger et le dialog ré-ouvre en
  // boucle (puisque ?client_id=... est toujours dans l'URL).
  const processedClientId = useRef<string | null>(null);

  // Si on arrive avec ?client_id=xxx (depuis la fiche client), on ouvre direct
  // le dialog de création pré-rempli avec ses infos. One-shot : on clear l'URL
  // après pour qu'un refresh ne re-déclenche pas.
  useEffect(() => {
    if (!search.client_id || !user) return;
    if (processedClientId.current === search.client_id) return;
    processedClientId.current = search.client_id;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) return;
      const res = await fetch(
        `/api/client-get?id=${encodeURIComponent(search.client_id!)}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.client) return;
      setPrefillClient({
        id: data.client.id,
        display_name: data.client.display_name,
        email: data.client.email,
      });
      setCreateOpen(true);
      // Clear l'URL — le pré-remplissage est consommé, plus besoin du param
      navigate({ to: "/briefs", replace: true });
    })();
  }, [search.client_id, user, navigate]);

  const refresh = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;
    const res = await fetch("/api/brief-list", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      toast.error(data?.error || "Erreur");
      setLoading(false);
      return;
    }
    setBriefs(data.briefs || []);
    setLoading(false);
  };

  useEffect(() => {
    if (authLoading || !user) return;
    refresh();
  }, [user, authLoading]);

  const handleCreate = async (form: {
    client_name: string;
    client_email: string;
    destination_hint: string;
  }) => {
    setCreating(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      toast.error("Session expirée");
      setCreating(false);
      return;
    }
    const res = await fetch("/api/brief-create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        client_name: form.client_name || null,
        client_email: form.client_email || null,
        destination_hint: form.destination_hint || null,
        client_id: prefillClient?.id ?? null,
      }),
    });
    const data = await res.json().catch(() => null);
    setCreating(false);
    if (!res.ok) {
      toast.error(data?.error || "Erreur création");
      return;
    }
    setCreateOpen(false);
    // Ouvre direct le panneau de partage avec les données qu'on vient
    // de recevoir, sans attendre le refresh.
    const stub: Brief = {
      id: data.id,
      token: data.token,
      client_name: form.client_name || null,
      client_email: form.client_email || null,
      destination_hint: form.destination_hint || null,
      status: "pending",
      answers: {},
      roadbook_id: null,
      created_at: new Date().toISOString(),
      completed_at: null,
    };
    setShareOpen(stub);
    refresh();
  };

  const stats = useMemo(() => {
    return {
      total: briefs.length,
      pending: briefs.filter((b) => b.status === "pending").length,
      completed: briefs.filter((b) => b.status === "completed").length,
      used: briefs.filter((b) => b.status === "used").length,
    };
  }, [briefs]);

  if (authLoading || loading) {
    return (
      <AppShell>
        <div className="grid min-h-[60vh] place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="container-editorial px-6 py-12 sm:px-10 lg:px-14 sm:py-16">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="rule-warm" aria-hidden />
              <span className="eyebrow">Briefs clients</span>
            </div>
            <h1 className="font-display mt-5 text-[42px] font-semibold leading-[1.05] tracking-tight text-foreground sm:text-[52px]">
              Recueillir les envies
            </h1>
            <p className="mt-5 max-w-2xl text-[15.5px] leading-relaxed text-muted-foreground">
              Envoyez à vos clients un formulaire visuel et soigné pour
              comprendre leurs envies. Quand ils répondent, vous générez un
              roadbook pré-rempli avec toutes les bonnes infos en un clic.
            </p>
          </div>
          <Button
            onClick={() => setCreateOpen(true)}
            className="h-11 gap-2 rounded-full px-6"
          >
            <Plus className="h-4 w-4" />
            Nouveau brief
          </Button>
        </div>

        {/* Stats */}
        {briefs.length > 0 && (
          <div className="mt-10 grid gap-4 sm:grid-cols-4">
            <StatTile
              label="Total"
              value={stats.total}
              icon={Send}
            />
            <StatTile
              label="En attente"
              value={stats.pending}
              icon={Clock}
              tone="muted"
            />
            <StatTile
              label="Reçus"
              value={stats.completed}
              icon={CheckCircle2}
              tone="primary"
            />
            <StatTile
              label="Utilisés"
              value={stats.used}
              icon={Sparkles}
              tone="warm"
            />
          </div>
        )}

        {/* Liste */}
        <div className="mt-10">
          {briefs.length === 0 ? (
            <EmptyState onCreate={() => setCreateOpen(true)} />
          ) : (
            <div className="space-y-3">
              {briefs.map((b) => (
                <BriefCard
                  key={b.id}
                  brief={b}
                  onShare={() => setShareOpen(b)}
                  onView={() => setDetailOpen(b)}
                  onUse={() =>
                    navigate({
                      to: "/new",
                      search: { brief_id: b.id } as any,
                    })
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateBriefDialog
        open={createOpen}
        onOpenChange={(o) => {
          setCreateOpen(o);
          if (!o) setPrefillClient(null);
        }}
        onSubmit={handleCreate}
        submitting={creating}
        prefill={prefillClient}
      />

      <ShareBriefDialog
        brief={shareOpen}
        onOpenChange={(o) => !o && setShareOpen(null)}
      />

      <DetailBriefDialog
        brief={detailOpen}
        onOpenChange={(o) => !o && setDetailOpen(null)}
        onUse={() => {
          if (detailOpen) {
            navigate({
              to: "/new",
              search: { brief_id: detailOpen.id } as any,
            });
          }
        }}
      />
    </AppShell>
  );
}

/* ---------- Stat tile ---------- */

function StatTile({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "muted" | "primary" | "warm";
}) {
  const toneClass = {
    default: "border-border/60",
    muted: "border-border/60",
    primary: "border-primary/40",
    warm: "border-accent-warm/40",
  }[tone];
  const iconClass = {
    default: "text-muted-foreground/50",
    muted: "text-muted-foreground/50",
    primary: "text-primary",
    warm: "text-accent-warm",
  }[tone];
  return (
    <div className={cn("rounded-2xl border bg-surface p-5 shadow-soft", toneClass)}>
      <div className="flex items-center justify-between">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </p>
        <Icon className={cn("h-4 w-4", iconClass)} />
      </div>
      <p className="font-display mt-3 text-[34px] font-semibold leading-none text-foreground">
        {value}
      </p>
    </div>
  );
}

/* ---------- Brief card ---------- */

function BriefCard({
  brief,
  onShare,
  onView,
  onUse,
}: {
  brief: Brief;
  onShare: () => void;
  onView: () => void;
  onUse: () => void;
}) {
  const statusMap = {
    pending: { label: "En attente", cls: "bg-muted text-muted-foreground" },
    completed: { label: "Réponses reçues", cls: "bg-primary-soft text-primary" },
    used: {
      label: "Utilisé",
      cls: "bg-accent-warm-soft text-foreground",
    },
  };
  const status = statusMap[brief.status];

  return (
    <div className="rounded-2xl border border-border/60 bg-surface p-5 shadow-soft transition hover:shadow-soft-md">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-display text-[18px] font-semibold text-foreground">
              {brief.client_name || brief.client_email || "Brief sans nom"}
            </h3>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold",
                status.cls,
              )}
            >
              {status.label}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-muted-foreground">
            {brief.client_email && (
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {brief.client_email}
              </span>
            )}
            {brief.destination_hint && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {brief.destination_hint}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(brief.created_at)}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {brief.status === "pending" && (
            <Button
              size="sm"
              variant="outline"
              onClick={onShare}
              className="gap-1.5 rounded-full"
            >
              <Send className="h-3.5 w-3.5" />
              Partager
            </Button>
          )}
          {brief.status === "completed" && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={onView}
                className="rounded-full"
              >
                Voir réponses
              </Button>
              <Button
                size="sm"
                onClick={onUse}
                className="gap-1.5 rounded-full"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Générer roadbook
              </Button>
            </>
          )}
          {brief.status === "used" && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={onView}
                className="rounded-full text-[12px]"
              >
                Voir réponses
              </Button>
              {brief.roadbook_id && (
                <Link
                  to="/roadbook/$id"
                  params={{ id: brief.roadbook_id }}
                >
                  <Button size="sm" variant="outline" className="gap-1.5 rounded-full">
                    Ouvrir le roadbook
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Empty state ---------- */

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface/50 px-8 py-16 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary-soft text-primary">
        <Send className="h-6 w-6" />
      </div>
      <h2 className="font-display mt-6 text-[24px] font-semibold leading-tight text-foreground">
        Pas encore de brief
      </h2>
      <p className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-muted-foreground">
        Envoyez un formulaire à votre client pour comprendre ses envies. Vous
        recevrez ses réponses ici et pourrez générer un roadbook taillé sur
        mesure en un clic.
      </p>
      <Button
        onClick={onCreate}
        className="mt-6 h-11 gap-2 rounded-full px-6"
      >
        <Plus className="h-4 w-4" />
        Créer mon premier brief
      </Button>
    </div>
  );
}

/* ---------- Create dialog ---------- */

function CreateBriefDialog({
  open,
  onOpenChange,
  onSubmit,
  submitting,
  prefill,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSubmit: (f: {
    client_name: string;
    client_email: string;
    destination_hint: string;
  }) => void;
  submitting: boolean;
  prefill?: { id: string; display_name: string; email: string | null } | null;
}) {
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [destHint, setDestHint] = useState("");

  useEffect(() => {
    if (!open) {
      setClientName("");
      setClientEmail("");
      setDestHint("");
    } else if (prefill) {
      setClientName(prefill.display_name);
      setClientEmail(prefill.email ?? "");
    }
  }, [open, prefill]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      client_name: clientName.trim(),
      client_email: clientEmail.trim(),
      destination_hint: destHint.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nouveau brief</DialogTitle>
          <DialogDescription>
            Optionnel — vous pouvez tout laisser vide et envoyer le lien direct.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label className="text-sm font-medium">Nom du client</Label>
            <div className="relative mt-1.5">
              <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Marie & Paul Dupont"
                className="h-10 pl-9"
              />
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium">Email du client</Label>
            <div className="relative mt-1.5">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="marie@exemple.com"
                className="h-10 pl-9"
              />
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium">Destination envisagée</Label>
            <div className="relative mt-1.5">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={destHint}
                onChange={(e) => setDestHint(e.target.value)}
                placeholder="Italie, Japon, Patagonie…"
                className="h-10 pl-9"
              />
            </div>
            <p className="mt-1 text-[11.5px] text-text-soft">
              Affiché en haut du formulaire pour orienter la réflexion du client
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={submitting} className="gap-1.5">
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              Créer et obtenir le lien
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Share dialog ---------- */

function ShareBriefDialog({
  brief,
  onOpenChange,
}: {
  brief: Brief | null;
  onOpenChange: (o: boolean) => void;
}) {
  const [copied, setCopied] = useState(false);
  const url = brief
    ? `${typeof window !== "undefined" ? window.location.origin : "https://getroadbook.com"}/brief/${brief.token}`
    : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Lien copié");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Impossible de copier");
    }
  };

  const mailtoSubject = encodeURIComponent("Préparons votre voyage");
  const mailtoBody = encodeURIComponent(
    `Bonjour${brief?.client_name ? ` ${brief.client_name}` : ""},\n\nAvant de vous proposer un itinéraire, j'aimerais mieux comprendre vos envies. Cela prend 4 minutes :\n\n${url}\n\nÀ très vite,`,
  );
  const mailtoUrl = brief?.client_email
    ? `mailto:${brief.client_email}?subject=${mailtoSubject}&body=${mailtoBody}`
    : `mailto:?subject=${mailtoSubject}&body=${mailtoBody}`;

  return (
    <Dialog open={!!brief} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Lien à envoyer</DialogTitle>
          <DialogDescription>
            Partagez ce lien à votre client. Il pourra remplir le formulaire
            sans créer de compte.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-lg border border-border/60 bg-muted/40 p-3">
            <p className="break-all font-mono text-[12.5px] text-foreground">
              {url}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={copy}
              className="flex-1 gap-1.5 rounded-full"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? "Copié" : "Copier le lien"}
            </Button>
            <a href={mailtoUrl} className="flex-1">
              <Button
                type="button"
                className="w-full gap-1.5 rounded-full"
              >
                <Mail className="h-3.5 w-3.5" />
                Ouvrir un email
              </Button>
            </a>
          </div>
          <p className="text-[11.5px] leading-relaxed text-text-soft">
            Quand votre client aura répondu, vous verrez ses réponses
            apparaître ici et vous pourrez générer un roadbook pré-rempli en
            un clic.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Detail dialog (réponses du client) ---------- */

function DetailBriefDialog({
  brief,
  onOpenChange,
  onUse,
}: {
  brief: Brief | null;
  onOpenChange: (o: boolean) => void;
  onUse: () => void;
}) {
  if (!brief) return null;

  const labelFor = (qId: string, value: any): string => {
    const q = BRIEF_QUESTIONS.find((x) => x.id === qId);
    if (!q) return String(value);
    if (q.type === "single") {
      const opt = q.options?.find((o) => o.value === value);
      return opt?.label || String(value);
    }
    if (q.type === "multi" && Array.isArray(value)) {
      return value
        .map((v) => q.options?.find((o) => o.value === v)?.label || v)
        .join(", ");
    }
    return String(value);
  };

  return (
    <Dialog open={!!brief} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Réponses de {brief.client_name || "votre client"}
          </DialogTitle>
          <DialogDescription>
            Reçu le {formatDate(brief.completed_at || brief.created_at)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {BRIEF_QUESTIONS.map((q) => {
            const v = brief.answers[q.id];
            const empty =
              v === undefined ||
              v === null ||
              v === "" ||
              (Array.isArray(v) && v.length === 0);
            return (
              <div
                key={q.id}
                className="rounded-lg border border-border/60 bg-surface p-4"
              >
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-accent-warm">
                  {q.title}
                </p>
                <p
                  className={cn(
                    "mt-2 text-[14px] leading-relaxed",
                    empty
                      ? "italic text-muted-foreground"
                      : "text-foreground",
                  )}
                >
                  {empty ? "Pas de réponse" : labelFor(q.id, v)}
                </p>
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
          {brief.status !== "used" && (
            <Button onClick={onUse} className="gap-1.5 rounded-full">
              <Sparkles className="h-3.5 w-3.5" />
              Générer le roadbook
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "2-digit",
    });
  } catch {
    return iso;
  }
}
