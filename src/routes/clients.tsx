import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Plus,
  Search,
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  Star,
  Calendar,
  Users as UsersIcon,
  X,
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

export const Route = createFileRoute("/clients")({
  component: ClientsPage,
  head: () => ({ meta: [{ title: "Clients — Roadbook.ai" }] }),
});

interface Client {
  id: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  tags: string[];
  vip: boolean;
  created_at: string;
  updated_at: string;
  roadbook_count: number;
  last_destination: string | null;
  last_trip_at: string | null;
}

function ClientsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [vipOnly, setVipOnly] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const refresh = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;
    const res = await fetch("/api/client-list", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      toast.error(data?.error || "Erreur");
      setLoading(false);
      return;
    }
    setClients(data.clients || []);
    setLoading(false);
  };

  useEffect(() => {
    if (authLoading || !user) return;
    refresh();
  }, [user, authLoading]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const c of clients) for (const t of c.tags) set.add(t);
    return Array.from(set).sort();
  }, [clients]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients.filter((c) => {
      if (vipOnly && !c.vip) return false;
      if (tagFilter && !c.tags.includes(tagFilter)) return false;
      if (q) {
        const hay = [
          c.display_name,
          c.email,
          c.phone,
          c.city,
          c.country,
          c.last_destination,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [clients, query, vipOnly, tagFilter]);

  const handleCreate = async (form: {
    display_name: string;
    email: string;
    phone: string;
    tags: string[];
    vip: boolean;
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
    const res = await fetch("/api/client-create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        display_name: form.display_name,
        email: form.email || null,
        phone: form.phone || null,
        tags: form.tags,
        vip: form.vip,
      }),
    });
    const data = await res.json().catch(() => null);
    setCreating(false);
    if (!res.ok) {
      toast.error(data?.error || "Erreur création");
      return;
    }
    setCreateOpen(false);
    toast.success("Client créé");
    await refresh();
    navigate({ to: "/clients/$id", params: { id: data.id } });
  };

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
              <span className="eyebrow">Carnet d'adresses</span>
            </div>
            <h1 className="font-display mt-5 text-[42px] font-semibold leading-[1.05] tracking-tight text-foreground sm:text-[52px]">
              Vos clients
            </h1>
            <p className="mt-5 max-w-2xl text-[15.5px] leading-relaxed text-muted-foreground">
              Toute votre relation client en un endroit. Historique des
              voyages, préférences, notes privées — pour offrir un service
              vraiment sur mesure à chaque retour.
            </p>
          </div>
          <Button
            onClick={() => setCreateOpen(true)}
            className="h-11 gap-2 rounded-full px-6"
          >
            <Plus className="h-4 w-4" />
            Nouveau client
          </Button>
        </div>

        {/* Filtres */}
        {clients.length > 0 && (
          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher nom, email, ville…"
                className="h-11 rounded-full border-border/70 bg-surface pl-11 text-[14px]"
              />
            </div>
            <button
              type="button"
              onClick={() => setVipOnly((v) => !v)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[12.5px] font-medium transition",
                vipOnly
                  ? "border-accent-warm bg-accent-warm-soft text-foreground"
                  : "border-border/60 bg-surface text-muted-foreground hover:text-foreground",
              )}
            >
              <Star
                className={cn(
                  "h-3.5 w-3.5",
                  vipOnly ? "fill-accent-warm text-accent-warm" : "",
                )}
              />
              VIP uniquement
            </button>
            {allTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1">
                {allTags.slice(0, 8).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      setTagFilter(tagFilter === t ? null : t)
                    }
                    className={cn(
                      "rounded-full border px-3 py-1 text-[11.5px] font-medium transition",
                      tagFilter === t
                        ? "border-primary bg-primary-soft text-primary"
                        : "border-border/60 bg-surface text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t}
                  </button>
                ))}
                {tagFilter && (
                  <button
                    type="button"
                    onClick={() => setTagFilter(null)}
                    className="text-muted-foreground hover:text-foreground"
                    title="Effacer le filtre"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Liste / empty state */}
        <div className="mt-10">
          {clients.length === 0 ? (
            <EmptyState onCreate={() => setCreateOpen(true)} />
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface/40 px-8 py-12 text-center text-muted-foreground">
              Aucun client ne correspond à ces filtres.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((c) => (
                <ClientCard key={c.id} client={c} />
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateClientDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
        submitting={creating}
      />
    </AppShell>
  );
}

/* ---------- Client card ---------- */

function ClientCard({ client }: { client: Client }) {
  const initials = (client.display_name || "?")
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Link
      to="/clients/$id"
      params={{ id: client.id }}
      className="group rounded-2xl border border-border/60 bg-surface p-5 shadow-soft transition hover:border-border hover:shadow-soft-md"
    >
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary-soft text-[14px] font-semibold text-primary">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate font-display text-[16px] font-semibold text-foreground">
              {client.display_name}
            </h3>
            {client.vip && (
              <Star className="h-3.5 w-3.5 shrink-0 fill-accent-warm text-accent-warm" />
            )}
          </div>
          <div className="mt-1 space-y-0.5 text-[12px] text-muted-foreground">
            {client.email && (
              <p className="flex items-center gap-1 truncate">
                <Mail className="h-3 w-3 shrink-0" />
                <span className="truncate">{client.email}</span>
              </p>
            )}
            {(client.city || client.country) && (
              <p className="flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">
                  {[client.city, client.country].filter(Boolean).join(", ")}
                </span>
              </p>
            )}
          </div>
        </div>
      </div>

      {client.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {client.tags.slice(0, 4).map((t) => (
            <span
              key={t}
              className="rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground"
            >
              {t}
            </span>
          ))}
          {client.tags.length > 4 && (
            <span className="text-[10.5px] text-muted-foreground">
              +{client.tags.length - 4}
            </span>
          )}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3">
        <span className="text-[11.5px] text-muted-foreground">
          {client.roadbook_count === 0
            ? "Aucun voyage"
            : client.roadbook_count === 1
              ? "1 voyage"
              : `${client.roadbook_count} voyages`}
        </span>
        {client.last_destination && (
          <span className="truncate text-[11.5px] font-medium text-foreground/85">
            Dernier : {client.last_destination}
          </span>
        )}
      </div>
    </Link>
  );
}

/* ---------- Empty state ---------- */

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface/50 px-8 py-16 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary-soft text-primary">
        <UsersIcon className="h-6 w-6" />
      </div>
      <h2 className="font-display mt-6 text-[24px] font-semibold leading-tight text-foreground">
        Pas encore de client
      </h2>
      <p className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-muted-foreground">
        Créez votre carnet d'adresses pour suivre l'historique de chaque
        voyageur, leurs préférences et leurs voyages passés.
      </p>
      <Button onClick={onCreate} className="mt-6 h-11 gap-2 rounded-full px-6">
        <Plus className="h-4 w-4" />
        Créer mon premier client
      </Button>
    </div>
  );
}

/* ---------- Create dialog ---------- */

function CreateClientDialog({
  open,
  onOpenChange,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSubmit: (f: {
    display_name: string;
    email: string;
    phone: string;
    tags: string[];
    vip: boolean;
  }) => void;
  submitting: boolean;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [vip, setVip] = useState(false);

  useEffect(() => {
    if (!open) {
      setName("");
      setEmail("");
      setPhone("");
      setTags([]);
      setTagInput("");
      setVip(false);
    }
  }, [open]);

  const addTag = (raw: string) => {
    const t = raw.trim().slice(0, 40);
    if (!t || tags.includes(t)) return;
    setTags((arr) => [...arr, t]);
    setTagInput("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nouveau client</DialogTitle>
          <DialogDescription>
            Vous pourrez ajouter plus de détails (ville, notes…) depuis sa
            fiche après création.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) {
              toast.error("Le nom est obligatoire");
              return;
            }
            onSubmit({
              display_name: name.trim(),
              email: email.trim(),
              phone: phone.trim(),
              tags,
              vip,
            });
          }}
          className="space-y-3"
        >
          <div>
            <Label className="text-sm font-medium">Nom du client *</Label>
            <div className="relative mt-1.5">
              <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Marie & Paul Dupont"
                required
                className="h-10 pl-9"
                autoFocus
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-medium">Email</Label>
              <div className="relative mt-1.5">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="marie@…"
                  className="h-10 pl-9"
                />
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Téléphone</Label>
              <div className="relative mt-1.5">
                <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+33 6…"
                  className="h-10 pl-9"
                />
              </div>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Tags</Label>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1.5">
              {tags.map((t) => (
                <span
                  key={t}
                  className="flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[11.5px] font-medium text-primary"
                >
                  {t}
                  <button
                    type="button"
                    onClick={() => setTags((arr) => arr.filter((x) => x !== t))}
                    className="hover:text-foreground"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addTag(tagInput);
                  } else if (e.key === "Backspace" && !tagInput && tags.length) {
                    setTags((arr) => arr.slice(0, -1));
                  }
                }}
                onBlur={() => tagInput && addTag(tagInput)}
                placeholder={
                  tags.length === 0 ? "VIP, Famille, Lune de miel…" : ""
                }
                className="flex-1 bg-transparent text-[13px] outline-none"
              />
            </div>
            <p className="mt-1 text-[11px] text-text-soft">
              Entrée ou virgule pour ajouter
            </p>
          </div>

          <label className="flex items-center gap-2 text-[13px] text-foreground/85">
            <input
              type="checkbox"
              checked={vip}
              onChange={(e) => setVip(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            <Star className="h-3.5 w-3.5 fill-accent-warm text-accent-warm" />
            Client VIP
          </label>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={submitting} className="gap-1.5">
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Créer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
