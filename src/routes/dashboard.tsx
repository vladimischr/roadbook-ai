import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, MapPin, Calendar, FileText, MoreVertical, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
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

function relativeFromNow(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `il y a ${days} j`;
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function Dashboard() {
  const { user } = useAuth();
  const [roadbooks, setRoadbooks] = useState<RoadbookRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toDelete, setToDelete] = useState<RoadbookRow | null>(null);

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
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Vos roadbooks</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tous les voyages que vous avez conçus, en un seul endroit.
          </p>
        </div>
        <Link to="/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nouveau roadbook
          </Button>
        </Link>
      </div>

      <div className="mt-8">
        {loading ? (
          <div className="text-sm text-muted-foreground">Chargement…</div>
        ) : roadbooks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-16 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary-soft">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">Pas encore de roadbooks</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Créez votre premier carnet de voyage généré par IA en moins de 5 minutes.
            </p>
            <Link to="/new" className="mt-6 inline-block">
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Nouveau roadbook
              </Button>
            </Link>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {roadbooks.map((rb) => (
              <RoadbookCard key={rb.id} rb={rb} onDelete={() => setToDelete(rb)} />
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

function RoadbookCard({ rb, onDelete }: { rb: RoadbookRow; onDelete: () => void }) {
  const navigate = useNavigate();
  const title = `${rb.destination} — ${rb.client_name}`;

  return (
    <li className="group relative rounded-xl border border-border bg-card p-5 transition hover:border-primary/40 hover:shadow-sm">
      <button
        type="button"
        onClick={() => navigate({ to: "/roadbook/$id", params: { id: rb.id } })}
        className="absolute inset-0 rounded-xl"
        aria-label={`Ouvrir ${title}`}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 pr-2">
          <h3 className="truncate font-semibold text-foreground group-hover:text-primary">
            {title}
          </h3>
          <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            <span className="truncate">{rb.destination}</span>
          </div>
        </div>
        <div className="z-10 flex items-center gap-1">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              rb.status === "ready"
                ? "bg-primary-soft text-primary"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            {rb.status === "ready" ? "prêt" : rb.status}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
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
      </div>
      <div className="relative mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Calendar className="h-3.5 w-3.5" />
        {relativeFromNow(rb.created_at)}
        {rb.start_date && rb.end_date && (
          <span className="ml-2">
            ·{" "}
            {new Date(rb.start_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
            {" → "}
            {new Date(rb.end_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        )}
      </div>
    </li>
  );
}
