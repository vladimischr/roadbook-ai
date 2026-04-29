import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Fragment, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Download,
  Pencil,
  Check,
  X,
  Lightbulb,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { APIProvider } from "@vis.gl/react-google-maps";
import { useGoogleMapsKey } from "@/lib/useGoogleMapsKey";
import { RoadbookMap } from "@/components/RoadbookMap";
import { PlacesAutocompleteInput } from "@/components/PlacesAutocompleteInput";
import { geocodePlace } from "@/server/maps.functions";

export const Route = createFileRoute("/roadbook/$id")({
  component: RoadbookPage,
  head: () => ({ meta: [{ title: "Roadbook — Roadbook.ai" }] }),
});

interface Cover {
  title: string;
  subtitle: string;
  tagline: string;
  dates_label: string;
}
interface Day {
  day: number;
  date: string;
  stage: string;
  accommodation: string;
  type: string;
  distance_km: number;
  drive_hours: number;
  flight: string;
  narrative: string;
  lat?: number | null;
  lng?: number | null;
}
interface AccommodationSummary {
  name: string;
  location: string;
  nights: number;
  type: string;
}
interface Contact {
  role: string;
  name: string;
  phone: string;
  email?: string;
}
interface Roadbook {
  client_name: string;
  destination: string;
  start_date: string;
  end_date: string;
  duration_days?: number;
  travelers?: number;
  profile?: string;
  theme?: string;
  budget_range?: string;
  cover: Cover;
  overview: string;
  days: Day[];
  accommodations_summary: AccommodationSummary[];
  contacts: Contact[];
  tips: string[];
}

