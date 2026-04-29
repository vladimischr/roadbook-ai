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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { callClaudeAPI, type RoadbookFormData } from "@/lib/mockGenerator";
import { toast } from "sonner";

export const Route = createFileRoute("/new")({
  component: NewRoadbook,
  head: () => ({ meta: [{ title: "New roadbook — Roadbook.ai" }] }),
});

const THEMES = ["Luxury safari", "Cultural", "Adventure", "Beach", "Road trip", "Custom"];
const PROFILES = ["Couple", "Family", "Solo", "Friends"];
const BUDGETS = ["3–5k €", "5–8k €", "8–12k €", "12–15k €", "15k €+"];

function NewRoadbook() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<RoadbookFormData>({
    client_name: "",
    destination: "",
    start_date: "",
    end_date: "",
    travelers_count: 2,
    traveler_profile: "Couple",
    theme: "Cultural",
    budget_range: "5–8k €",
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
    if (!user) return;
    if (!form.client_name || !form.destination) {
      toast.error("Client name and destination are required.");
      return;
    }

    setSubmitting(true);
    try {
      const content = await callClaudeAPI(form);
      const { data, error } = await supabase
        .from("roadbooks")
        .insert([{
          user_id: user.id,
          client_name: form.client_name,
          destination: form.destination,
          start_date: form.start_date || null,
          end_date: form.end_date || null,
          travelers_count: form.travelers_count || null,
          traveler_profile: form.traveler_profile || null,
          theme: form.theme || null,
          budget_range: form.budget_range || null,
          generation_mode: form.generation_mode,
          agent_notes: form.agent_notes || null,
          content: content as unknown as import("@/integrations/supabase/types").Json,
          status: "ready",
        }])
        .select("id")
        .single();

      if (error) throw error;
      toast.success("Roadbook generated");
      navigate({ to: "/roadbook/$id", params: { id: data.id } });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
      setSubmitting(false);
    }
  };

  if (submitting) {
    return (
      <AppShell>
        <div className="grid min-h-[60vh] place-items-center text-center">
          <div>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
            <h2 className="mt-6 text-xl font-semibold">Crafting your roadbook…</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Designing the itinerary, picking the rhythm, polishing the prose.
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight">New roadbook</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tell us about the trip — we'll do the rest.
        </p>

        <form onSubmit={onGenerate} className="mt-8 space-y-8">
          <Section title="Client & destination">
            <Field label="Client name">
              <Input
                value={form.client_name}
                onChange={(e) => update("client_name", e.target.value)}
                placeholder="Marie & Julien Dupont"
                required
              />
            </Field>
            <Field label="Destination">
              <Input
                value={form.destination}
                onChange={(e) => update("destination", e.target.value)}
                placeholder="Tanzania, Northern Circuit"
                required
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Start date">
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => update("start_date", e.target.value)}
                />
              </Field>
              <Field label="End date">
                <Input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => update("end_date", e.target.value)}
                />
              </Field>
            </div>
          </Section>

          <Section title="Travelers">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Number of travelers">
                <Input
                  type="number"
                  min={1}
                  value={form.travelers_count}
                  onChange={(e) => update("travelers_count", parseInt(e.target.value) || 1)}
                />
              </Field>
              <Field label="Profile">
                <SelectField
                  value={form.traveler_profile}
                  onChange={(v) => update("traveler_profile", v)}
                  options={PROFILES}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Theme">
                <SelectField
                  value={form.theme}
                  onChange={(v) => update("theme", v)}
                  options={THEMES}
                />
              </Field>
              <Field label="Budget range">
                <SelectField
                  value={form.budget_range}
                  onChange={(v) => update("budget_range", v)}
                  options={BUDGETS}
                />
              </Field>
            </div>
          </Section>

          <Section title="Itinerary mode">
            <div className="grid grid-cols-2 gap-3">
              <ModeCard
                active={form.generation_mode === "ai"}
                onClick={() => update("generation_mode", "ai")}
                icon={<Sparkles className="h-4 w-4" />}
                title="AI generates itinerary"
                body="We'll draft a day-by-day plan based on the brief."
              />
              <ModeCard
                active={form.generation_mode === "manual"}
                onClick={() => update("generation_mode", "manual")}
                icon={<PenLine className="h-4 w-4" />}
                title="I'll enter steps manually"
                body="Add your own stops, nights, and activities."
              />
            </div>

            {form.generation_mode === "manual" && (
              <div className="space-y-3 rounded-xl border border-border bg-secondary/40 p-4">
                {(form.manual_steps || []).map((step, i) => (
                  <div key={i} className="rounded-lg border border-border bg-card p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        Step {i + 1}
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
                        placeholder="Location"
                        value={step.location}
                        onChange={(e) => updateStep(i, { location: e.target.value })}
                      />
                      <Input
                        type="number"
                        min={1}
                        placeholder="Nights"
                        value={step.nights}
                        onChange={(e) => updateStep(i, { nights: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                    <Textarea
                      className="mt-2"
                      rows={2}
                      placeholder="Activities (comma-separated)"
                      value={step.activities}
                      onChange={(e) => updateStep(i, { activities: e.target.value })}
                    />
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addStep} className="gap-2">
                  <Plus className="h-3.5 w-3.5" /> Add step
                </Button>
              </div>
            )}
          </Section>

          <Section title="Personal notes (optional)">
            <Textarea
              rows={3}
              value={form.agent_notes}
              onChange={(e) => update("agent_notes", e.target.value)}
              placeholder="Anything we should know? Allergies, anniversaries, travel quirks…"
            />
          </Section>

          <div className="flex items-center justify-end gap-3 border-t border-border pt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate({ to: "/dashboard" })}
            >
              Cancel
            </Button>
            <Button type="submit" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Generate roadbook
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
