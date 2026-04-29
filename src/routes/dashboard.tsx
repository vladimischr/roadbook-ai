import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Calendar, MoreVertical, Trash2, Upload, Compass } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { ImportRoadbookDialog } from "@/components/ImportRoadbookDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { useDestinationCover } from "@/lib/useDestinationCover";
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
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Tableau de bord — Roadbook.ai" }] }),
});

type RoadbookRow = {
  id: string;
  client_name: string;
  destination: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  created_at: string;
};

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
  const [roadbooks, setRoadbooks] = useState<RoadbookRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toDelete, setToDelete] = useState<RoadbookRow | null>(null);
  const [importOpen, setImportOpen] = useState(false);

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

  return (
    <AppShell>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
            Vos roadbooks
          </h1>
          <p className="mt-3 max-w-xl text-base text-muted-foreground">
            Tous vos voyages, prêts à partager.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="gap-2 transition-smooth"
            onClick={() => setImportOpen(true)}
          >
            <Upload className="h-4 w-4" />
            Importer
          </Button>
          <Link to="/new">
            <Button className="gap-2 transition-smooth">
              <Plus className="h-4 w-4" />
              Nouveau roadbook
            </Button>
          </Link>
        </div>
      </div>

      <ImportRoadbookDialog open={importOpen} onOpenChange={setImportOpen} />

      <div className="mt-12">
        {loading ? (
          <div className="text-sm text-muted-foreground">Chargement…</div>
        ) : roadbooks.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {roadbooks.map((rb, i) => (
              <RoadbookCard key={rb.id} rb={rb} index={i} onDelete={() => setToDelete(rb)} />
            ))}
          </ul>
        )}
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
    </AppShell>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-surface p-16 text-center shadow-[0_1px_0_rgba(0,0,0,0.02)]">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-accent-warm-soft text-accent-warm">
        <Compass className="h-7 w-7" strokeWidth={1.5} />
      </div>
      <h2 className="mt-6 font-display text-2xl font-semibold text-foreground">
        Vous n'avez encore créé aucun roadbook
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        Créez votre premier itinéraire en moins de cinq minutes — votre voyage prend forme à partir d'un brief.
      </p>
      <Link to="/new" className="mt-8 inline-block">
        <Button className="gap-2 transition-smooth">
          <Plus className="h-4 w-4" /> Créer votre premier roadbook
        </Button>
      </Link>
    </div>
  );
}

function RoadbookCard({ rb, index = 0, onDelete }: { rb: RoadbookRow; index?: number; onDelete: () => void }) {
  const navigate = useNavigate();
  const cover = useDestinationCover(rb.destination);
  const dateRange = formatDateRange(rb.start_date, rb.end_date);

  return (
    <li
      className="group relative animate-fade-in"
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: "backwards" }}
    >
      <button
        type="button"
        onClick={() => navigate({ to: "/roadbook/$id", params: { id: rb.id } })}
        className="block w-full overflow-hidden rounded-2xl border border-border/60 bg-surface text-left shadow-soft transition-smooth hover:-translate-y-1 hover:border-primary/30 hover:shadow-soft-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
        aria-label={`Ouvrir ${rb.destination} — ${rb.client_name}`}
      >
        {/* Cover image — portrait 4/5 editorial */}
        <div className="relative aspect-[4/5] w-full overflow-hidden bg-gradient-to-br from-primary via-primary to-primary-light">
          {cover ? (
            <img
              src={cover}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-smooth group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Compass className="h-10 w-10 text-white/40" strokeWidth={1.2} />
            </div>
          )}
          {/* Overlay gradient teal-to-transparent en bas */}
          <div className="absolute inset-0 bg-gradient-to-t from-[rgba(15,110,86,0.92)] via-[rgba(15,110,86,0.35)] to-transparent" />

          {/* Status badge */}
          <div className="absolute left-4 top-4">
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] backdrop-blur-md ${
                rb.status === "ready"
                  ? "bg-white/85 text-primary"
                  : "bg-black/40 text-white"
              }`}
            >
              {rb.status === "ready" ? "prêt" : rb.status}
            </span>
          </div>

          {/* Title overlay */}
          <div className="absolute inset-x-0 bottom-0 px-5 pb-5 pt-12 text-white">
            <h3 className="font-display text-2xl font-semibold leading-tight drop-shadow-sm">
              {rb.destination}
            </h3>
            <p className="mt-1 text-sm font-medium text-white/85">
              {rb.client_name}
            </p>
            {dateRange && (
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white/95 backdrop-blur-sm">
                <Calendar className="h-3 w-3" />
                {dateRange}
              </div>
            )}
          </div>
        </div>
      </button>

      {/* Menu (sits above the link button) */}
      <div className="absolute right-3 top-3 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className="grid h-8 w-8 place-items-center rounded-full bg-white/85 text-foreground/70 shadow-sm backdrop-blur-md transition-smooth hover:bg-white hover:text-foreground"
              aria-label="Plus d'options"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
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