function formatShortDate(iso: string) {
  if (!iso) return "";
  if (iso.includes("/")) return iso;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function emptyDay(nextNum: number): Day {
  return {
    day: nextNum,
    date: "",
    stage: "",
    accommodation: "",
    type: "",
    distance_km: 0,
    drive_hours: 0,
    flight: "—",
    narrative: "",
  };
}

function emptyAccommodation(): AccommodationSummary {
  return { name: "", location: "", nights: 1, type: "Lodge" };
}

function emptyContact(): Contact {
  return { role: "", name: "", phone: "", email: "" };
}

function RoadbookPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [rb, setRb] = useState<Roadbook | null>(null);
  const [loading, setLoading] = useState(true);
  const { apiKey } = useGoogleMapsKey();
  const rbRef = useRef<Roadbook | null>(null);
  rbRef.current = rb;

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    supabase
      .from("roadbooks")
      .select("content,destination")
      .eq("id", id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          toast.error("Roadbook introuvable");
          navigate({ to: "/dashboard" });
          return;
        }
        const content = data.content as unknown as Roadbook;
        // Garantit que la destination est dans l'objet pour le bias géo
        if (!content.destination && data.destination) {
          content.destination = data.destination;
        }
        setRb(content);
        setLoading(false);
      });
  }, [id, user, authLoading, navigate]);

  const persist = async (next: Roadbook) => {
    setRb(next);
    const { error } = await supabase
      .from("roadbooks")
      .update({ content: next as any })
      .eq("id", id);
    if (error) {
      toast.error("Échec de la sauvegarde : " + error.message);
    } else {
      toast.success("Modifications enregistrées", { duration: 2000 });
    }
  };

  // Persistance silencieuse (sans toast) pour le géocodage rétroactif
  const persistSilent = async (next: Roadbook) => {
    setRb(next);
    const { error } = await supabase
      .from("roadbooks")
      .update({ content: next as any })
      .eq("id", id);
    if (error) console.error("Geocode persist failed:", error.message);
  };

  // Géocodage rétroactif des jours sans lat/lng
  useEffect(() => {
    if (!rb) return;
    const days = rb.days || [];
    const missing = days
      .map((d, idx) => ({ d, idx }))
      .filter(({ d }) => typeof d.lat !== "number" || typeof d.lng !== "number")
      .filter(({ d }) => (d.stage || d.accommodation || "").trim().length > 0);
    if (missing.length === 0) return;

    let cancelled = false;
    (async () => {
      let working = rbRef.current;
      if (!working) return;
      for (const { idx } of missing) {
        if (cancelled) return;
        const day = working.days[idx];
        if (!day) continue;
        if (typeof day.lat === "number" && typeof day.lng === "number") continue;
        const query = (day.stage || day.accommodation || "").trim();
        if (!query) continue;
        try {
          const res = await geocodePlace({
            data: { query, region: working.destination },
          });
          if (cancelled) return;
          if (res.lat == null || res.lng == null) {
            console.warn(
              `[map] Géocodage impossible pour J${day.day} : "${query}"`,
            );
            continue;
          }
          const nextDays: Day[] = working.days.map((d, i) =>
            i === idx ? { ...d, lat: res.lat, lng: res.lng } : d,
          );
          working = { ...working, days: nextDays };
          await persistSilent(working);
        } catch (e) {
          console.error("Geocode error:", e);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rb?.days?.length, id]);

  if (authLoading || loading || !rb) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const content = (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Retour au tableau de bord
            </Button>
          </Link>
          <Button
            size="sm"
            onClick={() => {
              toast.info("Génération du PDF en cours…", { duration: 2500 });
              const url = `/roadbook/${id}/print?auto=1`;
              window.open(url, "_blank", "noopener,noreferrer");
            }}
            className="gap-2"
          >
            <Download className="h-4 w-4" /> Exporter en PDF
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <CoverSection cover={rb.cover} onSave={(cover) => persist({ ...rb, cover })} />

          <div className="space-y-14 px-8 py-12 sm:px-14">
            <EditableTextSection
              label="Vue d'ensemble"
              value={rb.overview}
              onSave={(overview) => persist({ ...rb, overview })}
            />

            <section>
              <h2 className="mb-5 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                Tracé du voyage
              </h2>
              {apiKey ? (
                <RoadbookMap days={rb.days || []} />
              ) : (
                <div className="grid h-[450px] place-items-center rounded-xl border border-dashed border-border bg-secondary/30 text-sm text-muted-foreground">
                  Chargement de la carte…
                </div>
              )}
            </section>

            <DaysTableSection
              days={rb.days || []}
              regionBias={rb.destination}
              onSave={(days) => persist({ ...rb, days })}
            />

            <AccommodationsSection
              items={rb.accommodations_summary || []}
              regionBias={rb.destination}
              onSave={(accommodations_summary) =>
                persist({ ...rb, accommodations_summary })
              }
            />

            <ContactsSection
              contacts={rb.contacts || []}
              regionBias={rb.destination}
              onSave={(contacts) => persist({ ...rb, contacts })}
            />

            <TipsSection tips={rb.tips || []} onSave={(tips) => persist({ ...rb, tips })} />
          </div>
        </article>
      </main>
    </div>
  );

  if (!apiKey) return content;
  return (
    <APIProvider apiKey={apiKey} libraries={["places", "marker"]}>
      {content}
    </APIProvider>
  );
}

/* ---------- Section header ---------- */

function SectionHeader({
  label,
  editing,
  onEdit,
  onSave,
  onCancel,
}: {
  label: string;
  editing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="mb-5 flex items-center justify-between">
      <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
        {label}
      </h2>
      {editing ? (
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={onCancel} className="gap-1.5 text-muted-foreground">
            <X className="h-3.5 w-3.5" /> Annuler
          </Button>
          <Button size="sm" onClick={onSave} className="gap-1.5">
            <Check className="h-3.5 w-3.5" /> Enregistrer
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="ghost" onClick={onEdit} className="gap-1.5 text-muted-foreground hover:text-primary">
          <Pencil className="h-3.5 w-3.5" /> Modifier
        </Button>
      )}
    </div>
  );
}

/* ---------- Cover ---------- */

function CoverSection({ cover, onSave }: { cover: Cover; onSave: (c: Cover) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(cover);

  if (editing) {
    return (
      <div className="relative bg-[#0F6E56] px-8 py-20 text-white sm:px-14">
        <div className="absolute right-6 top-6 flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setDraft(cover);
              setEditing(false);
            }}
            className="gap-1.5 text-white/90 hover:bg-white/15 hover:text-white"
          >
            <X className="h-3.5 w-3.5" /> Annuler
          </Button>
          <Button
            size="sm"
            onClick={() => {
              onSave(draft);
              setEditing(false);
            }}
            className="gap-1.5 bg-white text-[#0F6E56] hover:bg-white/90"
          >
            <Check className="h-3.5 w-3.5" /> Enregistrer
          </Button>
        </div>
        <div className="mx-auto max-w-3xl space-y-3 pt-10">
          <Input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            className="border-white/30 bg-white/15 text-2xl font-bold text-white placeholder:text-white/60"
          />
          <Input
            value={draft.subtitle}
            onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })}
            className="border-white/30 bg-white/15 text-white placeholder:text-white/60"
          />
          <Input
            value={draft.tagline}
            onChange={(e) => setDraft({ ...draft, tagline: e.target.value })}
            className="border-white/30 bg-white/15 text-white placeholder:text-white/60"
          />
          <Input
            value={draft.dates_label}
            onChange={(e) => setDraft({ ...draft, dates_label: e.target.value })}
            className="border-white/30 bg-white/15 text-white placeholder:text-white/60"
          />
        </div>
      </div>
    );
  }

  return (
    <section className="relative bg-[#0F6E56] px-8 py-20 text-center text-white">
      <div className="absolute right-6 top-6">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setEditing(true)}
          className="gap-1.5 text-white/90 hover:bg-white/15 hover:text-white"
        >
          <Pencil className="h-3.5 w-3.5" /> Modifier
        </Button>
      </div>
      <p className="mb-6 text-xs uppercase tracking-widest opacity-80">Carnet de voyage</p>
      <h1 className="mb-4 text-7xl font-semibold leading-tight">{cover.title}</h1>
      <p className="mb-3 text-2xl">{cover.subtitle}</p>
      <p className="mb-6 text-lg italic opacity-85">{cover.tagline}</p>
      <span className="inline-block rounded-full bg-white/15 px-5 py-2 text-sm">
        {cover.dates_label}
      </span>
    </section>
  );
}

