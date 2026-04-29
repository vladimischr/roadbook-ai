import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
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
  GripVertical,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { APIProvider } from "@vis.gl/react-google-maps";
import { useGoogleMapsKey } from "@/lib/useGoogleMapsKey";
import { RoadbookMap, type DirectionsSegment } from "@/components/RoadbookMap";
import { PlacesAutocompleteInput, type PlaceSelection } from "@/components/PlacesAutocompleteInput";
import { geocodePlace } from "@/server/maps.functions";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
  narrative_user_modified?: boolean;
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
  travel_mode?: string;
  budget_range?: string;
  cover: Cover;
  overview: string;
  days: Day[];
  accommodations_summary: AccommodationSummary[];
  contacts: Contact[];
  tips: string[];
  directions_segments?: DirectionsSegment[];
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

function renumberDays(list: Day[]): Day[] {
  return list.map((d, i) => ({ ...d, day: i + 1 }));
}

/* ---------- Page ---------- */

function RoadbookPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [rb, setRb] = useState<Roadbook | null>(null);
  const [loading, setLoading] = useState(true);
  const [globalEdit, setGlobalEdit] = useState(false);
  const [recomputeOpen, setRecomputeOpen] = useState(false);
  const [preserveModified, setPreserveModified] = useState(true);
  const [recomputing, setRecomputing] = useState(false);
  const { apiKey } = useGoogleMapsKey();
  const rbRef = useRef<Roadbook | null>(null);
  rbRef.current = rb;

  // Auto-save debounce
  const dirtyRef = useRef<Roadbook | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        if (!content.destination && data.destination) {
          content.destination = data.destination;
        }
        setRb(content);
        setLoading(false);
      });
  }, [id, user, authLoading, navigate]);

  // Sauvegarde immédiate avec toast
  const persist = async (next: Roadbook) => {
    setRb(next);
    const { error } = await supabase
      .from("roadbooks")
      .update({ content: next as never })
      .eq("id", id);
    if (error) {
      toast.error("Échec de la sauvegarde : " + error.message);
    } else {
      toast.success("Modifications enregistrées", { duration: 1800 });
    }
  };

  // Sauvegarde silencieuse (géocodage, segments)
  const persistSilent = async (next: Roadbook) => {
    setRb(next);
    const { error } = await supabase
      .from("roadbooks")
      .update({ content: next as never })
      .eq("id", id);
    if (error) console.error("Silent persist failed:", error.message);
  };

  // Auto-save (debounce 2s) — déclenché par updateAndAutosave
  const updateAndAutosave = (next: Roadbook) => {
    setRb(next);
    dirtyRef.current = next;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const toSave = dirtyRef.current;
      if (!toSave) return;
      supabase
        .from("roadbooks")
        .update({ content: toSave as never })
        .eq("id", id)
        .then(({ error }) => {
          if (error) {
            toast.error("Échec auto-save : " + error.message);
          } else {
            toast.success("Modifications enregistrées", { duration: 1500 });
          }
        });
    }, 2000);
  };

  // Géocodage rétroactif
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
          if (res.lat == null || res.lng == null) continue;
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

  // Persistance segments cache (silencieuse)
  const handleSegmentsChange = (segs: DirectionsSegment[]) => {
    const cur = rbRef.current;
    if (!cur) return;
    persistSilent({ ...cur, directions_segments: segs });
  };

  // Invalide le cache directions_segments après une mutation structurelle des
  // jours (insert / remove / reorder / changement d'adresse). Comme les
  // segments sont keyés par numéro de jour et que la renumérotation réutilise
  // les mêmes numéros pour des étapes différentes, on purge tout le cache
  // touché. RouteRenderer recalculera via Directions API.
  const invalidateDirectionsCache = (rb: Roadbook): Roadbook => {
    return { ...rb, directions_segments: [] };
  };

  // Ajouter une étape depuis un PlaceSelection (autocomplete ou recherche carte).
  // Sauvegarde IMMÉDIATE en base — pas d'attente du bouton "Enregistrer".
  const addDayFromPlace = async (place: PlaceSelection, position: number | null) => {
    const cur = rbRef.current;
    if (!cur) return;
    const list = cur.days || [];
    const insertIdx = position === null ? list.length : Math.max(0, Math.min(position, list.length));
    const newDay: Day = {
      ...emptyDay(insertIdx + 1),
      stage: place.name,
      accommodation: "À définir",
      lat: place.lat ?? null,
      lng: place.lng ?? null,
    };
    const nextDays = renumberDays([
      ...list.slice(0, insertIdx),
      newDay,
      ...list.slice(insertIdx),
    ]);
    const next = invalidateDirectionsCache({ ...cur, days: nextDays });
    setRb(next);
    // Annule tout auto-save en attente pour ne pas écraser la mutation
    // qu'on vient de faire avec un draft obsolète.
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    dirtyRef.current = null;
    const { error } = await supabase
      .from("roadbooks")
      .update({ content: next as never })
      .eq("id", id);
    if (error) {
      toast.error("Échec de la sauvegarde : " + error.message);
    } else {
      toast.success("Étape ajoutée et enregistrée", { duration: 1500 });
    }
  };

  // Suppression d'une étape — sauvegarde immédiate également.
  const removeDayByNumber = async (dayNumber: number) => {
    const cur = rbRef.current;
    if (!cur) return;
    const nextDays = renumberDays((cur.days || []).filter((d) => d.day !== dayNumber));
    const next = invalidateDirectionsCache({ ...cur, days: nextDays });
    setRb(next);
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    dirtyRef.current = null;
    const { error } = await supabase
      .from("roadbooks")
      .update({ content: next as never })
      .eq("id", id);
    if (error) {
      toast.error("Échec de la sauvegarde : " + error.message);
    } else {
      toast.success("Étape supprimée et enregistrée", { duration: 1500 });
    }
  };

  // Recalcul IA — régénère narratives, dates, transitions
  const runRecompute = async () => {
    const cur = rbRef.current;
    if (!cur) return;
    setRecomputeOpen(false);
    setRecomputing(true);
    // Flush any pending auto-save
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    dirtyRef.current = null;
    try {
      const res = await fetch("/api/recompute-roadbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roadbook: cur,
          preserveModifiedNarratives: preserveModified,
        }),
      });
      const text = await res.text();
      if (!res.ok) {
        let msg = text;
        try {
          msg = JSON.parse(text).error || text;
        } catch {}
        toast.error("Échec du recalcul : " + msg.slice(0, 200));
        return;
      }
      const recomputed = JSON.parse(text) as Roadbook;
      // Préserve les coordonnées géocodées des étapes existantes par index
      if (Array.isArray(recomputed.days) && Array.isArray(cur.days)) {
        recomputed.days = recomputed.days.map((d, i) => {
          const orig = cur.days[i];
          if (
            orig &&
            (typeof d.lat !== "number" || typeof d.lng !== "number") &&
            typeof orig.lat === "number" &&
            typeof orig.lng === "number"
          ) {
            return { ...d, lat: orig.lat, lng: orig.lng };
          }
          return d;
        });
      }
      setRb(recomputed);
      const { error } = await supabase
        .from("roadbooks")
        .update({ content: recomputed as never })
        .eq("id", id);
      if (error) {
        toast.error("Sauvegarde échouée : " + error.message);
      } else {
        toast.success("Roadbook recalculé");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Erreur : " + msg);
    } finally {
      setRecomputing(false);
    }
  };

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
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={globalEdit ? "default" : "outline"}
              onClick={() => setGlobalEdit((v) => !v)}
              className="gap-2"
            >
              <Pencil className="h-3.5 w-3.5" />
              {globalEdit ? "Quitter l'édition" : "Tout modifier"}
            </Button>
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setRecomputeOpen(true)}
                    className="gap-2"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Recalculer avec l'IA
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  Régénère les narratives, dates et transitions en fonction de
                  tes modifications. Tes étapes restent intactes.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <CoverSection
            cover={rb.cover}
            theme={rb.theme}
            travelMode={rb.travel_mode}
            forceEdit={globalEdit}
            onSave={(cover) => persist({ ...rb, cover })}
            onAutoSave={(cover) => updateAndAutosave({ ...rb, cover })}
          />

          <div className="space-y-14 px-8 py-12 sm:px-14">
            <EditableTextSection
              label="Vue d'ensemble"
              value={rb.overview}
              forceEdit={globalEdit}
              onSave={(overview) => persist({ ...rb, overview })}
              onAutoSave={(overview) => updateAndAutosave({ ...rb, overview })}
            />

            <section>
              <h2 className="mb-5 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                Tracé du voyage
              </h2>
              {apiKey ? (
                <RoadbookMap
                  days={rb.days || []}
                  segments={rb.directions_segments ?? []}
                  onSegmentsChange={handleSegmentsChange}
                  regionBias={rb.destination}
                  onAddDay={addDayFromPlace}
                  onRemoveDay={removeDayByNumber}
                />
              ) : (
                <div className="grid h-[450px] place-items-center rounded-xl border border-dashed border-border bg-secondary/30 text-sm text-muted-foreground">
                  Chargement de la carte…
                </div>
              )}
            </section>

            <DaysTableSection
              days={rb.days || []}
              regionBias={rb.destination}
              forceEdit={globalEdit}
              onSave={(days) => persist({ ...rb, days })}
              onAutoSave={(days) => updateAndAutosave({ ...rb, days })}
              onAddDayFromPlace={addDayFromPlace}
            />

            <AccommodationsSection
              items={rb.accommodations_summary || []}
              regionBias={rb.destination}
              forceEdit={globalEdit}
              onSave={(accommodations_summary) =>
                persist({ ...rb, accommodations_summary })
              }
              onAutoSave={(accommodations_summary) =>
                updateAndAutosave({ ...rb, accommodations_summary })
              }
            />

            <ContactsSection
              contacts={rb.contacts || []}
              regionBias={rb.destination}
              forceEdit={globalEdit}
              onSave={(contacts) => persist({ ...rb, contacts })}
              onAutoSave={(contacts) => updateAndAutosave({ ...rb, contacts })}
            />

            <TipsSection
              tips={rb.tips || []}
              forceEdit={globalEdit}
              onSave={(tips) => persist({ ...rb, tips })}
              onAutoSave={(tips) => updateAndAutosave({ ...rb, tips })}
            />
          </div>
        </article>
      </main>
    </div>
  );

  if (!apiKey) return content;
  return (
    <APIProvider
      apiKey={apiKey}
      libraries={["places", "marker", "geometry"]}
    >
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
  hideEditButton,
}: {
  label: string;
  editing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  hideEditButton?: boolean;
}) {
  return (
    <div className="mb-5 flex items-center justify-between">
      <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
        {label}
      </h2>
      {editing ? (
        hideEditButton ? null : (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={onCancel}
              className="gap-1.5 text-muted-foreground"
            >
              <X className="h-3.5 w-3.5" /> Annuler
            </Button>
            <Button size="sm" onClick={onSave} className="gap-1.5">
              <Check className="h-3.5 w-3.5" /> Enregistrer
            </Button>
          </div>
        )
      ) : (
        !hideEditButton && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onEdit}
            className="gap-1.5 text-muted-foreground hover:text-primary"
          >
            <Pencil className="h-3.5 w-3.5" /> Modifier
          </Button>
        )
      )}
    </div>
  );
}

