import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Sparkles, PenLine, ChevronDown, Check, Upload, Send } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { callClaudeAPI, type RoadbookFormData } from "@/lib/mockGenerator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Paywall } from "@/components/Paywall";
import { useSubscription } from "@/lib/useSubscription";
import { ImportRoadbookDialog } from "@/components/ImportRoadbookDialog";
import { composePromptFromBrief } from "@/lib/briefQuestions";

interface NewSearch {
  brief_id?: string;
}

export const Route = createFileRoute("/new")({
  component: NewRoadbook,
  head: () => ({ meta: [{ title: "Nouveau roadbook — Roadbook.ai" }] }),
  validateSearch: (search: Record<string, unknown>): NewSearch => ({
    brief_id:
      typeof search.brief_id === "string" ? search.brief_id : undefined,
  }),
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
const MODES = [
  "Autotour 4x4",
  "Autotour voiture",
  "Backpack / routard",
  "Voyage organisé",
  "Trek / randonnée",
  "Croisière",
  "Vélo / cyclotourisme",
  "Combiné multi-transports",
  "Sur-mesure libre",
];

type GenerationStep = "prompt" | "ai" | "save" | "done";

function NewRoadbook() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { info: subInfo, refetch: refetchSub } = useSubscription();
  const search = useSearch({ from: "/new" }) as NewSearch;
  const [submitting, setSubmitting] = useState(false);
  const [stepKey, setStepKey] = useState<GenerationStep>("prompt");
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [briefPrefilled, setBriefPrefilled] = useState<{
    id: string;
    clientName: string | null;
  } | null>(null);

  const [form, setForm] = useState<RoadbookFormData>({
    client_name: "",
    destination: "",
    start_date: "",
    end_date: "",
    travelers_count: 0,
    traveler_profile: "",
    theme: "",
    budget_range: "",
    travel_mode: "",
    generation_mode: "ai",
    agent_notes: "",
    manual_steps: [{ location: "", nights: 2, activities: "" }],
  });

  const update = <K extends keyof RoadbookFormData>(k: K, v: RoadbookFormData[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // Si on arrive avec ?brief_id=xxx, on pré-remplit le formulaire IA depuis
  // les réponses du client. Le designer voit tout le brief composé dans
  // "agent_notes" et n'a plus qu'à cliquer Générer.
  useEffect(() => {
    if (!search.brief_id || !user || briefPrefilled) return;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) return;
      const res = await fetch("/api/brief-list", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error("Impossible de charger le brief");
        return;
      }
      const brief = (data?.briefs || []).find(
        (b: any) => b.id === search.brief_id,
      );
      if (!brief) {
        toast.error("Brief introuvable");
        return;
      }
      if (brief.status === "pending") {
        toast.error("Ce brief n'a pas encore été rempli par le client");
        return;
      }
      const composed = composePromptFromBrief(
        brief.answers || {},
        brief.client_name,
      );
      setForm((f) => ({
        ...f,
        client_name: brief.client_name || f.client_name,
        destination:
          (brief.answers?.destination as string) ||
          brief.destination_hint ||
          f.destination,
        generation_mode: "ai",
        agent_notes: composed,
      }));
      setBriefPrefilled({
        id: brief.id,
        clientName: brief.client_name ?? null,
      });
      toast.success("Brief client chargé. Prêt à générer.");
    })();
  }, [search.brief_id, user, briefPrefilled]);

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

    if (!user) {
      toast.error("Vous devez être connecté pour générer un roadbook.");
      return;
    }

    // Pré-check quota côté client (UX) — le serveur fait le check définitif.
    // Évite l'attente de 30s sur l'API Claude pour rien si l'utilisateur sait
    // déjà qu'il est bloqué.
    if (subInfo && !subInfo.canGenerate) {
      setPaywallOpen(true);
      return;
    }

    setSubmitting(true);
    setStepKey("prompt");
    try {
      // Petit délai visuel pour que l'utilisateur enregistre l'étape "prompt"
      // avant le passage à "ai" (l'appel Claude met 30-60s).
      await new Promise((r) => setTimeout(r, 350));
      setStepKey("ai");
      const roadbook = await callClaudeAPI(form);

      // callClaudeAPI valide déjà days non vide. On vérifie en double — si
      // jamais un futur changement casse cet invariant, on ne créé pas un
      // roadbook fantôme en base.
      if (!Array.isArray((roadbook as any).days) || (roadbook as any).days.length === 0) {
        throw new Error("Le roadbook généré n'a pas d'étapes. Réessaye.");
      }

      // Garantir la présence de travel_mode dans content même si Claude l'oublie
      if (form.travel_mode && !(roadbook as any).travel_mode) {
        (roadbook as any).travel_mode = form.travel_mode;
      }

      setStepKey("save");
      const destination = (roadbook as any).destination || form.destination;
      const clientName = (roadbook as any).client_name || form.client_name;
      const startDate = (roadbook as any).start_date || form.start_date || null;
      const endDate = (roadbook as any).end_date || form.end_date || null;

      const { data, error } = await supabase
        .from("roadbooks")
        .insert({
          user_id: user.id,
          client_name: clientName,
          destination,
          start_date: startDate,
          end_date: endDate,
          travelers_count: form.travelers_count || null,
          traveler_profile: form.traveler_profile || null,
          theme: form.theme || null,
          budget_range: form.budget_range || null,
          generation_mode: form.generation_mode,
          agent_notes: form.agent_notes || null,
          content: roadbook as any,
          status: "ready",
        })
        .select("id")
        .single();

      if (error || !data) {
        setSubmitting(false);
        toast.error("Échec de l'enregistrement : " + (error?.message || "inconnu"));
        return;
      }

      // Si on est arrivé depuis un brief client, on le marque comme utilisé
      // et on lie le roadbook fraîchement créé. Pas bloquant si l'appel
      // échoue — le roadbook est déjà sauvegardé.
      if (briefPrefilled) {
        try {
          const {
            data: { session: s },
          } = await supabase.auth.getSession();
          if (s?.access_token) {
            await fetch("/api/brief-mark-used", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${s.access_token}`,
              },
              body: JSON.stringify({
                brief_id: briefPrefilled.id,
                roadbook_id: data.id,
              }),
            });
          }
        } catch (e) {
          console.warn("[new] brief-mark-used failed:", e);
        }
      }

      setStepKey("done");
      navigate({ to: "/roadbook/$id", params: { id: data.id } });
    } catch (error: any) {
      setSubmitting(false);
      setStepKey("prompt");
      // 402 quota_exceeded / feature_locked → ouvrir le paywall, pas un toast
      // brutal. Le serveur a déjà rendu le message human-readable mais le
      // paywall est un meilleur appel à l'action.
      if (error?.status === 402) {
        await refetchSub();
        setPaywallOpen(true);
        toast.message(error.message ?? "Quota atteint", { duration: 4000 });
        return;
      }
      toast.error("Erreur de génération : " + (error?.message || "inconnue"));
      console.error("Erreur génération:", error);
    }
  };

  if (submitting) {
    return (
      <AppShell>
        <GenerationLoader step={stepKey} destination={form.destination} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="container-editorial px-6 sm:px-10 lg:px-14 py-12 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-3">
            <span className="rule-warm" aria-hidden />
            <span className="eyebrow">Nouveau voyage</span>
          </div>
          <h1 className="mt-5 font-display text-[42px] font-semibold leading-[1.05] tracking-tight text-foreground sm:text-[52px]">
            Composer un nouveau roadbook
          </h1>
          <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-muted-foreground">
            Trois manières de démarrer — choisissez celle qui correspond
            à votre matière.
          </p>

          {briefPrefilled && (
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-primary/30 bg-primary-soft/40 px-5 py-4">
              <Send className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="flex-1 text-[13.5px] leading-relaxed">
                <p className="font-medium text-foreground">
                  Brief client chargé
                  {briefPrefilled.clientName ? ` — ${briefPrefilled.clientName}` : ""}
                </p>
                <p className="mt-0.5 text-muted-foreground">
                  Les réponses ont été composées dans le brief IA ci-dessous.
                  Tu peux ajuster avant de générer.
                </p>
              </div>
            </div>
          )}

          {/* Choix du mode — bloc éducatif en haut, avant le formulaire */}
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            <ModeCard
              active={form.generation_mode === "ai"}
              onClick={() => update("generation_mode", "ai")}
              icon={<Sparkles className="h-4 w-4" />}
              title="L'IA propose"
              body="Brief court, l'IA dessine le squelette. Pour défricher rapidement."
            />
            <ModeCard
              active={form.generation_mode === "manual"}
              onClick={() => update("generation_mode", "manual")}
              icon={<PenLine className="h-4 w-4" />}
              title="Vous composez"
              body="Vos étapes, vos lodges. L'IA met en forme autour. Pour vos coins secrets."
            />
            <ModeCard
              active={false}
              onClick={() => setImportOpen(true)}
              icon={<Upload className="h-4 w-4" />}
              title="Importer Excel"
              body="Votre programme existe déjà ? On le passe au format éditorial."
            />
          </div>

        <form onSubmit={onGenerate} className="mt-10 space-y-10">
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
                <SelectField
                  value={
                    !form.travelers_count
                      ? ""
                      : form.travelers_count >= 8
                        ? "8plus"
                        : String(form.travelers_count)
                  }
                  onChange={(v) =>
                    update("travelers_count", v === "8plus" ? 8 : parseInt(v) || 1)
                  }
                  options={TRAVELERS}
                  placeholder="Choisir le nombre"
                />
              </Field>
              <Field label="Profil">
                <SelectField
                  value={form.traveler_profile ?? ""}
                  onChange={(v) => update("traveler_profile", v)}
                  options={PROFILES}
                  placeholder="Choisir un profil"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Thème">
                <SelectField
                  value={form.theme ?? ""}
                  onChange={(v) => update("theme", v)}
                  options={THEMES}
                  placeholder="Choisir un thème"
                />
              </Field>
              <Field label="Gamme de budget">
                <SelectField
                  value={form.budget_range ?? ""}
                  onChange={(v) => update("budget_range", v)}
                  options={BUDGETS}
                  placeholder="Choisir un budget"
                />
              </Field>
            </div>
            <Field label="Modalité de voyage">
              <SelectField
                value={form.travel_mode ?? ""}
                onChange={(v) => update("travel_mode", v)}
                options={MODES}
                placeholder="Choisir une modalité"
              />
            </Field>
          </Section>

          {form.generation_mode === "manual" && (
            <Section title="Vos étapes">
              <p className="-mt-2 text-[13px] leading-relaxed text-muted-foreground">
                Saisissez les lieux, le nombre de nuits, et les activités
                clés. L'IA composera la trame éditoriale autour.
              </p>
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
                        placeholder="Lieu (ex : Sesriem, Brandberg White Lady Lodge)"
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
            </Section>
          )}

          <Section title="Notes personnelles facultatives">
            <Textarea
              rows={3}
              value={form.agent_notes}
              onChange={(e) => update("agent_notes", e.target.value)}
              placeholder="Informations utiles : allergies, anniversaire, rythme souhaité…"
            />
          </Section>

          <div className="flex flex-col-reverse items-stretch gap-3 border-t border-border pt-8 sm:flex-row sm:items-center sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate({ to: "/dashboard" })}
              className="transition-smooth"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              size="lg"
              className="gap-2 px-8 shadow-[0_4px_14px_-4px_rgba(15,110,86,0.4)] transition-smooth hover:shadow-[0_6px_18px_-4px_rgba(15,110,86,0.55)]"
            >
              <Sparkles className="h-4 w-4" />
              {form.generation_mode === "manual"
                ? "Composer le roadbook"
                : "Générer un roadbook"}
            </Button>
          </div>
        </form>
        </div>
      </div>

      {subInfo && (
        <Paywall
          open={paywallOpen}
          onOpenChange={setPaywallOpen}
          currentPlanKey={subInfo.planKey}
          title="Quota atteint"
          subtitle={
            subInfo.roadbooksLimit !== null
              ? `Quota roadbooks atteint (${subInfo.roadbooksUsed} / ${subInfo.roadbooksLimit}) sur le plan ${subInfo.planKey}. Passe au plan supérieur ou attends le renouvellement.`
              : "Ton abonnement n'autorise pas la génération de nouveaux roadbooks."
          }
        />
      )}

      <ImportRoadbookDialog open={importOpen} onOpenChange={setImportOpen} />
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-5">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
        {title}
      </h2>
      <div className="space-y-4 rounded-2xl border border-border bg-surface p-6 shadow-[0_1px_0_rgba(0,0,0,0.02)]">
        {children}
      </div>
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
  placeholder = "Choisir…",
}: {
  value?: string;
  onChange: (v: string) => void;
  options: (string | { value: string; label: string })[];
  placeholder?: string;
}) {
  const normalized = options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o,
  );
  return (
    <div className="relative">
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-9 w-full appearance-none items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 pr-10 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="" disabled>{placeholder}</option>
        {normalized.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />
    </div>
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
      className={`flex h-full flex-col rounded-xl border p-5 text-left transition-smooth hover:-translate-y-0.5 ${
        active
          ? "border-primary bg-primary-soft shadow-soft"
          : "border-border bg-card hover:border-primary/40 hover:shadow-soft"
      }`}
    >
      <div
        className={`grid h-9 w-9 place-items-center rounded-full ${
          active
            ? "bg-primary text-primary-foreground"
            : "bg-primary-soft text-primary"
        }`}
      >
        {icon}
      </div>
      <p
        className={`mt-4 text-[14px] font-semibold ${
          active ? "text-primary" : "text-foreground"
        }`}
      >
        {title}
      </p>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
        {body}
      </p>
    </button>
  );
}

const GENERATION_STEPS: { key: GenerationStep; label: string; hint: string }[] = [
  { key: "prompt", label: "Préparation du brief", hint: "Mise en forme des données du voyage." },
  { key: "ai", label: "Composition par l'IA", hint: "30 à 60 secondes — Claude rédige les jours, hébergements et conseils." },
  { key: "save", label: "Mise au propre", hint: "Sauvegarde du roadbook dans votre atelier." },
];

function GenerationLoader({
  step,
  destination,
}: {
  step: GenerationStep;
  destination: string;
}) {
  const activeIdx = Math.max(
    0,
    GENERATION_STEPS.findIndex((s) => s.key === step),
  );
  // Compteur d'attente pour rassurer l'utilisateur quand l'API met 60s.
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t0 = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="container-editorial px-6 sm:px-10 lg:px-14">
      <div className="grid min-h-[70vh] place-items-center text-center">
        <div className="w-full max-w-md">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary-soft">
            <Sparkles className="h-7 w-7 animate-pulse text-primary" />
          </div>
          <p className="eyebrow mt-8">Génération en cours</p>
          <h2 className="font-display mt-4 text-[34px] font-semibold leading-[1.05] tracking-tight text-foreground sm:text-[40px]">
            {destination ? `Roadbook ${destination}` : "Roadbook en préparation"}
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
            L'IA pose les jalons du voyage : itinéraire, rythme, hébergements
            et conseils sur place.
          </p>

          <ol className="mx-auto mt-10 space-y-4 text-left">
            {GENERATION_STEPS.map((s, i) => {
              const done = i < activeIdx;
              const active = i === activeIdx;
              return (
                <li
                  key={s.key}
                  className={`flex items-start gap-3 rounded-xl border px-4 py-3 transition ${
                    active
                      ? "border-primary/40 bg-primary-soft/60"
                      : done
                        ? "border-border/60 bg-surface"
                        : "border-border/40 bg-surface/60 opacity-60"
                  }`}
                >
                  <div
                    className={`mt-0.5 grid h-5 w-5 flex-shrink-0 place-items-center rounded-full transition ${
                      done
                        ? "bg-primary text-primary-foreground"
                        : active
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground/50"
                    }`}
                  >
                    {done ? (
                      <Check className="h-3 w-3" strokeWidth={3} />
                    ) : active ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p
                      className={`text-[14px] font-medium ${
                        active || done ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {s.label}
                    </p>
                    <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
                      {s.hint}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>

          <p className="mt-8 text-[12px] text-text-soft">
            Temps écoulé&nbsp;: {elapsed}s · Ne fermez pas l'onglet.
          </p>
        </div>
      </div>
    </div>
  );
}
