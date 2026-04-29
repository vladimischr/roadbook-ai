import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Download, Pencil, Check, X, MapPin, Bed, Utensils, Phone, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/roadbook/preview-mock")({
  component: PreviewMockPage,
  head: () => ({ meta: [{ title: "Aperçu du roadbook — Roadbook.ai" }] }),
});

interface Day {
  day: number;
  title: string;
  location: string;
  narrative: string;
  accommodation: string;
  meals: string;
}
interface Accommodation { name: string; nights: number; type: string; }
interface Contact { role: string; name: string; phone: string; }
interface Cover { title: string; subtitle: string; tagline: string; }
interface Roadbook {
  client_name: string;
  destination: string;
  start_date: string;
  end_date: string;
  travelers: number;
  profile: string;
  theme: string;
  budget_range: string;
  cover: Cover;
  overview: string;
  days: Day[];
  accommodations: Accommodation[];
  contacts: Contact[];
  tips: string[];
}

const MOCK: Roadbook = {
  client_name: "Marie et Julien Dupont",
  destination: "Tanzanie - Circuit Nord",
  start_date: "2026-09-15",
  end_date: "2026-09-26",
  travelers: 2,
  profile: "Couple",
  theme: "Safari et culture",
  budget_range: "5 à 8 k€",
  cover: {
    title: "Tanzanie, sur la route des grands espaces",
    subtitle: "11 jours sur le circuit Nord — Marie et Julien Dupont",
    tagline: "Un voyage entre savane, peuples Massaïs et nuits sous les étoiles.",
  },
  overview:
    "11 jours en Tanzanie, alliant safaris dans le Serengeti et le Ngorongoro, rencontre avec les communautés Massaïs et nuits dans des lodges d'exception. Un itinéraire conçu pour des voyageurs amoureux de nature et de culture.",
  days: [
    { day: 1, title: "Arrivée à Arusha", location: "Arusha", narrative: "Accueil à l'aéroport...", accommodation: "Arusha Coffee Lodge", meals: "Dîner inclus" },
    { day: 2, title: "Tarangire — premiers éléphants", location: "Tarangire NP", narrative: "Safari toute la journée...", accommodation: "Tarangire Treetops", meals: "Petit-déj, déjeuner, dîner" },
    { day: 3, title: "Du cratère Ngorongoro", location: "Ngorongoro", narrative: "...", accommodation: "Ngorongoro Crater Lodge", meals: "PC" },
  ],
  accommodations: [
    { name: "Arusha Coffee Lodge", nights: 1, type: "Lodge boutique" },
    { name: "Tarangire Treetops", nights: 1, type: "Lodge sur pilotis" },
    { name: "Ngorongoro Crater Lodge", nights: 2, type: "Lodge de luxe" },
  ],
  contacts: [
    { role: "Guide local", name: "Joseph M.", phone: "+255 ..." },
    { role: "Lodge contact", name: "Reception Arusha CL", phone: "+255 ..." },
  ],
  tips: [
    "Pensez à prévoir des vêtements neutres (kaki, beige) pour les safaris.",
    "L'altitude au Ngorongoro peut surprendre la première nuit — restez hydratés.",
    "Pourboires : ~10 USD/jour pour le guide, ~5 USD/jour pour le chauffeur.",
  ],
};

function formatDateRange(start: string, end: string) {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  return `${fmt(start)} → ${fmt(end)}`;
}

function PreviewMockPage() {
  const [rb, setRb] = useState<Roadbook>(MOCK);

  const exportPDF = () => {
    toast.info("Export PDF bientôt disponible.");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky toolbar */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Retour au dashboard
            </Button>
          </Link>
          <Button size="sm" onClick={exportPDF} className="gap-2">
            <Download className="h-4 w-4" /> Exporter en PDF
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {/* 1. Cover */}
          <CoverSection
            cover={rb.cover}
            dateRange={formatDateRange(rb.start_date, rb.end_date)}
            onSave={(cover) => setRb({ ...rb, cover })}
          />

          <div className="space-y-14 px-8 py-12 sm:px-14">
            {/* 2. Overview */}
            <EditableTextSection
              label="Aperçu du voyage"
              value={rb.overview}
              onSave={(overview) => setRb({ ...rb, overview })}
            />

            {/* 3. Days */}
            <DaysSection
              days={rb.days}
              onSave={(days) => setRb({ ...rb, days })}
            />

            {/* 4. Accommodations */}
            <AccommodationsSection
              accommodations={rb.accommodations}
              onSave={(accommodations) => setRb({ ...rb, accommodations })}
            />

            {/* 5. Contacts */}
            <ContactsSection
              contacts={rb.contacts}
              onSave={(contacts) => setRb({ ...rb, contacts })}
            />

            {/* 6. Tips */}
            <TipsSection
              tips={rb.tips}
              onSave={(tips) => setRb({ ...rb, tips })}
            />
          </div>
        </article>
      </main>
    </div>
  );
}

