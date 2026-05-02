import {
  createFileRoute,
  Link,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  ArrowLeft,
  Edit3,
  Trash2,
  Save,
  X,
  Star,
  Mail,
  Phone,
  MapPin,
  User as UserIcon,
  Calendar,
  Sparkles,
  Send,
  ExternalLink,
  Plus,
  AlertTriangle,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

// Folder-based routing : `clients/index.tsx` = /clients (liste),
// `clients/$id.tsx` = /clients/$id (détail). Pas de hiérarchie parent-enfant
// puisque le dossier `clients/` n'a pas de fichier `route.tsx` qui définirait
// un layout commun.
export const Route = createFileRoute("/clients/$id")({
  component: ClientDetailPage,
  head: () => ({ meta: [{ title: "Fiche client — Roadbook.ai" }] }),
});

interface Client {
  id: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  tags: string[];
  notes: string | null;
  vip: boolean;
  created_at: string;
  updated_at: string;
}

interface RoadbookSummary {
  id: string;
  destination: string;
  client_name: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  created_at: string;
  theme: string | null;
}

interface BriefSummary {
  id: string;
  token: string;
  destination_hint: string | null;
  status: "pending" | "completed" | "used";
  created_at: string;
  completed_at: string | null;
  roadbook_id: string | null;
}

function ClientDetailPage() {
  const { id } = useParams({ from: "/clients/$id" });
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [roadbooks, setRoadbooks] = useState<RoadbookSummary[]>([]);
  const [briefs, setBriefs] = useState<BriefSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Client | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const refresh = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;
    const res = await fetch(`/api/client-get?id=${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      toast.error(data?.error || "Erreur");
      setLoading(false);
      return;
    }
    setClient(data.client);
    setDraft(data.client);
    setRoadbooks(data.roadbooks || []);
    setBriefs(data.briefs || []);
    setLoading(false);
  };

  useEffect(() => {
    if (authLoading || !user) return;
    refresh();
  }, [user, authLoading, id]);

  const stats = useMemo(() => {
    const past = roadbooks.filter((r) => {
      if (!r.end_date) return false;
      return new Date(r.end_date) < new Date();
    });
    const upcoming = roadbooks.filter((r) => {
      if (!r.start_date) return false;
      return new Date(r.start_date) > new Date();
    });
    const destinations = Array.from(
      new Set(roadbooks.map((r) => r.destination).filter(Boolean)),
    );
    return {
      total: roadbooks.length,
      past: past.length,
      upcoming: upcoming.length,
      destinations,
    };
  }, [roadbooks]);

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      toast.error("Session expirée");
      setSaving(false);
      return;
    }
    const res = await fetch("/api/client-update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        id: draft.id,
        display_name: draft.display_name,
        email: draft.email,
        phone: draft.phone,
        city: draft.city,
        country: draft.country,
        tags: draft.tags,
        notes: draft.notes,
        vip: draft.vip,
      }),
    });
    const data = await res.json().catch(() => null);
    setSaving(false);
    if (!res.ok) {
      toast.error(data?.error || "Échec sauvegarde");
      return;
    }
    setClient(draft);
    setEditing(false);
    toast.success("Fiche enregistrée");
  };

  const handleDelete = async () => {
    setSaving(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      toast.error("Session expirée");
      setSaving(false);
      return;
    }
    const res = await fetch("/api/client-delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      toast.error(data?.error || "Échec suppression");
      return;
    }
    toast.success("Client supprimé");
    navigate({ to: "/clients" });
  };

  if (authLoading || loading || !client || !draft) {
    return (
      <AppShell>
        <div className="grid min-h-[60vh] place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  const activeData = editing ? draft : client;
  const initials = (client.display_name || "?")
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Timeline mergée roadbooks + briefs, triée par date desc
  const timeline = [
    ...roadbooks.map((r) => ({
      kind: "roadbook" as const,
      date: r.created_at,
      data: r,
    })),
    ...briefs.map((b) => ({
      kind: "brief" as const,
      date: b.created_at,
      data: b,
    })),
  ].sort((a, b) => (b.date > a.date ? 1 : -1));

  return (
    <AppShell>
      <div className="container-editorial px-6 py-12 sm:px-10 lg:px-14 sm:py-16">
        <div className="mx-auto max-w-4xl">
          <Link
            to="/clients"
            className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Tous les clients
          </Link>

          {/* Header */}
          <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-5">
              <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-primary-soft text-[28px] font-semibold text-primary">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                {editing ? (
                  <Input
                    value={draft.display_name}
                    onChange={(e) =>
                      setDraft({ ...draft, display_name: e.target.value })
                    }
                    className="h-11 max-w-md text-[24px] font-semibold"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <h1 className="font-display text-[34px] font-semibold leading-tight tracking-tight text-foreground">
                      {client.display_name}
                    </h1>
                    {client.vip && (
                      <Star className="h-5 w-5 fill-accent-warm text-accent-warm" />
                    )}
                  </div>
                )}
                <p className="mt-1 text-[12.5px] text-muted-foreground">
                  Client depuis le {formatDate(client.created_at)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!editing ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditing(true)}
                    className="gap-1.5 rounded-full"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Modifier
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteOpen(true)}
                    className="gap-1.5 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDraft(client);
                      setEditing(false);
                    }}
                  >
                    Annuler
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={saving}
                    className="gap-1.5 rounded-full"
                  >
                    {saving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    Enregistrer
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="mt-10 grid gap-3 sm:grid-cols-4">
            <StatBox
              label="Voyages"
              value={stats.total}
              hint={
                stats.upcoming > 0
                  ? `${stats.upcoming} à venir`
                  : "tous passés"
              }
            />
            <StatBox label="Réalisés" value={stats.past} />
            <StatBox label="À venir" value={stats.upcoming} highlight />
            <StatBox
              label="Destinations"
              value={stats.destinations.length}
              hint={stats.destinations.slice(0, 2).join(", ") || "—"}
            />
          </div>

          {/* Layout 2 colonnes : infos / timeline */}
          <div className="mt-10 grid gap-8 lg:grid-cols-[320px_1fr]">
            {/* Colonne gauche : infos client */}
            <div className="space-y-5">
              <Section title="Coordonnées">
                {editing ? (
                  <div className="space-y-3">
                    <FieldEdit
                      icon={Mail}
                      type="email"
                      value={draft.email ?? ""}
                      onChange={(v) =>
                        setDraft({ ...draft, email: v || null })
                      }
                      placeholder="email@…"
                    />
                    <FieldEdit
                      icon={Phone}
                      type="tel"
                      value={draft.phone ?? ""}
                      onChange={(v) =>
                        setDraft({ ...draft, phone: v || null })
                      }
                      placeholder="+33…"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <FieldEdit
                        icon={MapPin}
                        value={draft.city ?? ""}
                        onChange={(v) =>
                          setDraft({ ...draft, city: v || null })
                        }
                        placeholder="Ville"
                      />
                      <FieldEdit
                        value={draft.country ?? ""}
                        onChange={(v) =>
                          setDraft({ ...draft, country: v || null })
                        }
                        placeholder="Pays"
                      />
                    </div>
                    <label className="flex items-center gap-2 text-[12.5px]">
                      <input
                        type="checkbox"
                        checked={draft.vip}
                        onChange={(e) =>
                          setDraft({ ...draft, vip: e.target.checked })
                        }
                        className="h-4 w-4 rounded border-border"
                      />
                      Client VIP
                    </label>
                  </div>
                ) : (
                  <div className="space-y-2 text-[13.5px]">
                    {client.email ? (
                      <a
                        href={`mailto:${client.email}`}
                        className="flex items-center gap-2 text-foreground/85 hover:text-primary"
                      >
                        <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        {client.email}
                      </a>
                    ) : (
                      <p className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-3.5 w-3.5 shrink-0" />—
                      </p>
                    )}
                    {client.phone ? (
                      <a
                        href={`tel:${client.phone}`}
                        className="flex items-center gap-2 text-foreground/85 hover:text-primary"
                      >
                        <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        {client.phone}
                      </a>
                    ) : (
                      <p className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-3.5 w-3.5 shrink-0" />—
                      </p>
                    )}
                    {(client.city || client.country) && (
                      <p className="flex items-center gap-2 text-foreground/85">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        {[client.city, client.country]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    )}
                  </div>
                )}
              </Section>

              <Section title="Tags">
                {editing ? (
                  <TagEditor
                    tags={draft.tags}
                    onChange={(t) => setDraft({ ...draft, tags: t })}
                  />
                ) : client.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {client.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-primary-soft px-2.5 py-0.5 text-[11.5px] font-medium text-primary"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[12.5px] italic text-muted-foreground">
                    Aucun tag
                  </p>
                )}
              </Section>

              <Section title="Notes privées">
                {editing ? (
                  <Textarea
                    value={draft.notes ?? ""}
                    onChange={(e) =>
                      setDraft({ ...draft, notes: e.target.value || null })
                    }
                    placeholder="Préférences, contraintes, anniversaires, anecdotes…"
                    rows={5}
                    className="text-[13px]"
                  />
                ) : client.notes ? (
                  <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground/85">
                    {client.notes}
                  </p>
                ) : (
                  <p className="text-[12.5px] italic text-muted-foreground">
                    Aucune note. Cliquez "Modifier" pour en ajouter.
                  </p>
                )}
              </Section>

              <div className="flex flex-col gap-2 pt-2">
                <Link
                  to="/new"
                  search={{ client_id: client.id } as any}
                >
                  <Button className="w-full gap-1.5 rounded-full">
                    <Sparkles className="h-3.5 w-3.5" />
                    Créer un roadbook pour ce client
                  </Button>
                </Link>
                <Link
                  to="/briefs"
                  search={{ client_id: client.id } as any}
                >
                  <Button
                    variant="outline"
                    className="w-full gap-1.5 rounded-full"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Lui envoyer un brief
                  </Button>
                </Link>
              </div>
            </div>

            {/* Colonne droite : timeline */}
            <div>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                Historique
              </h2>
              {timeline.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-border bg-surface/40 px-6 py-12 text-center">
                  <Calendar className="mx-auto h-6 w-6 text-muted-foreground/50" />
                  <p className="mt-3 text-[13px] text-muted-foreground">
                    Pas encore de voyage ni de brief pour ce client.
                  </p>
                </div>
              ) : (
                <ol className="mt-5 space-y-3">
                  {timeline.map((item, i) => (
                    <li key={i}>
                      {item.kind === "roadbook" ? (
                        <RoadbookTimelineItem rb={item.data} />
                      ) : (
                        <BriefTimelineItem brief={item.data} />
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </div>
      </div>

      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        clientName={client.display_name}
        onConfirm={handleDelete}
        roadbookCount={roadbooks.length}
      />
    </AppShell>
  );
}

/* ---------- Sub components ---------- */

function StatBox({
  label,
  value,
  hint,
  highlight,
}: {
  label: string;
  value: number;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-surface px-5 py-4 shadow-soft",
        highlight ? "border-primary/40" : "border-border/60",
      )}
    >
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="font-display mt-2 text-[28px] font-semibold leading-none text-foreground">
        {value}
      </p>
      {hint && (
        <p className="mt-1.5 truncate text-[11px] text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-accent-warm">
        {title}
      </h3>
      <div className="mt-3 rounded-xl border border-border/60 bg-surface p-4 shadow-soft">
        {children}
      </div>
    </section>
  );
}

function FieldEdit({
  icon: Icon,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  icon?: React.ComponentType<{ className?: string }>;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="relative">
      {Icon && (
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      )}
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn("h-9 text-[13px]", Icon ? "pl-9" : "")}
      />
    </div>
  );
}

function TagEditor({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [input, setInput] = useState("");
  const add = (raw: string) => {
    const t = raw.trim().slice(0, 40);
    if (!t || tags.includes(t)) return;
    onChange([...tags, t]);
    setInput("");
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1.5">
      {tags.map((t) => (
        <span
          key={t}
          className="flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-medium text-primary"
        >
          {t}
          <button
            type="button"
            onClick={() => onChange(tags.filter((x) => x !== t))}
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add(input);
          }
        }}
        onBlur={() => input && add(input)}
        placeholder={tags.length === 0 ? "Ajouter un tag…" : ""}
        className="flex-1 bg-transparent text-[12.5px] outline-none"
      />
    </div>
  );
}

function RoadbookTimelineItem({ rb }: { rb: RoadbookSummary }) {
  return (
    <Link
      to="/roadbook/$id"
      params={{ id: rb.id }}
      className="group block rounded-xl border border-border/60 bg-surface p-4 shadow-soft transition hover:border-border hover:shadow-soft-md"
    >
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="truncate font-display text-[15px] font-semibold text-foreground">
              {rb.destination}
            </h4>
            <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground/50 group-hover:text-primary" />
          </div>
          <p className="mt-0.5 text-[11.5px] text-muted-foreground">
            {rb.start_date && rb.end_date
              ? `${formatDate(rb.start_date)} → ${formatDate(rb.end_date)}`
              : `Créé le ${formatDate(rb.created_at)}`}
            {rb.theme && ` · ${rb.theme}`}
          </p>
        </div>
      </div>
    </Link>
  );
}

function BriefTimelineItem({ brief }: { brief: BriefSummary }) {
  const status = {
    pending: { label: "Brief en attente", cls: "bg-muted text-muted-foreground" },
    completed: {
      label: "Brief reçu",
      cls: "bg-primary-soft text-primary",
    },
    used: { label: "Brief utilisé", cls: "bg-accent-warm-soft text-foreground" },
  }[brief.status];

  return (
    <div className="rounded-xl border border-border/60 bg-surface/60 p-4">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted">
          <Send className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="truncate text-[14px] font-medium text-foreground">
              {brief.destination_hint || "Brief client"}
            </h4>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                status.cls,
              )}
            >
              {status.label}
            </span>
          </div>
          <p className="mt-0.5 text-[11.5px] text-muted-foreground">
            Envoyé le {formatDate(brief.created_at)}
            {brief.completed_at &&
              ` · Reçu le ${formatDate(brief.completed_at)}`}
          </p>
        </div>
      </div>
    </div>
  );
}

function DeleteDialog({
  open,
  onOpenChange,
  clientName,
  onConfirm,
  roadbookCount,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  clientName: string;
  onConfirm: () => void;
  roadbookCount: number;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <DialogTitle>Supprimer ce client ?</DialogTitle>
          </div>
          <DialogDescription className="pt-2 text-[13px] leading-relaxed">
            La fiche de <strong>{clientName}</strong> sera supprimée
            définitivement.
            {roadbookCount > 0 && (
              <>
                {" "}
                Ses <strong>{roadbookCount} roadbook(s)</strong> seront
                conservés mais détachés de la fiche.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button variant="destructive" onClick={onConfirm} className="gap-1.5">
            <Trash2 className="h-3.5 w-3.5" />
            Supprimer
          </Button>
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