/* ---------- Cover ---------- */

function CoverSection({
  cover,
  theme,
  travelMode,
  forceEdit,
  onSave,
  onAutoSave,
}: {
  cover: Cover;
  theme?: string;
  travelMode?: string;
  forceEdit: boolean;
  onSave: (c: Cover) => void;
  onAutoSave: (c: Cover) => void;
}) {
  const [localEdit, setLocalEdit] = useState(false);
  const [draft, setDraft] = useState(cover);
  const editing = localEdit || forceEdit;

  useEffect(() => {
    if (forceEdit) setDraft(cover);
  }, [forceEdit, cover]);

  const update = (patch: Partial<Cover>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    if (forceEdit) onAutoSave(next);
  };

  if (editing) {
    return (
      <div className="relative bg-[#0F6E56] px-8 py-20 text-white sm:px-14">
        {!forceEdit && (
          <div className="absolute right-6 top-6 flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setDraft(cover);
                setLocalEdit(false);
              }}
              className="gap-1.5 text-white/90 hover:bg-white/15 hover:text-white"
            >
              <X className="h-3.5 w-3.5" /> Annuler
            </Button>
            <Button
              size="sm"
              onClick={() => {
                onSave(draft);
                setLocalEdit(false);
              }}
              className="gap-1.5 bg-white text-[#0F6E56] hover:bg-white/90"
            >
              <Check className="h-3.5 w-3.5" /> Enregistrer
            </Button>
          </div>
        )}
        <div className="mx-auto max-w-3xl space-y-3 pt-10">
          <Input
            value={draft.title}
            onChange={(e) => update({ title: e.target.value })}
            className="border-white/30 bg-white/15 text-2xl font-bold text-white placeholder:text-white/60"
          />
          <Input
            value={draft.subtitle}
            onChange={(e) => update({ subtitle: e.target.value })}
            className="border-white/30 bg-white/15 text-white placeholder:text-white/60"
          />
          <Input
            value={draft.tagline}
            onChange={(e) => update({ tagline: e.target.value })}
            className="border-white/30 bg-white/15 text-white placeholder:text-white/60"
          />
          <Input
            value={draft.dates_label}
            onChange={(e) => update({ dates_label: e.target.value })}
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
          onClick={() => {
            setDraft(cover);
            setLocalEdit(true);
          }}
          className="gap-1.5 text-white/90 hover:bg-white/15 hover:text-white"
        >
          <Pencil className="h-3.5 w-3.5" /> Modifier
        </Button>
      </div>
      <p className="mb-6 text-xs uppercase tracking-widest opacity-80">
        Roadbook
      </p>
      <h1 className="mb-4 text-7xl font-semibold leading-tight">
        {cover.title}
      </h1>
      <p className="mb-3 text-2xl">{cover.subtitle}</p>
      <p className="mb-6 text-lg italic opacity-85">{cover.tagline}</p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="inline-block rounded-full bg-white/15 px-5 py-2 text-sm">
          {cover.dates_label}
        </span>
        {(theme || travelMode) && (
          <span className="inline-block rounded-full bg-white/10 px-4 py-2 text-xs uppercase tracking-wider">
            {[theme, travelMode].filter(Boolean).join(" · ")}
          </span>
        )}
      </div>
    </section>
  );
}