/* ---------- Editable plain text ---------- */

function EditableTextSection({
  label,
  value,
  onSave,
}: {
  label: string;
  value: string;
  onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  return (
    <section>
      <SectionHeader
        label={label}
        editing={editing}
        onEdit={() => {
          setDraft(value);
          setEditing(true);
        }}
        onSave={() => {
          onSave(draft);
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />
      {editing ? (
        <Textarea rows={6} value={draft} onChange={(e) => setDraft(e.target.value)} />
      ) : (
        <p className="text-base leading-relaxed text-foreground/85">{value}</p>
      )}
    </section>
  );
}

/* ---------- Days table ---------- */

function renumberDays(list: Day[]): Day[] {
  return list.map((d, i) => ({ ...d, day: i + 1 }));
}

function DaysTableSection({ days, onSave }: { days: Day[]; onSave: (d: Day[]) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(days);

  const update = (i: number, patch: Partial<Day>) =>
    setDraft((d) => d.map((day, idx) => (idx === i ? { ...day, ...patch } : day)));

  const remove = (i: number) =>
    setDraft((d) => renumberDays(d.filter((_, idx) => idx !== i)));

  const add = () =>
    setDraft((d) => renumberDays([...d, emptyDay(d.length + 1)]));

  const list = editing ? draft : days;

  return (
    <section>
      <SectionHeader
        label="Itinéraire jour par jour"
        editing={editing}
        onEdit={() => {
          setDraft(days);
          setEditing(true);
        }}
        onSave={() => {
          onSave(renumberDays(draft));
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-3 w-12">Jour</th>
              <th className="px-3 py-3 w-20">Date</th>
              <th className="px-3 py-3">Étape</th>
              <th className="px-3 py-3">Hébergement</th>
              <th className="px-3 py-3 w-28">Type</th>
              <th className="px-3 py-3">Vols / Transport</th>
              <th className="px-3 py-3 w-24 text-right">Distance</th>
              <th className="px-3 py-3 w-20 text-right">Route</th>
              {editing && <th className="px-2 py-3 w-10" />}
            </tr>
          </thead>
          <tbody>
            {list.map((d, i) => (
              <Fragment key={`day-${i}`}>
                <tr className={i % 2 === 1 ? "bg-secondary/25" : ""}>
                  <td className="px-3 py-3 font-semibold text-primary">J{d.day}</td>
                  <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
                    {editing ? (
                      <Input value={d.date} onChange={(e) => update(i, { date: e.target.value })} className="h-8" />
                    ) : (
                      formatShortDate(d.date)
                    )}
                  </td>
                  <td className="px-3 py-3 font-medium">
                    {editing ? (
                      <Input value={d.stage} onChange={(e) => update(i, { stage: e.target.value })} className="h-8" />
                    ) : (
                      d.stage
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {editing ? (
                      <Input value={d.accommodation} onChange={(e) => update(i, { accommodation: e.target.value })} className="h-8" />
                    ) : (
                      d.accommodation
                    )}
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {editing ? (
                      <Input value={d.type} onChange={(e) => update(i, { type: e.target.value })} className="h-8" />
                    ) : (
                      d.type
                    )}
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {editing ? (
                      <Input value={d.flight} onChange={(e) => update(i, { flight: e.target.value })} className="h-8" />
                    ) : (
                      d.flight
                    )}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {editing ? (
                      <Input
                        type="number"
                        value={d.distance_km}
                        onChange={(e) => update(i, { distance_km: parseInt(e.target.value) || 0 })}
                        className="h-8 w-20 ml-auto text-right"
                      />
                    ) : (
                      <span>{d.distance_km} km</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {editing ? (
                      <Input
                        type="number"
                        value={d.drive_hours}
                        onChange={(e) => update(i, { drive_hours: parseInt(e.target.value) || 0 })}
                        className="h-8 w-16 ml-auto text-right"
                      />
                    ) : (
                      <span>{d.drive_hours} h</span>
                    )}
                  </td>
                  {editing && (
                    <td className="px-2 py-3 align-top">
                      <button
                        type="button"
                        onClick={() => remove(i)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Supprimer ce jour"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
                <tr className={i % 2 === 1 ? "bg-secondary/25" : ""}>
                  <td colSpan={editing ? 9 : 8} className="px-3 pb-4 pt-0 italic text-foreground/70">
                    {editing ? (
                      <Textarea
                        rows={2}
                        value={d.narrative}
                        onChange={(e) => update(i, { narrative: e.target.value })}
                        className="italic"
                      />
                    ) : (
                      d.narrative
                    )}
                  </td>
                </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <Button type="button" variant="outline" size="sm" onClick={add} className="mt-3 gap-2">
          <Plus className="h-3.5 w-3.5" /> Ajouter une étape
        </Button>
      )}
    </section>
  );
}

/* ---------- Accommodations ---------- */

function AccommodationsSection({
  items,
  onSave,
}: {
  items: AccommodationSummary[];
  onSave: (a: AccommodationSummary[]) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(items);
  const update = (i: number, patch: Partial<AccommodationSummary>) =>
    setDraft((d) => d.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
  const remove = (i: number) => setDraft((d) => d.filter((_, idx) => idx !== i));
  const add = () => setDraft((d) => [...d, emptyAccommodation()]);

  const list = editing ? draft : items;

  return (
    <section>
      <SectionHeader
        label="Hébergements"
        editing={editing}
        onEdit={() => {
          setDraft(items);
          setEditing(true);
        }}
        onSave={() => {
          onSave(draft);
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Lodge / Camp</th>
              <th className="px-4 py-3">Localisation</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3 text-right w-20">Nuits</th>
              {editing && <th className="px-2 py-3 w-10" />}
            </tr>
          </thead>
          <tbody>
            {list.map((a, i) => (
              <tr key={i} className={i % 2 === 1 ? "bg-secondary/25" : ""}>
                <td className="px-4 py-3 font-medium">
                  {editing ? (
                    <Input value={a.name} onChange={(e) => update(i, { name: e.target.value })} className="h-8" />
                  ) : (
                    a.name
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {editing ? (
                    <Input value={a.location} onChange={(e) => update(i, { location: e.target.value })} className="h-8" />
                  ) : (
                    a.location
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {editing ? (
                    <Input value={a.type} onChange={(e) => update(i, { type: e.target.value })} className="h-8" />
                  ) : (
                    a.type
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {editing ? (
                    <Input
                      type="number"
                      min={1}
                      value={a.nights}
                      onChange={(e) => update(i, { nights: parseInt(e.target.value) || 1 })}
                      className="h-8 w-16 ml-auto text-right"
                    />
                  ) : (
                    a.nights
                  )}
                </td>
                {editing && (
                  <td className="px-2 py-3">
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Supprimer cet hébergement"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <Button type="button" variant="outline" size="sm" onClick={add} className="mt-3 gap-2">
          <Plus className="h-3.5 w-3.5" /> Ajouter un hébergement
        </Button>
      )}
    </section>
  );
}

/* ---------- Contacts ---------- */

function ContactsSection({
  contacts,
  onSave,
}: {
  contacts: Contact[];
  onSave: (c: Contact[]) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(contacts);
  const update = (i: number, patch: Partial<Contact>) =>
    setDraft((d) => d.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const remove = (i: number) => setDraft((d) => d.filter((_, idx) => idx !== i));
  const add = () => setDraft((d) => [...d, emptyContact()]);

  const list = editing ? draft : contacts;

  return (
    <section>
      <SectionHeader
        label="Contacts pratiques"
        editing={editing}
        onEdit={() => {
          setDraft(contacts);
          setEditing(true);
        }}
        onSave={() => {
          onSave(draft);
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Rôle</th>
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">Téléphone</th>
              <th className="px-4 py-3">Courriel</th>
              {editing && <th className="px-2 py-3 w-10" />}
            </tr>
          </thead>
          <tbody>
            {list.map((c, i) => (
              <tr key={i} className={i % 2 === 1 ? "bg-secondary/25" : ""}>
                <td className="px-4 py-3 text-muted-foreground">
                  {editing ? (
                    <Input value={c.role} onChange={(e) => update(i, { role: e.target.value })} className="h-8" />
                  ) : (
                    c.role
                  )}
                </td>
                <td className="px-4 py-3 font-medium">
                  {editing ? (
                    <Input value={c.name} onChange={(e) => update(i, { name: e.target.value })} className="h-8" />
                  ) : (
                    c.name
                  )}
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {editing ? (
                    <Input value={c.phone} onChange={(e) => update(i, { phone: e.target.value })} className="h-8" />
                  ) : (
                    c.phone
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {editing ? (
                    <Input value={c.email ?? ""} onChange={(e) => update(i, { email: e.target.value })} className="h-8" />
                  ) : (
                    c.email || "—"
                  )}
                </td>
                {editing && (
                  <td className="px-2 py-3">
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Supprimer ce contact"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <Button type="button" variant="outline" size="sm" onClick={add} className="mt-3 gap-2">
          <Plus className="h-3.5 w-3.5" /> Ajouter un contact
        </Button>
      )}
    </section>
  );
}

/* ---------- Tips ---------- */

function TipsSection({ tips, onSave }: { tips: string[]; onSave: (t: string[]) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>(tips);

  const update = (i: number, v: string) =>
    setDraft((d) => d.map((t, idx) => (idx === i ? v : t)));
  const remove = (i: number) => setDraft((d) => d.filter((_, idx) => idx !== i));
  const add = () => setDraft((d) => [...d, ""]);

  return (
    <section>
      <SectionHeader
        label="Conseils & recommandations"
        editing={editing}
        onEdit={() => {
          setDraft(tips);
          setEditing(true);
        }}
        onSave={() => {
          onSave(draft.map((t) => t.trim()).filter(Boolean));
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />

      {editing ? (
        <div className="space-y-2">
          {draft.map((t, i) => (
            <div key={i} className="flex items-start gap-2">
              <Lightbulb className="mt-2.5 h-4 w-4 shrink-0 text-primary" />
              <Textarea
                rows={2}
                value={t}
                onChange={(e) => update(i, e.target.value)}
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => remove(i)}
                className="mt-2 text-muted-foreground hover:text-destructive"
                aria-label="Supprimer ce conseil"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={add} className="gap-2">
            <Plus className="h-3.5 w-3.5" /> Ajouter un conseil
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {tips.map((t, i) => (
            <li key={i} className="flex gap-3 text-sm leading-relaxed text-foreground/85">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
