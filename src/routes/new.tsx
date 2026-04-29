import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Plus, Trash2, Sparkles, PenLine } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RoadbookFormData } from "@/lib/mockGenerator";
import { toast } from "sonner";

export const Route = createFileRoute("/new")({
  component: NewRoadbook,
  head: () => ({ meta: [{ title: "Nouveau roadbook — Roadbook.ai" }] }),
});

const TRAVELERS: { value: string; label: string }[] = [
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "5", label: "5" },
  { value: "6", label: "6" },
  { value: "7", label: "7" },
  { value: "8plus", label: "8+" },
];
const PROFILES = ["Solo", "Couple", "Famille", "Amis"];
const THEMES = [
  "Désert et faune",
  "Safari et culture",
  "Aventure et trekking",
  "Voyage culturel",
  "Plage et farniente",
  "Voyage de noces",
  "Roadtrip 4x4",
  "Sur-mesure libre",
];
const BUDGETS = [
  "Moins de 3 k€",
  "3 à 5 k€",
  "5 à 8 k€",
  "8 à 12 k€",
  "12 à 20 k€",
  "Plus de 20 k€",
];

function NewRoadbook() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<RoadbookFormData>({
    client_name: "",
    destination: "",
    start_date: "",
    end_date: "",
    travelers_count: undefined as unknown as number,
    traveler_profile: undefined,
    theme: undefined,
    budget_range: undefined,
    generation_mode: "ai",
    agent_notes: "",
    manual_steps: [{ location: "", nights: 2, activities: "" }],
  });

  const update = <K extends keyof RoadbookFormData>(k: K, v: RoadbookFormData[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const updateStep = (i: number, patch: Partial<NonNullable<RoadbookFormData["manual_steps"]>[number]>) =>
    setForm((f) => ({
      ...f,
      manual_steps: (f.manual_steps || []).map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
    }));

  const addStep = () =>
    setForm((f) => ({
      ...f,
      manual_steps: [...(f.manual_steps || []), { location: "", nights: 2, activities: "" }],
    }));

  const removeStep = (i: number) =>
    setForm((f) => ({
      ...f,
      manual_steps: (f.manual_steps || []).filter((_, idx) => idx !== i),
    }));

  const onGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.client_name || !form.destination) {
      toast.error("Le nom du client et la destination sont obligatoires.");
      return;
    }

    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 1200));
    toast.success("Roadbook généré");
    navigate({ to: "/roadbook/preview-mock" });
  };

  if (submitting) {
    return (
      <AppShell>
        <div className="grid min-h-[60vh] place-items-center text-center">
          <div>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
            <h2 className="mt-6 text-xl font-semibold">Création du roadbook…</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Construction de l’itinéraire, réglage du rythme, mise en forme du récit.
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight">Nouveau roadbook</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Renseignez le voyage — nous préparons la trame du programme.
        </p>

        <form onSubmit={onGenerate} className="mt-8 space-y-8">
          <Section title="Client et destination">
            <Field label="Nom du client">
              <Input
                value={form.client_name}
                onChange={(e) => update("client_name", e.target.value)}
                placeholder="Marie et Julien Dupont"
                required
              />
            </Field>
            <Field label="Destination">
              <Input
                value={form.destination}
                onChange={(e) => update("destination", e.target.value)}
                placeholder="Tanzanie, circuit nord"
                required
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Date de début">
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => update("start_date", e.target.value)}
                />
              </Field>
              <Field label="Date de fin">
                <Input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => update("end_date", e.target.value)}
                />
              </Field>
            </div>
          </Section>

          <Section title="Voyageurs">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nombre de voyageurs">
                <Input
                  type="number"
                  min={1}
                  value={form.travelers_count}
                  onChange={(e) => update("travelers_count", parseInt(e.target.value) || 1)}
                />
              </Field>
              <Field label="Profil">
                <SelectField
                  value={form.traveler_profile}
                  onChange={(v) => update("traveler_profile", v)}
                  options={PROFILES}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Thème">
                <SelectField
                  value={form.theme}
                  onChange={(v) => update("theme", v)}
                  options={THEMES}
                />
              </Field>
              <Field label="Budget">
                <SelectField
                  value={form.budget_range}
                  onChange={(v) => update("budget_range", v)}
                  options={BUDGETS}
                />
              </Field>
            </div>
          </Section>

          <Section title="Mode d’itinéraire">
            <div className="grid grid-cols-2 gap-3">
              <ModeCard
                active={form.generation_mode === "ai"}
                onClick={() => update("generation_mode", "ai")}
                icon={<Sparkles className="h-4 w-4" />}
                title="Génération automatique"
                body="Création d’un programme jour par jour à partir du brief."
              />
              <ModeCard
                active={form.generation_mode === "manual"}
                onClick={() => update("generation_mode", "manual")}
                icon={<PenLine className="h-4 w-4" />}
                title="Saisie manuelle"
                body="Ajoutez vos propres étapes, nuits et activités."
              />
            </div>

            {form.generation_mode === "manual" && (
              <div className="space-y-3 rounded-xl border border-border bg-secondary/40 p-4">
                {(form.manual_steps || []).map((step, i) => (
                  <div key={i} className="rounded-lg border border-border bg-card p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        Étape {i + 1}
                      </span>
                      {(form.manual_steps?.length || 0) > 1 && (
                        <button
                          type="button"
                          onClick={() => removeStep(i)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <Input
                        className="col-span-2"
                        placeholder="Lieu"
                        value={step.location}
                        onChange={(e) => updateStep(i, { location: e.target.value })}
                      />
                      <Input
                        type="number"
                        min={1}
                        placeholder="Nuits"
                        value={step.nights}
                        onChange={(e) => updateStep(i, { nights: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                    <Textarea
                      className="mt-2"
                      rows={2}
                      placeholder="Activités, séparées par des virgules"
                      value={step.activities}
                      onChange={(e) => updateStep(i, { activities: e.target.value })}
                    />
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addStep} className="gap-2">
                  <Plus className="h-3.5 w-3.5" /> Ajouter une étape
                </Button>
              </div>
            )}
          </Section>

          <Section title="Notes personnelles facultatives">
            <Textarea
              rows={3}
              value={form.agent_notes}
              onChange={(e) => update("agent_notes", e.target.value)}
              placeholder="Informations utiles : allergies, anniversaire, rythme souhaité…"
            />
          </Section>

          <div className="flex items-center justify-end gap-3 border-t border-border pt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate({ to: "/dashboard" })}
            >
              Annuler
            </Button>
            <Button type="submit" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Générer un roadbook
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block text-sm font-medium">{label}</Label>
      {children}
    </div>
  );
}

function SelectField({
  value,
  onChange,
  options,
}: {
  value?: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ModeCard({
  active,
  onClick,
  icon,
  title,
  body,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition ${
        active
          ? "border-primary bg-primary-soft"
          : "border-border bg-card hover:border-primary/40"
      }`}
    >
      <div className={`flex items-center gap-2 text-sm font-semibold ${active ? "text-primary" : "text-foreground"}`}>
        {icon}
        {title}
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">{body}</p>
    </button>
  );
}
