import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Download, Pencil, Check, X, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/roadbook/preview-mock")({
  component: PreviewMockPage,
  head: () => ({ meta: [{ title: "Aperçu du roadbook — Roadbook.ai" }] }),
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
  narrative: string;
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
  cover: Cover;
  overview: string;
  days: Day[];
  accommodations_summary: AccommodationSummary[];
  contacts: Contact[];
  tips: string[];
}

const MOCK: Roadbook = {
  cover: {
    title: "Namibie",
    subtitle: "Du désert du Namib aux plaines d'Etosha",
    tagline: "12 jours en autotour 4x4 — Sophie et Marc Lambert",
    dates_label: "15 au 26 septembre 2026",
  },
  overview:
    "Douze jours pour traverser la Namibie d'ouest en est, en autotour 4x4. Des dunes orangées du Sossusvlei aux brumes côtières de Swakopmund, des peintures rupestres du Twyfelfontein aux safaris au lever du jour à Etosha. Un itinéraire conçu pour un couple amoureux de paysages bruts et de nuits étoilées.",
  days: [
    { day: 1, date: "2026-09-15", stage: "Arrivée Windhoek", accommodation: "Hartmann Suites Apartments", type: "Appartement", distance_km: 50, drive_hours: 1, narrative: "Arrivée en fin de matinée. Prise du véhicule 4x4 et nuit à Windhoek pour récupérer du voyage." },
    { day: 2, date: "2026-09-16", stage: "Windhoek → Naukluft", accommodation: "Camp Gecko", type: "Camp", distance_km: 280, drive_hours: 4, narrative: "Route plein sud vers les plateaux du Naukluft. Première nuit en camp, sous les étoiles." },
    { day: 3, date: "2026-09-17", stage: "Sesriem - dunes du Sossusvlei", accommodation: "Sesriem Campsite", type: "Camp", distance_km: 150, drive_hours: 2, narrative: "Lever de soleil sur Dune 45 puis marche jusqu'à Deadvlei. Retour au camp en fin d'après-midi." },
    { day: 4, date: "2026-09-18", stage: "Sesriem - Sesriem Canyon", accommodation: "Sesriem Campsite", type: "Camp", distance_km: 30, drive_hours: 1, narrative: "Matinée au Sesriem Canyon. Après-midi libre pour profiter de la piscine du camp avant la soirée." },
    { day: 5, date: "2026-09-19", stage: "Sesriem → Swakopmund", accommodation: "Bruckendorf Apartment", type: "Appartement", distance_km: 350, drive_hours: 5, narrative: "Traversée du désert vers la côte. Arrivée à Swakopmund en fin de journée. Dîner au restaurant The Tug." },
    { day: 6, date: "2026-09-20", stage: "Swakopmund - excursion Sandwich Harbour", accommodation: "Bruckendorf Apartment", type: "Appartement", distance_km: 100, drive_hours: 4, narrative: "Excursion guidée à Sandwich Harbour : dunes plongeant dans l'océan, otaries, flamants roses." },
    { day: 7, date: "2026-09-21", stage: "Swakopmund → Brandberg", accommodation: "Brandberg White Lady Lodge", type: "Lodge", distance_km: 240, drive_hours: 3, narrative: "Route par Henties Bay et la Skeleton Coast jusqu'au pied du Brandberg, plus haut sommet de Namibie." },
    { day: 8, date: "2026-09-22", stage: "Brandberg - peintures rupestres", accommodation: "Brandberg White Lady Lodge", type: "Lodge", distance_km: 0, drive_hours: 0, narrative: "Marche guidée jusqu'à la White Lady, peinture rupestre vieille de 2000 ans. Après-midi détente." },
    { day: 9, date: "2026-09-23", stage: "Brandberg → Twyfelfontein → Khowarib", accommodation: "Khowarib Lodge", type: "Lodge", distance_km: 220, drive_hours: 4, narrative: "Visite du site UNESCO de Twyfelfontein, gravures rupestres dans le grès rouge." },
    { day: 10, date: "2026-09-24", stage: "Khowarib → Etosha (porte sud)", accommodation: "Etosha Safari Lodge", type: "Lodge", distance_km: 280, drive_hours: 4, narrative: "Route vers Etosha. Premier game drive en fin d'après-midi autour des points d'eau." },
    { day: 11, date: "2026-09-25", stage: "Etosha - safari journée pleine", accommodation: "Etosha Safari Lodge", type: "Lodge", distance_km: 180, drive_hours: 6, narrative: "Safari toute la journée dans le parc. Pause pique-nique à Halali. Retour en lodge au coucher du soleil." },
    { day: 12, date: "2026-09-26", stage: "Etosha → Windhoek - vol retour", accommodation: "Vol", type: "Vol", distance_km: 480, drive_hours: 6, narrative: "Retour à Windhoek. Restitution du véhicule. Vol international en fin de journée." },
  ],
  accommodations_summary: [
    { name: "Hartmann Suites Apartments", location: "Windhoek", nights: 1, type: "Appartement" },
    { name: "Camp Gecko", location: "Naukluft", nights: 1, type: "Camp" },
    { name: "Sesriem Campsite", location: "Sesriem", nights: 2, type: "Camp" },
    { name: "Bruckendorf Apartment", location: "Swakopmund", nights: 2, type: "Appartement" },
    { name: "Brandberg White Lady Lodge", location: "Brandberg", nights: 2, type: "Lodge" },
    { name: "Khowarib Lodge", location: "Khowarib", nights: 1, type: "Lodge" },
    { name: "Etosha Safari Lodge", location: "Etosha", nights: 2, type: "Lodge" },
  ],
  contacts: [
    { role: "Loueur 4x4", name: "Asco Car Hire - Windhoek", phone: "+264 61 377 200", email: "info@ascocarhire.com" },
    { role: "Guide local Sandwich Harbour", name: "Sandwich Harbour 4x4", phone: "+264 64 405 080" },
    { role: "Réception Brandberg WL Lodge", name: "Brandberg WL Lodge", phone: "+264 67 290 822" },
    { role: "Urgence Namibie", name: "Police 24/7", phone: "10111" },
  ],
  tips: [
    "Conduite à gauche en Namibie. Permis international obligatoire.",
    "Faire le plein dès qu'une station est disponible — les distances entre stations peuvent dépasser 200 km.",
    "Pour les excursions à Sossusvlei, partir avant 6h pour profiter du lever de soleil sur les dunes.",
    "Prévoir des vêtements chauds : nuits fraîches dans le désert (5-10°C), chaudes en journée (25-30°C).",
    "Eau potable : préférer l'eau en bouteille ou filtrée. Pas de risque sanitaire majeur.",
    "Pourboires : 50-100 NAD par jour pour les guides, 10-20 NAD pour les services lodges.",
  ],
};

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function PreviewMockPage() {
  const [rb, setRb] = useState<Roadbook>(MOCK);

  const exportPDF = () => {
    toast.info("Export PDF bientôt disponible.");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Retour au tableau de bord
            </Button>
          </Link>
          <Button size="sm" onClick={exportPDF} className="gap-2">
            <Download className="h-4 w-4" /> Exporter en PDF
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <CoverSection cover={rb.cover} onSave={(cover) => setRb({ ...rb, cover })} />

          <div className="space-y-14 px-8 py-12 sm:px-14">
            <EditableTextSection
              label="Vue d'ensemble"
              value={rb.overview}
              onSave={(overview) => setRb({ ...rb, overview })}
            />

            <DaysTableSection days={rb.days} onSave={(days) => setRb({ ...rb, days })} />

            <AccommodationsSection
              items={rb.accommodations_summary}
              onSave={(accommodations_summary) => setRb({ ...rb, accommodations_summary })}
            />

            <ContactsSection
              contacts={rb.contacts}
              onSave={(contacts) => setRb({ ...rb, contacts })}
            />

            <TipsSection tips={rb.tips} onSave={(tips) => setRb({ ...rb, tips })} />
          </div>
        </article>
      </main>
    </div>
  );
}