/* ---------- Editable plain text ---------- */

function EditableTextSection({
  label,
  value,
  forceEdit,
  onSave,
  onAutoSave,
}: {
  label: string;
  value: string;
  forceEdit: boolean;
  onSave: (v: string) => void;
  onAutoSave: (v: string) => void;
}) {
  const [localEdit, setLocalEdit] = useState(false);
  const [draft, setDraft] = useState(value);
  const editing = localEdit || forceEdit;

  useEffect(() => {
    if (forceEdit) setDraft(value);
  }, [forceEdit, value]);

  return (
    <section>
      <SectionHeader
        label={label}
        editing={editing}
        hideEditButton={forceEdit}
        onEdit={() => {
          setDraft(value);
          setLocalEdit(true);
        }}
        onSave={() => {
          onSave(draft);
          setLocalEdit(false);
        }}
        onCancel={() => setLocalEdit(false)}
      />
      {editing ? (
        <Textarea
          rows={6}
          value={draft}
          onChange={(e) => {
            const v = e.target.value;
            setDraft(v);
            if (forceEdit) onAutoSave(v);
          }}
        />
      ) : (
        <p className="text-base leading-relaxed text-foreground/85">{value}</p>
      )}
    </section>
  );
}

/* ---------- Days table (drag-and-drop) ---------- */