/* ---------- Section primitives ---------- */

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
      <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">{label}</h2>
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

/* ---------- 1. Cover ---------- */

function CoverSection({
  cover,
  dateRange,
  onSave,
}: { cover: Cover; dateRange: string; onSave: (c: Cover) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(cover);

  return (
    <div className="relative bg-gradient-to-br from-primary to-primary-light px-8 py-20 text-primary-foreground sm:px-14 sm:py-24">
      <div className="absolute right-6 top-6">
        {editing ? (
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={() => { setDraft(cover); setEditing(false); }}
              className="gap-1.5 text-primary-foreground/90 hover:bg-white/15 hover:text-primary-foreground">
              <X className="h-3.5 w-3.5" /> Annuler
            </Button>
            <Button size="sm" onClick={() => { onSave(draft); setEditing(false); }}
              className="gap-1.5 bg-white text-primary hover:bg-white/90">
              <Check className="h-3.5 w-3.5" /> Enregistrer
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}
            className="gap-1.5 text-primary-foreground/90 hover:bg-white/15 hover:text-primary-foreground">
            <Pencil className="h-3.5 w-3.5" /> Modifier
          </Button>
        )}
      </div>

      <div className="mx-auto max-w-3xl text-center">
        <div className="text-[11px] font-medium uppercase tracking-[0.3em] opacity-80">Roadbook</div>

        {editing ? (
          <div className="mt-6 space-y-3 text-left">
            <Input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              className="bg-white/15 border-white/30 text-primary-foreground placeholder:text-primary-foreground/60 text-2xl font-bold"
            />
            <Input
              value={draft.subtitle}
              onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })}
              className="bg-white/15 border-white/30 text-primary-foreground placeholder:text-primary-foreground/60"
            />
            <Input
              value={draft.tagline}
              onChange={(e) => setDraft({ ...draft, tagline: e.target.value })}
              className="bg-white/15 border-white/30 text-primary-foreground placeholder:text-primary-foreground/60"
            />
          </div>
        ) : (
          <>
            <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">{cover.title}</h1>
            <p className="mt-4 text-lg opacity-95 sm:text-xl">{cover.subtitle}</p>
            <p className="mt-3 text-sm italic opacity-85 sm:text-base">{cover.tagline}</p>
          </>
        )}

        <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-medium tracking-wide backdrop-blur">
          {dateRange}
        </div>
      </div>
    </div>
  );
}

/* ---------- 2 & generic plain-text section ---------- */

