import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Calendar,
  MoreVertical,
  Trash2,
  Upload,
  Compass,
  Search,
  ChevronDown,
  Check,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImportRoadbookDialog } from "@/components/ImportRoadbookDialog";
import { Paywall } from "@/components/Paywall";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { useDestinationCover } from "@/lib/useDestinationCover";
import { useSubscription } from "@/lib/useSubscription";
import { getPlan } from "@/lib/plans";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Vos roadbooks — Roadbook.ai" }] }),
});

type RoadbookStatus = "draft" | "ready" | "delivered" | "archived";

type RoadbookRow = {
  id: string;
  client_name: string;
  destination: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  created_at: string;
};

type SortKey = "recent" | "travel_date" | "alpha";

const STATUS_LABEL: Record<RoadbookStatus, string> = {
  draft: "Brouillon",
  ready: "Prêt",
  delivered: "Livré",
  archived: "Archivé",
};

function normalizeStatus(s: string): RoadbookStatus {
  if (s === "ready" || s === "delivered" || s === "archived") return s;
  return "draft";
}

function formatDateRange(start: string | null, end: string | null) {
  if (!start || !end) return "";
  const s = new Date(start);
  const e = new Date(end);
  const sameYear = s.getFullYear() === e.getFullYear();
  const sFmt = s.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  const eFmt = e.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return sameYear ? `${sFmt} → ${eFmt}` : `${sFmt} ${s.getFullYear()} → ${eFmt}`;
}