interface DayRowProps {
  day: Day;
  index: number;
  editing: boolean;
  regionBias?: string;
  onUpdate: (patch: Partial<Day>) => void;
  onRemove: () => void;
  isOdd: boolean;
}

function DayRow({
  day,
  editing,
  regionBias,
  onUpdate,
  onRemove,
  isOdd,
}: DayRowProps) {
  const sortable = useSortable({ id: `day-${day.day}` });
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = sortable;

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <Fragment>
      <tr
        ref={setNodeRef}
        style={style}
        className={isOdd ? "bg-secondary/25" : ""}
      >
        {editing && (
          <td className="px-1 py-3 align-top">
            <button
              type="button"
              {...attributes}
              {...listeners}
              className="cursor-grab text-muted-foreground hover:text-primary active:cursor-grabbing"
              aria-label="Réordonner"
            >
              <GripVertical className="h-4 w-4" />
            </button>
          </td>
        )}
        <td className="px-3 py-3 font-semibold text-primary">J{day.day}</td>
        <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
          {editing ? (
            <Input
              value={day.date}
              onChange={(e) => onUpdate({ date: e.target.value })}
              className="h-8"
            />
          ) : (
            formatShortDate(day.date)
          )}
        </td>
        <td className="px-3 py-3 font-medium">
          {editing ? (
            <PlacesAutocompleteInput
              value={day.stage}
              onChange={(v) => onUpdate({ stage: v })}
              onSelect={(p) =>
                onUpdate({
                  stage: p.name,
                  lat: p.lat,
                  lng: p.lng,
                })
              }
              regionBias={regionBias}
              className="h-8"
            />
          ) : (
            day.stage
          )}
        </td>
        <td className="px-3 py-3">
          {editing ? (
            <PlacesAutocompleteInput
              value={day.accommodation}
              onChange={(v) => onUpdate({ accommodation: v })}
              onSelect={(p) =>
                onUpdate({
                  accommodation: p.name,
                  ...(typeof day.lat !== "number" && p.lat != null
                    ? { lat: p.lat, lng: p.lng }
                    : {}),
                })
              }
              regionBias={regionBias}
              types={["establishment"]}
              className="h-8"
            />
          ) : (
            day.accommodation
          )}
        </td>
        <td className="px-3 py-3 text-muted-foreground">
          {editing ? (
            <Input
              value={day.type}
              onChange={(e) => onUpdate({ type: e.target.value })}
              className="h-8"
            />
          ) : (
            day.type
          )}
        </td>
        <td className="px-3 py-3 text-muted-foreground">
          {editing ? (
            <Input
              value={day.flight}
              onChange={(e) => onUpdate({ flight: e.target.value })}
              className="h-8"
            />
          ) : (
            day.flight
          )}
        </td>
        <td className="px-3 py-3 text-right tabular-nums">
          {editing ? (
            <Input
              type="number"
              value={day.distance_km}
              onChange={(e) =>
                onUpdate({ distance_km: parseInt(e.target.value) || 0 })
              }
              className="h-8 w-20 ml-auto text-right"
            />
          ) : (
            <span>{day.distance_km} km</span>
          )}
        </td>
        <td className="px-3 py-3 text-right tabular-nums">
          {editing ? (
            <Input
              type="number"
              value={day.drive_hours}
              onChange={(e) =>
                onUpdate({ drive_hours: parseInt(e.target.value) || 0 })
              }
              className="h-8 w-16 ml-auto text-right"
            />
          ) : (
            <span>{day.drive_hours} h</span>
          )}
        </td>
        {editing && (
          <td className="px-2 py-3 align-top">
            <button
              type="button"
              onClick={onRemove}
              className="text-muted-foreground hover:text-destructive"
              aria-label="Supprimer ce jour"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </td>
        )}
      </tr>
      <tr className={isOdd ? "bg-secondary/25" : ""}>
        <td
          colSpan={editing ? 10 : 8}
          className="px-3 pb-4 pt-0 italic text-foreground/70"
        >
          {editing ? (
            <Textarea
              rows={2}
              value={day.narrative}
              onChange={(e) => onUpdate({ narrative: e.target.value })}
              className="italic"
            />
          ) : (
            day.narrative
          )}
        </td>
      </tr>
    </Fragment>
  );
}