function EditableTextSection({
  label, value, onSave,
}: { label: string; value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  return (
    <section>
      <SectionHeader
        label={label}
        editing={editing}
        onEdit={() => { setDraft(value); setEditing(true); }}
        onSave={() => { onSave(draft); setEditing(false); }}
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

/* ---------- 3. Days ---------- */

function DaysSection({ days, onSave }: { days: Day[]; onSave: (d: Day[]) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(days);

  const updateDay = (i: number, patch: Partial<Day>) =>
    setDraft((d) => d.map((day, idx) => (idx === i ? { ...day, ...patch } : day)));

  return (
    <section>
      <SectionHeader
        label="Jour par jour"
        editing={editing}
        onEdit={() => { setDraft(days); setEditing(true); }}
        onSave={() => { onSave(draft); setEditing(false); }}
        onCancel={() => setEditing(false)}
      />

      <ol className="space-y-5">
        {(editing ? draft : days).map((d, i) => (
          <li key={i} className="rounded-xl border border-border bg-secondary/30 p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {d.day}
              </span>
              <div className="flex-1 min-w-0">
                {editing ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input value={d.title} onChange={(e) => updateDay(i, { title: e.target.value })} placeholder="Titre" />
                    <Input value={d.location} onChange={(e) => updateDay(i, { location: e.target.value })} placeholder="Lieu" />
                  </div>
                ) : (
                  <>
                    <h3 className="text-lg font-semibold leading-tight">{d.title}</h3>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-primary">
                      <MapPin className="h-3 w-3" /> {d.location}
                    </p>
                  </>
                )}
              </div>
            </div>

            {editing ? (
              <Textarea
                rows={3}
                className="mt-3"
                value={d.narrative}
                onChange={(e) => updateDay(i, { narrative: e.target.value })}
                placeholder="Narratif"
              />
            ) : (
              <p className="mt-3 text-sm leading-relaxed text-foreground/80">{d.narrative}</p>
            )}

            <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <div className="flex items-start gap-2 text-foreground/85">
                <Bed className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {editing ? (
                  <Input value={d.accommodation} onChange={(e) => updateDay(i, { accommodation: e.target.value })} placeholder="Hébergement" />
                ) : (
                  <span><span className="text-muted-foreground">Hébergement : </span>{d.accommodation}</span>
                )}
              </div>
              <div className="flex items-start gap-2 text-foreground/85">
                <Utensils className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {editing ? (
                  <Input value={d.meals} onChange={(e) => updateDay(i, { meals: e.target.value })} placeholder="Repas" />
                ) : (
                  <span><span className="text-muted-foreground">Repas : </span>{d.meals}</span>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ---------- 4. Accommodations ---------- */

function AccommodationsSection({
  accommodations, onSave,
}: { accommodations: Accommodation[]; onSave: (a: Accommodation[]) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(accommodations);
  const update = (i: number, patch: Partial<Accommodation>) =>
    setDraft((d) => d.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));

  return (
    <section>
      <SectionHeader
        label="Hébergements"
        editing={editing}
        onEdit={() => { setDraft(accommodations); setEditing(true); }}
        onSave={() => { onSave(draft); setEditing(false); }}
        onCancel={() => setEditing(false)}
      />

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3 text-right">Nuits</th>
            </tr>
          </thead>
          <tbody>
            {(editing ? draft : accommodations).map((a, i) => (
              <tr key={i} className="border-t border-border">
                <td className="px-4 py-3 font-medium">
                  {editing ? <Input value={a.name} onChange={(e) => update(i, { name: e.target.value })} /> : a.name}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {editing ? <Input value={a.type} onChange={(e) => update(i, { type: e.target.value })} /> : a.type}
                </td>
                <td className="px-4 py-3 text-right">
                  {editing ? (
                    <Input type="number" min={1} value={a.nights}
                      onChange={(e) => update(i, { nights: parseInt(e.target.value) || 1 })}
                      className="w-20 ml-auto" />
                  ) : a.nights}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ---------- 5. Contacts ---------- */

function ContactsSection({
  contacts, onSave,
}: { contacts: Contact[]; onSave: (c: Contact[]) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(contacts);
  const update = (i: number, patch: Partial<Contact>) =>
    setDraft((d) => d.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

  return (
    <section>
      <SectionHeader
        label="Contacts utiles"
        editing={editing}
        onEdit={() => { setDraft(contacts); setEditing(true); }}
        onSave={() => { onSave(draft); setEditing(false); }}
        onCancel={() => setEditing(false)}
      />

      <ul className="grid gap-3 sm:grid-cols-2">
        {(editing ? draft : contacts).map((c, i) => (
          <li key={i} className="rounded-xl border border-border p-4">
            {editing ? (
              <div className="space-y-2">
                <Input value={c.role} onChange={(e) => update(i, { role: e.target.value })} placeholder="Rôle" />
                <Input value={c.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="Nom" />
                <Input value={c.phone} onChange={(e) => update(i, { phone: e.target.value })} placeholder="Téléphone" />
              </div>
            ) : (
              <>
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{c.role}</div>
                <div className="mt-1 font-medium">{c.name}</div>
                <div className="mt-1 flex items-center gap-1.5 text-sm text-foreground/80">
                  <Phone className="h-3.5 w-3.5 text-primary" />
                  {c.phone}
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------- 6. Tips ---------- */

function TipsSection({ tips, onSave }: { tips: string[]; onSave: (t: string[]) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(tips.join("\n"));

  return (
    <section>
      <SectionHeader
        label="Conseils & recommandations"
        editing={editing}
        onEdit={() => { setDraft(tips.join("\n")); setEditing(true); }}
        onSave={() => {
          onSave(draft.split("\n").map((t) => t.trim()).filter(Boolean));
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />

      {editing ? (
        <>
          <Textarea rows={6} value={draft} onChange={(e) => setDraft(e.target.value)} />
          <p className="mt-2 text-xs text-muted-foreground">Un conseil par ligne.</p>
        </>
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