function Dashboard() {
  const { user } = useAuth();
  const { info: subInfo } = useSubscription();
  const [roadbooks, setRoadbooks] = useState<RoadbookRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toDelete, setToDelete] = useState<RoadbookRow | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);

  // Filters / search / sort
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"all" | RoadbookStatus>("all");
  const [sort, setSort] = useState<SortKey>("recent");

  const refresh = async () => {
    const { data, error } = await supabase
      .from("roadbooks")
      .select("id, client_name, destination, start_date, end_date, status, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Échec du chargement : " + error.message);
      setRoadbooks([]);
    } else {
      setRoadbooks(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const counts = useMemo(() => {
    const c = { all: roadbooks.length, draft: 0, ready: 0, delivered: 0, archived: 0 };
    for (const r of roadbooks) c[normalizeStatus(r.status)]++;
    return c;
  }, [roadbooks]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = roadbooks;
    if (tab !== "all") list = list.filter((r) => normalizeStatus(r.status) === tab);
    if (q) {
      list = list.filter(
        (r) =>
          r.destination.toLowerCase().includes(q) ||
          r.client_name.toLowerCase().includes(q),
      );
    }
    const sorted = [...list];
    if (sort === "alpha") {
      sorted.sort((a, b) => a.destination.localeCompare(b.destination, "fr"));
    } else if (sort === "travel_date") {
      sorted.sort((a, b) => {
        const da = a.start_date ? new Date(a.start_date).getTime() : Infinity;
        const db = b.start_date ? new Date(b.start_date).getTime() : Infinity;
        return da - db;
      });
    } else {
      sorted.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    }
    return sorted;
  }, [roadbooks, query, tab, sort]);

  const confirmDelete = async () => {
    if (!toDelete) return;
    const { error } = await supabase.from("roadbooks").delete().eq("id", toDelete.id);
    if (error) {
      toast.error("Suppression impossible : " + error.message);
    } else {
      toast.success("Roadbook supprimé");
      setRoadbooks((rs) => rs.filter((r) => r.id !== toDelete.id));
    }
    setToDelete(null);
  };

  const updateStatus = async (rb: RoadbookRow, status: RoadbookStatus) => {
    const prev = rb.status;
    setRoadbooks((rs) => rs.map((r) => (r.id === rb.id ? { ...r, status } : r)));
    const { error } = await supabase.from("roadbooks").update({ status }).eq("id", rb.id);
    if (error) {
      toast.error("Mise à jour impossible : " + error.message);
      setRoadbooks((rs) => rs.map((r) => (r.id === rb.id ? { ...r, status: prev } : r)));
    } else {
      toast.success(`Marqué comme ${STATUS_LABEL[status].toLowerCase()}`, { duration: 1800 });
    }
  };

  return (
    <AppShell>
      <div className="container-editorial px-6 sm:px-10 lg:px-14">
        {/* ============== Header ============== */}
        <header className="pt-16 pb-12 sm:pt-20 sm:pb-16">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3">
                <span className="rule-warm" aria-hidden />
                <span className="eyebrow">Votre atelier</span>
              </div>
              <h1 className="mt-5 font-display text-[42px] font-semibold leading-[1.05] tracking-tight text-foreground sm:text-[52px] lg:text-[56px]">
                Vos roadbooks
              </h1>
              <p className="mt-5 text-[16px] leading-relaxed text-muted-foreground sm:text-[17px]">
                Tous vos voyages en cours, brouillons et archives.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                className="h-11 gap-2 rounded-full border-border/70 px-5 text-[14px] font-medium transition-smooth hover:border-primary/40 hover:bg-primary-soft hover:text-primary"
                onClick={() => setImportOpen(true)}
              >
                <Upload className="h-4 w-4" />
                Importer
              </Button>
              <Link to="/new">
                <Button className="h-11 gap-2 rounded-full px-5 text-[14px] font-medium transition-smooth hover:scale-[1.02] hover:shadow-soft-md">
                  <Plus className="h-4 w-4" />
                  Nouveau roadbook
                </Button>
              </Link>
            </div>
          </div>

          {subInfo && (
            <UsageBanner
              info={subInfo}
              onUpgradeClick={() => setPaywallOpen(true)}
            />
          )}

          {/* Search + filters bar */}
          {(loading || roadbooks.length > 0) && (
            <div className="mt-12 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative max-w-md flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Rechercher un voyage, un client, une destination"
                  className="h-12 rounded-full border-border/70 bg-surface pl-11 pr-4 text-[14px] shadow-none transition-smooth focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/15"
                />
              </div>

              <div className="flex items-center gap-3">
                {/* Tabs */}
                <div className="flex items-center gap-1 rounded-full border border-border/60 bg-surface p-1 shadow-soft">
                  {([
                    ["all", "Tous", counts.all],
                    ["draft", "Brouillons", counts.draft],
                    ["ready", "Prêts", counts.ready],
                    ["delivered", "Livrés", counts.delivered],
                    ["archived", "Archivés", counts.archived],
                  ] as const).map(([key, label, count]) => {
                    const active = tab === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setTab(key)}
                        className={cn(
                          "relative rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-smooth",
                          active
                            ? "bg-primary text-primary-foreground shadow-soft"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {label}
                        <span
                          className={cn(
                            "ml-1.5 text-[11px] font-medium",
                            active ? "text-primary-foreground/80" : "text-muted-foreground/70",
                          )}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Sort */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex h-10 items-center gap-1.5 rounded-full border border-border/70 bg-surface px-4 text-[12.5px] font-medium text-foreground/80 transition-smooth hover:border-primary/40 hover:text-foreground"
                    >
                      {sort === "recent" && "Récents"}
                      {sort === "travel_date" && "Date de voyage"}
                      {sort === "alpha" && "A → Z"}
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <SortItem current={sort} value="recent" label="Récents" onSelect={setSort} />
                    <SortItem current={sort} value="travel_date" label="Date de voyage" onSelect={setSort} />
                    <SortItem current={sort} value="alpha" label="Alphabétique" onSelect={setSort} />
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )}
        </header>

        <ImportRoadbookDialog open={importOpen} onOpenChange={setImportOpen} />

        {/* ============== Grid ============== */}
        <div className="pb-24">
          {loading ? (
            <CardSkeletonGrid />
          ) : roadbooks.length === 0 ? (
            <EmptyState onImport={() => setImportOpen(true)} />
          ) : filtered.length === 0 ? (
            <NoMatch query={query} onReset={() => { setQuery(""); setTab("all"); }} />
          ) : (
            <ul className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((rb, i) => (
                <RoadbookCard
                  key={rb.id}
                  rb={rb}
                  index={i}
                  onDelete={() => setToDelete(rb)}
                  onSetStatus={(s) => updateStatus(rb, s)}
                />
              ))}
            </ul>
          )}
        </div>
      </div>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce roadbook ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est définitive. Le roadbook
              {toDelete ? ` « ${toDelete.destination} — ${toDelete.client_name} »` : ""} sera
              supprimé pour toujours.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {subInfo && (
        <Paywall
          open={paywallOpen}
          onOpenChange={setPaywallOpen}
          currentPlanKey={subInfo.planKey}
        />
      )}
    </AppShell>
  );
}

/* ---------- Usage banner ---------- */

function UsageBanner({
  info,
  onUpgradeClick,
}: {
  info: NonNullable<ReturnType<typeof useSubscription>["info"]>;
  onUpgradeClick: () => void;
}) {
  const plan = getPlan(info.planKey);
  const isUnlimited = info.limit === null;
  const isFree = info.planKey === "free";
  const isPastDue =
    info.planStatus === "past_due" || info.planStatus === "unpaid";
  const isLow =
    !isUnlimited &&
    info.remaining !== null &&
    info.remaining > 0 &&
    info.remaining <= Math.max(1, Math.floor((info.limit ?? 1) * 0.2));
  const isExceeded =
    !isUnlimited && info.remaining !== null && info.remaining === 0;

  // On masque le bandeau pour les plans illimités sans souci de paiement.
  if (isUnlimited && !isPastDue) return null;

  const tone = isPastDue
    ? "destructive"
    : isExceeded
      ? "destructive"
      : isLow
        ? "warm"
        : "neutral";

  const styles = {
    destructive: "border-destructive/40 bg-destructive/5",
    warm: "border-amber-500/40 bg-amber-50/60 dark:bg-amber-500/10",
    neutral: "border-border/60 bg-surface",
  } as const;

  return (
    <div
      className={cn(
        "mt-8 flex flex-col gap-3 rounded-2xl border px-5 py-4 sm:flex-row sm:items-center sm:justify-between",
        styles[tone],
      )}
    >
      <div className="flex items-baseline gap-3">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          {plan.name}
        </span>
        <span className="text-[14px] text-foreground/85">
          {isPastDue ? (
            "Paiement en échec — mets à jour ta CB pour reprendre."
          ) : isUnlimited ? (
            "Génération illimitée."
          ) : (
            <>
              <strong className="text-foreground">{info.used}</strong>
              <span className="text-muted-foreground"> / {info.limit}</span>
              <span className="ml-1 text-muted-foreground">
                roadbooks ce mois
              </span>
            </>
          )}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Link
          to="/billing"
          className="text-[12.5px] text-muted-foreground transition hover:text-foreground"
        >
          Voir détails
        </Link>
        {(isFree || isLow || isExceeded || isPastDue) && (
          <Button
            size="sm"
            onClick={onUpgradeClick}
            className="h-8 gap-1.5 rounded-full px-3.5 text-[12.5px]"
          >
            {isPastDue ? "Réactiver" : isFree ? "Passer Pro" : "Passer au supérieur"}
          </Button>
        )}
      </div>
    </div>
  );
}

function SortItem({
  current,
  value,
  label,
  onSelect,
}: {
  current: SortKey;
  value: SortKey;
  label: string;
  onSelect: (v: SortKey) => void;
}) {
  return (
    <DropdownMenuItem onClick={() => onSelect(value)} className="text-[13px]">
      <span className="flex-1">{label}</span>
      {current === value && <Check className="h-3.5 w-3.5 text-primary" />}
    </DropdownMenuItem>
  );
}

/* ---------- Empty states ---------- */

function EmptyState({ onImport }: { onImport: () => void }) {
  return (
    <div className="rounded-3xl border border-dashed border-border/70 bg-surface px-10 py-20 text-center shadow-soft">
      <EmptyStateIllustration />
      <h2 className="mt-10 font-display text-[32px] font-semibold leading-tight text-foreground">
        Votre premier voyage commence ici
      </h2>
      <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
        Créez un roadbook depuis zéro ou importez un programme Excel existant.
      </p>
      <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
        <Link to="/new">
          <Button className="h-11 gap-2 rounded-full px-6 transition-smooth hover:scale-[1.02]">
            <Plus className="h-4 w-4" /> Créer un roadbook
          </Button>
        </Link>
        <Button
          variant="outline"
          className="h-11 gap-2 rounded-full border-border/70 px-6 transition-smooth hover:border-primary/40 hover:bg-primary-soft hover:text-primary"
          onClick={onImport}
        >
          <Upload className="h-4 w-4" /> Importer un fichier
        </Button>
      </div>
    </div>
  );
}

function EmptyStateIllustration() {
  return (
    <svg
      viewBox="0 0 240 140"
      className="mx-auto h-32 w-auto"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      aria-hidden
    >
      {/* Globe lines */}
      <g className="text-primary/40">
        <ellipse cx="80" cy="70" rx="46" ry="46" />
        <ellipse cx="80" cy="70" rx="46" ry="18" />
        <line x1="34" y1="70" x2="126" y2="70" />
        <line x1="80" y1="24" x2="80" y2="116" />
        <path d="M 80 24 C 50 50, 50 90, 80 116" />
        <path d="M 80 24 C 110 50, 110 90, 80 116" />
      </g>
      {/* Vintage suitcase */}
      <g className="text-accent-warm" transform="translate(140 60)">
        <rect x="0" y="10" width="70" height="48" rx="4" />
        <line x1="0" y1="24" x2="70" y2="24" />
        <path d="M 22 10 V 4 C 22 1, 24 0, 26 0 H 44 C 46 0, 48 1, 48 4 V 10" />
        <circle cx="14" cy="46" r="2.5" fill="currentColor" />
        <circle cx="56" cy="46" r="2.5" fill="currentColor" />
      </g>
      {/* Dotted travel line */}
      <path
        d="M 30 110 Q 90 130 150 100 T 220 90"
        className="text-accent-warm/70"
        strokeDasharray="2 5"
      />
    </svg>
  );
}

function NoMatch({ query, onReset }: { query: string; onReset: () => void }) {
  return (
    <div className="rounded-3xl border border-border/60 bg-surface px-10 py-16 text-center shadow-soft">
      <p className="eyebrow-warm">Aucun résultat</p>
      <h3 className="mt-4 font-display text-[26px] font-semibold text-foreground">
        Rien ne correspond {query ? `à « ${query} »` : "à ce filtre"}
      </h3>
      <p className="mt-2 text-[14px] text-muted-foreground">
        Essayez avec d'autres termes, ou réinitialisez les filtres.
      </p>
      <Button
        variant="outline"
        className="mt-6 rounded-full border-border/70"
        onClick={onReset}
      >
        Réinitialiser
      </Button>
    </div>
  );
}

function CardSkeletonGrid() {
  return (
    <ul className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <li
          key={i}
          className="aspect-[4/5] animate-pulse rounded-2xl border border-border/50 bg-surface-warm"
          style={{ animationDelay: `${i * 80}ms` }}
        />
      ))}
    </ul>
  );
}