/* ---------- Section header ---------- */

function SectionHeader({
  label, editing, onEdit, onSave, onCancel,
}: { label: string; editing: boolean; onEdit: () => void; onSave: () => void; onCancel: () => void }) {
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

/* ---------- Cover ---------- */

function CoverSection({ cover, onSave }: { cover: Cover; onSave: (c: Cover) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(cover);

  return (
    <div className="relative bg-gradient-to-br from-primary to-primary-light px-8 py-20 text-primary-foreground sm:px-14 sm:py-28">
      <div className="absolute right-6 top-6">
        {editing ? (
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost"
              onClick={() => { setDraft(cover); setEditing(false); }}
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
          <div className="mt-8 space-y-3 text-left">
            <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              className="bg-white/15 border-white/30 text-primary-foreground placeholder:text-primary-foreground/60 text-2xl font-bold" />
            <Input value={draft.subtitle} onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })}
              className="bg-white/15 border-white/30 text-primary-foreground placeholder:text-primary-foreground/60" />
            <Input value={draft.tagline} onChange={(e) => setDraft({ ...draft, tagline: e.target.value })}
              className="bg-white/15 border-white/30 text-primary-foreground placeholder:text-primary-foreground/60" />
            <Input value={draft.dates_label} onChange={(e) => setDraft({ ...draft, dates_label: e.target.value })}
              className="bg-white/15 border-white/30 text-primary-foreground placeholder:text-primary-foreground/60" />
          </div>
        ) : (
          <>
            <h1 className="mt-6 text-5xl font-bold tracking-tight sm:text-6xl">{cover.title}</h1>
            <p className="mt-6 text-xl opacity-95 sm:text-2xl">{cover.subtitle}</p>
            <p className="mt-3 text-base italic opacity-85">{cover.tagline}</p>
            <div className="mt-10 inline-flex items-center gap-2 rounded-full bg-white/15 px-5 py-2 text-sm font-medium tracking-wide backdrop-blur">
              {cover.dates_label}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- Editable plain text ---------- */

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

/* ---------- Days table ---------- */

function DaysTableSection({ days, onSave }: { days: Day[]; onSave: (d: Day[]) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(days);

  const update = (i: number, patch: Partial<Day>) =>
    setDraft((d) => d.map((day, idx) => (idx === i ? { ...day, ...patch } : day)));

  const list = editing ? draft : days;

  return (
    <section>
      <SectionHeader
        label="Itinéraire jour par jour"
        editing={editing}
        onEdit={() => { setDraft(days); setEditing(true); }}
        onSave={() => { onSave(draft); setEditing(false); }}
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
              <th className="px-3 py-3 w-24">Type</th>
              <th className="px-3 py-3 w-24 text-right">Distance</th>
              <th className="px-3 py-3 w-20 text-right">Route</th>
            </tr>
          </thead>
          <tbody>
            {list.map((d, i) => (
              <>
                <tr key={`r-${i}`} className={i % 2 === 1 ? "bg-secondary/25" : ""}>
                  <td className="px-3 py-3 font-semibold text-primary">J{d.day}</td>
                  <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
                    {editing
                      ? <Input value={d.date} onChange={(e) => update(i, { date: e.target.value })} className="h-8" />
                      : formatShortDate(d.date)}
                  </td>
                  <td className="px-3 py-3 font-medium">
                    {editing
                      ? <Input value={d.stage} onChange={(e) => update(i, { stage: e.target.value })} className="h-8" />
                      : d.stage}
                  </td>
                  <td className="px-3 py-3">
                    {editing
                      ? <Input value={d.accommodation} onChange={(e) => update(i, { accommodation: e.target.value })} className="h-8" />
                      : d.accommodation}
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {editing
                      ? <Input value={d.type} onChange={(e) => update(i, { type: e.target.value })} className="h-8" />
                      : d.type}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {editing ? (
                      <Input type="number" value={d.distance_km}
                        onChange={(e) => update(i, { distance_km: parseInt(e.target.value) || 0 })}
                        className="h-8 w-20 ml-auto text-right" />
                    ) : (
                      <span>{d.distance_km} km</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {editing ? (
                      <Input type="number" value={d.drive_hours}
                        onChange={(e) => update(i, { drive_hours: parseInt(e.target.value) || 0 })}
                        className="h-8 w-16 ml-auto text-right" />
                    ) : (
                      <span>{d.drive_hours} h</span>
                    )}
                  </td>
                </tr>
                <tr key={`n-${i}`} className={i % 2 === 1 ? "bg-secondary/25" : ""}>
                  <td colSpan={7} className="px-3 pb-4 pt-0 italic text-foreground/70">
                    {editing ? (
                      <Textarea rows={2} value={d.narrative}
                        onChange={(e) => update(i, { narrative: e.target.value })}
                        className="italic" />
                    ) : (
                      d.narrative
                    )}
                  </td>
                </tr>
              </>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ---------- Accommodations ---------- */

function AccommodationsSection({
  items, onSave,
}: { items: AccommodationSummary[]; onSave: (a: AccommodationSummary[]) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(items);
  const update = (i: number, patch: Partial<AccommodationSummary>) =>
    setDraft((d) => d.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));

  const list = editing ? draft : items;

  return (
    <section>
      <SectionHeader
        label="Hébergements"
        editing={editing}
        onEdit={() => { setDraft(items); setEditing(true); }}
        onSave={() => { onSave(draft); setEditing(false); }}
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
            </tr>
          </thead>
          <tbody>
            {list.map((a, i) => (
              <tr key={i} className={i % 2 === 1 ? "bg-secondary/25" : ""}>
                <td className="px-4 py-3 font-medium">
                  {editing
                    ? <Input value={a.name} onChange={(e) => update(i, { name: e.target.value })} className="h-8" />
                    : a.name}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {editing
                    ? <Input value={a.location} onChange={(e) => update(i, { location: e.target.value })} className="h-8" />
                    : a.location}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {editing
                    ? <Input value={a.type} onChange={(e) => update(i, { type: e.target.value })} className="h-8" />
                    : a.type}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {editing ? (
                    <Input type="number" min={1} value={a.nights}
                      onChange={(e) => update(i, { nights: parseInt(e.target.value) || 1 })}
                      className="h-8 w-16 ml-auto text-right" />
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

/* ---------- Contacts ---------- */

function ContactsSection({
  contacts, onSave,
}: { contacts: Contact[]; onSave: (c: Contact[]) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(contacts);
  const update = (i: number, patch: Partial<Contact>) =>
    setDraft((d) => d.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

  const list = editing ? draft : contacts;

  return (
    <section>
      <SectionHeader
        label="Contacts pratiques"
        editing={editing}
        onEdit={() => { setDraft(contacts); setEditing(true); }}
        onSave={() => { onSave(draft); setEditing(false); }}
        onCancel={() => setEditing(false)}
      />

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Rôle</th>
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">Téléphone</th>
              <th className="px-4 py-3">Email</th>
            </tr>
          </thead>
          <tbody>
            {list.map((c, i) => (
              <tr key={i} className={i % 2 === 1 ? "bg-secondary/25" : ""}>
                <td className="px-4 py-3 text-muted-foreground">
                  {editing
                    ? <Input value={c.role} onChange={(e) => update(i, { role: e.target.value })} className="h-8" />
                    : c.role}
                </td>
                <td className="px-4 py-3 font-medium">
                  {editing
                    ? <Input value={c.name} onChange={(e) => update(i, { name: e.target.value })} className="h-8" />
                    : c.name}
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {editing
                    ? <Input value={c.phone} onChange={(e) => update(i, { phone: e.target.value })} className="h-8" />
                    : c.phone}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {editing
                    ? <Input value={c.email ?? ""} onChange={(e) => update(i, { email: e.target.value })} className="h-8" />
                    : (c.email || "—")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ---------- Tips ---------- */

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
          <Textarea rows={7} value={draft} onChange={(e) => setDraft(e.target.value)} />
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