function DaysTableSection({
  days,
  onSave,
  onAutoSave,
  regionBias,
  forceEdit,
  onAddDayFromPlace,
}: {
  days: Day[];
  onSave: (d: Day[]) => void;
  onAutoSave: (d: Day[]) => void;
  regionBias?: string;
  forceEdit: boolean;
  onAddDayFromPlace?: (place: PlaceSelection, position: number | null) => void;
}) {
  const [localEdit, setLocalEdit] = useState(false);
  const [draft, setDraft] = useState(days);
  const editing = localEdit || forceEdit;
  // Position où on est en train d'insérer un nouveau jour via autocomplete.
  // null = panneau fermé, "end" = ajout en fin, number = insertion à cet index.
  const [addingAt, setAddingAt] = useState<number | "end" | null>(null);

  // Resync local draft whenever the parent days prop changes. Évite la
  // divergence quand une étape est ajoutée/supprimée via la carte ou via
  // InsertRow pendant que la section est en mode édition locale (sinon le
  // bouton "Enregistrer" écraserait la mutation avec un draft obsolète).
  useEffect(() => {
    setDraft(days);
  }, [days]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const list = editing ? draft : days;

  const update = (i: number, patch: Partial<Day>) => {
    const next = draft.map((day, idx) =>
      idx === i ? { ...day, ...patch } : day,
    );
    setDraft(next);
    if (forceEdit) onAutoSave(next);
  };

  const remove = (i: number) => {
    const next = renumberDays(draft.filter((_, idx) => idx !== i));
    setDraft(next);
    if (forceEdit) onAutoSave(next);
  };

  const add = () => {
    const next = renumberDays([...draft, emptyDay(draft.length + 1)]);
    setDraft(next);
    if (forceEdit) onAutoSave(next);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = draft.findIndex((d) => `day-${d.day}` === active.id);
    const newIdx = draft.findIndex((d) => `day-${d.day}` === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const next = renumberDays(arrayMove(draft, oldIdx, newIdx));
    setDraft(next);
    if (forceEdit) onAutoSave(next);
  };

  const sortableIds = useMemo(
    () => list.map((d) => `day-${d.day}`),
    [list],
  );

  return (
    <section>
      <SectionHeader
        label="Itinéraire jour par jour"
        editing={editing}
        hideEditButton={forceEdit}
        onEdit={() => {
          setDraft(days);
          setLocalEdit(true);
        }}
        onSave={() => {
          onSave(renumberDays(draft));
          setLocalEdit(false);
        }}
        onCancel={() => setLocalEdit(false)}
      />

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <tr>
              {editing && <th className="px-1 py-3 w-6" />}
              <th className="px-3 py-3 w-12">Jour</th>
              <th className="px-3 py-3 w-20">Date</th>
              <th className="px-3 py-3">Étape</th>
              <th className="px-3 py-3">Hébergement</th>
              <th className="px-3 py-3 w-28" translate="no">
                Type
              </th>
              <th className="px-3 py-3">Vols / Transport</th>
              <th className="px-3 py-3 w-24 text-right">Distance</th>
              <th className="px-3 py-3 w-20 text-right" translate="no">
                Route
              </th>
              {editing && <th className="px-2 py-3 w-10" />}
            </tr>
          </thead>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortableIds}
              strategy={verticalListSortingStrategy}
            >
              <tbody>
                {list.map((d, i) => (
                  <Fragment key={`day-${d.day}`}>
                    <DayRow
                      day={d}
                      index={i}
                      editing={editing}
                      regionBias={regionBias}
                      onUpdate={(patch) => update(i, patch)}
                      onRemove={() => remove(i)}
                      isOdd={i % 2 === 1}
                    />
                    {editing &&
                      onAddDayFromPlace &&
                      addingAt === i + 1 && (
                        <InsertRow
                          label={
                            i + 1 >= list.length
                              ? "Ajouter une étape à la fin du voyage"
                              : `Insérer une étape entre J${d.day} et J${list[i + 1].day}`
                          }
                          regionBias={regionBias}
                          onCancel={() => setAddingAt(null)}
                          onSelect={(p) => {
                            if (p.lat == null || p.lng == null) {
                              toast.error("Lieu sans coordonnées, choisis-en un autre.");
                              return;
                            }
                            onAddDayFromPlace(p, i + 1);
                            setAddingAt(null);
                          }}
                        />
                      )}
                    {editing && onAddDayFromPlace && i < list.length - 1 && addingAt !== i + 1 && (
                      <tr>
                        <td colSpan={10} className="p-0">
                          <button
                            type="button"
                            onClick={() => setAddingAt(i + 1)}
                            className="group flex w-full items-center justify-center gap-1.5 py-1 text-[11px] font-medium text-muted-foreground/60 transition hover:bg-primary/5 hover:text-primary"
                          >
                            <Plus className="h-3 w-3" />
                            Insérer une étape entre J{d.day} et J{list[i + 1].day}
                          </button>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
                {editing && onAddDayFromPlace && addingAt === "end" && (
                  <InsertRow
                    label="Ajouter une étape à la fin du voyage"
                    regionBias={regionBias}
                    onCancel={() => setAddingAt(null)}
                    onSelect={(p) => {
                      if (p.lat == null || p.lng == null) {
                        toast.error("Lieu sans coordonnées, choisis-en un autre.");
                        return;
                      }
                      onAddDayFromPlace(p, null);
                      setAddingAt(null);
                    }}
                  />
                )}
              </tbody>
            </SortableContext>
          </DndContext>
        </table>
      </div>


      {editing && (
        <div className="mt-3 flex flex-wrap gap-2">
          {onAddDayFromPlace ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setAddingAt(addingAt === "end" ? null : "end")
              }
              className="gap-2"
            >
              <Plus className="h-3.5 w-3.5" /> Ajouter un jour
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={add}
              className="gap-2"
            >
              <Plus className="h-3.5 w-3.5" /> Ajouter un jour
            </Button>
          )}
        </div>
      )}
    </section>
  );
}

/* ---------- Insert row (inline autocomplete inside the days table) ---------- */

function InsertRow({
  label,
  regionBias,
  onCancel,
  onSelect,
}: {
  label: string;
  regionBias?: string;
  onCancel: () => void;
  onSelect: (p: PlaceSelection) => void;
}) {
  const [query, setQuery] = useState("");
  return (
    <tr className="bg-primary/5">
      <td colSpan={10} className="p-0">
        <div className="animate-in fade-in slide-in-from-top-1 duration-200 border-y-2 border-primary/40 px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-medium text-foreground">{label}</div>
            <button
              type="button"
              onClick={onCancel}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Annuler
            </button>
          </div>
          <PlacesAutocompleteInput
            value={query}
            onChange={setQuery}
            onSelect={onSelect}
            regionBias={regionBias}
            placeholder="Tape un lieu : Etosha National Park, Swakopmund…"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Sélectionne une suggestion : la nouvelle étape apparaîtra
            immédiatement sur la carte avec son tracé.
          </p>
        </div>
      </td>
    </tr>
  );
}

/* ---------- Accommodations ---------- */

function AccommodationsSection({
  items,
  onSave,
  onAutoSave,
  regionBias,
  forceEdit,
}: {
  items: AccommodationSummary[];
  onSave: (a: AccommodationSummary[]) => void;
  onAutoSave: (a: AccommodationSummary[]) => void;
  regionBias?: string;
  forceEdit: boolean;
}) {
  const [localEdit, setLocalEdit] = useState(false);
  const [draft, setDraft] = useState(items);
  const editing = localEdit || forceEdit;

  useEffect(() => {
    if (forceEdit) setDraft(items);
  }, [forceEdit, items]);

  const update = (i: number, patch: Partial<AccommodationSummary>) => {
    const next = draft.map((a, idx) => (idx === i ? { ...a, ...patch } : a));
    setDraft(next);
    if (forceEdit) onAutoSave(next);
  };
  const remove = (i: number) => {
    const next = draft.filter((_, idx) => idx !== i);
    setDraft(next);
    if (forceEdit) onAutoSave(next);
  };
  const add = () => {
    const next = [...draft, emptyAccommodation()];
    setDraft(next);
    if (forceEdit) onAutoSave(next);
  };

  const list = editing ? draft : items;

  return (
    <section>
      <SectionHeader
        label="Hébergements"
        editing={editing}
        hideEditButton={forceEdit}
        onEdit={() => {
          setDraft(items);
          setLocalEdit(true);
        }}
        onSave={() => {
          onSave(draft);
          setLocalEdit(false);
        }}
        onCancel={() => setLocalEdit(false)}
      />

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Lodge / Camp</th>
              <th className="px-4 py-3">Localisation</th>
              <th className="px-4 py-3" translate="no">
                Type
              </th>
              <th className="px-4 py-3 text-right w-20">Nuits</th>
              {editing && <th className="px-2 py-3 w-10" />}
            </tr>
          </thead>
          <tbody>
            {list.map((a, i) => (
              <tr key={i} className={i % 2 === 1 ? "bg-secondary/25" : ""}>
                <td className="px-4 py-3 font-medium">
                  {editing ? (
                    <PlacesAutocompleteInput
                      value={a.name}
                      onChange={(v) => update(i, { name: v })}
                      onSelect={(p) =>
                        update(i, {
                          name: p.name,
                          ...(p.formatted && !a.location
                            ? { location: p.formatted }
                            : {}),
                        })
                      }
                      regionBias={regionBias}
                      types={["establishment"]}
                      className="h-8"
                    />
                  ) : (
                    a.name
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {editing ? (
                    <PlacesAutocompleteInput
                      value={a.location}
                      onChange={(v) => update(i, { location: v })}
                      onSelect={(p) => update(i, { location: p.name })}
                      regionBias={regionBias}
                      className="h-8"
                    />
                  ) : (
                    a.location
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground" translate="no">
                  {editing ? (
                    <Input
                      value={a.type}
                      onChange={(e) => update(i, { type: e.target.value })}
                      className="h-8"
                    />
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
                      onChange={(e) =>
                        update(i, { nights: parseInt(e.target.value) || 1 })
                      }
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
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={add}
          className="mt-3 gap-2"
        >
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
  onAutoSave,
  regionBias,
  forceEdit,
}: {
  contacts: Contact[];
  onSave: (c: Contact[]) => void;
  onAutoSave: (c: Contact[]) => void;
  regionBias?: string;
  forceEdit: boolean;
}) {
  const [localEdit, setLocalEdit] = useState(false);
  const [draft, setDraft] = useState(contacts);
  const editing = localEdit || forceEdit;

  useEffect(() => {
    if (forceEdit) setDraft(contacts);
  }, [forceEdit, contacts]);

  const update = (i: number, patch: Partial<Contact>) => {
    const next = draft.map((c, idx) => (idx === i ? { ...c, ...patch } : c));
    setDraft(next);
    if (forceEdit) onAutoSave(next);
  };
  const remove = (i: number) => {
    const next = draft.filter((_, idx) => idx !== i);
    setDraft(next);
    if (forceEdit) onAutoSave(next);
  };
  const add = () => {
    const next = [...draft, emptyContact()];
    setDraft(next);
    if (forceEdit) onAutoSave(next);
  };

  const list = editing ? draft : contacts;

  return (
    <section>
      <SectionHeader
        label="Contacts pratiques"
        editing={editing}
        hideEditButton={forceEdit}
        onEdit={() => {
          setDraft(contacts);
          setLocalEdit(true);
        }}
        onSave={() => {
          onSave(draft);
          setLocalEdit(false);
        }}
        onCancel={() => setLocalEdit(false)}
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
                    <Input
                      value={c.role}
                      onChange={(e) => update(i, { role: e.target.value })}
                      className="h-8"
                    />
                  ) : (
                    c.role
                  )}
                </td>
                <td className="px-4 py-3 font-medium">
                  {editing ? (
                    <PlacesAutocompleteInput
                      value={c.name}
                      onChange={(v) => update(i, { name: v })}
                      onSelect={(p) => update(i, { name: p.name })}
                      regionBias={regionBias}
                      types={["establishment"]}
                      className="h-8"
                    />
                  ) : (
                    c.name
                  )}
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {editing ? (
                    <Input
                      value={c.phone}
                      onChange={(e) => update(i, { phone: e.target.value })}
                      className="h-8"
                    />
                  ) : (
                    c.phone
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {editing ? (
                    <Input
                      value={c.email ?? ""}
                      onChange={(e) => update(i, { email: e.target.value })}
                      className="h-8"
                    />
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
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={add}
          className="mt-3 gap-2"
        >
          <Plus className="h-3.5 w-3.5" /> Ajouter un contact
        </Button>
      )}
    </section>
  );
}

/* ---------- Tips ---------- */

function TipsSection({
  tips,
  onSave,
  onAutoSave,
  forceEdit,
}: {
  tips: string[];
  onSave: (t: string[]) => void;
  onAutoSave: (t: string[]) => void;
  forceEdit: boolean;
}) {
  const [localEdit, setLocalEdit] = useState(false);
  const [draft, setDraft] = useState<string[]>(tips);
  const editing = localEdit || forceEdit;

  useEffect(() => {
    if (forceEdit) setDraft(tips);
  }, [forceEdit, tips]);

  const update = (i: number, v: string) => {
    const next = draft.map((t, idx) => (idx === i ? v : t));
    setDraft(next);
    if (forceEdit) onAutoSave(next.map((t) => t.trim()).filter(Boolean));
  };
  const remove = (i: number) => {
    const next = draft.filter((_, idx) => idx !== i);
    setDraft(next);
    if (forceEdit) onAutoSave(next.map((t) => t.trim()).filter(Boolean));
  };
  const add = () => {
    const next = [...draft, ""];
    setDraft(next);
  };

  return (
    <section>
      <SectionHeader
        label="Conseils & recommandations"
        editing={editing}
        hideEditButton={forceEdit}
        onEdit={() => {
          setDraft(tips);
          setLocalEdit(true);
        }}
        onSave={() => {
          onSave(draft.map((t) => t.trim()).filter(Boolean));
          setLocalEdit(false);
        }}
        onCancel={() => setLocalEdit(false)}
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={add}
            className="gap-2"
          >
            <Plus className="h-3.5 w-3.5" /> Ajouter un conseil
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {tips.map((t, i) => (
            <li
              key={i}
              className="flex gap-3 text-sm leading-relaxed text-foreground/85"
            >
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