/* ---------- Card ---------- */

function RoadbookCard({
  rb,
  index = 0,
  onDelete,
  onSetStatus,
}: {
  rb: RoadbookRow;
  index?: number;
  onDelete: () => void;
  onSetStatus: (s: RoadbookStatus) => void;
}) {
  const navigate = useNavigate();
  const cover = useDestinationCover(rb.destination);
  const dateRange = formatDateRange(rb.start_date, rb.end_date);
  const status = normalizeStatus(rb.status);

  return (
    <li
      className="group relative animate-fade-in"
      style={{ animationDelay: `${index * 70}ms`, animationFillMode: "backwards" }}
    >
      <button
        type="button"
        onClick={() => navigate({ to: "/roadbook/$id", params: { id: rb.id } })}
        className="block w-full overflow-hidden rounded-2xl border border-border/60 bg-surface text-left shadow-soft transition-smooth hover:-translate-y-1 hover:shadow-soft-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
        aria-label={`Ouvrir ${rb.destination} — ${rb.client_name}`}
      >
        {/* Cover image — portrait 4/5 editorial */}
        <div className="relative aspect-[4/5] w-full overflow-hidden bg-gradient-to-br from-primary via-primary to-primary-light">
          {cover ? (
            <img
              src={cover}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-[600ms] ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:scale-[1.05]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Compass className="h-10 w-10 text-white/40" strokeWidth={1.2} />
            </div>
          )}
          {/* Vertical teal-to-transparent gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-[rgba(15,110,86,0.92)] via-[rgba(15,110,86,0.30)] to-transparent" />

          {/* Title overlay */}
          <div className="absolute inset-x-0 bottom-0 px-7 pb-7 pt-20 text-white">
            <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.24em] text-white/75">
              {rb.client_name}
            </p>
            <h3 className="font-display text-[26px] font-semibold leading-[1.05] drop-shadow-sm sm:text-[30px]">
              {rb.destination}
            </h3>
            {dateRange && (
              <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11.5px] font-medium text-white/95 backdrop-blur-md">
                <Calendar className="h-3 w-3" />
                {dateRange}
              </div>
            )}
          </div>
        </div>
      </button>

      {/* Status badge — top-left */}
      <div className="pointer-events-none absolute left-4 top-4 z-10">
        <span className={cn("status-pill backdrop-blur-md", `status-${status}`)}>
          {STATUS_LABEL[status]}
        </span>
      </div>

      {/* Menu — top-right */}
      <div className="absolute right-3 top-3 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className="grid h-9 w-9 place-items-center rounded-full bg-white/85 text-foreground/70 shadow-sm backdrop-blur-md transition-smooth hover:scale-[1.04] hover:bg-white hover:text-foreground"
              aria-label="Plus d'options"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <p className="px-2 pt-1.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Statut
            </p>
            {(["draft", "ready", "delivered", "archived"] as const).map((s) => (
              <DropdownMenuItem
                key={s}
                onClick={(e) => {
                  e.stopPropagation();
                  onSetStatus(s);
                }}
                className="text-[13px]"
              >
                <span className="flex-1">{STATUS_LABEL[s]}</span>
                {status === s && <Check className="h-3.5 w-3.5 text-primary" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}
