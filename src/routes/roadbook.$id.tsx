import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, Loader2, Save, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { RoadbookContent } from "@/lib/mockGenerator";
import type { Tables, Json } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { exportRoadbookPDF } from "@/lib/pdfExport";

export const Route = createFileRoute("/roadbook/$id")({
  component: RoadbookPage,
  head: () => ({ meta: [{ title: "Roadbook — Roadbook.ai" }] }),
});

type Roadbook = Tables<"roadbooks">;

function RoadbookPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [rb, setRb] = useState<Roadbook | null>(null);
  const [content, setContent] = useState<RoadbookContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    supabase
      .from("roadbooks")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          toast.error("Roadbook not found");
          navigate({ to: "/dashboard" });
          return;
        }
        setRb(data);
        setContent(data.content as unknown as RoadbookContent);
        setLoading(false);
      });
  }, [id, navigate]);

  const dateRange = useMemo(() => {
    if (!rb?.start_date || !rb?.end_date) return "";
    const fmt = (d: string) =>
      new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
    return `${fmt(rb.start_date)} → ${fmt(rb.end_date)}`;
  }, [rb]);

  const save = async () => {
    if (!content || !rb) return;
    setSaving(true);
    const { error } = await supabase
      .from("roadbooks")
      .update({ content: content as unknown as Json })
      .eq("id", rb.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Saved");
  };

  const remove = async () => {
    if (!rb) return;
    if (!confirm("Delete this roadbook? This cannot be undone.")) return;
    const { error } = await supabase.from("roadbooks").delete().eq("id", rb.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    navigate({ to: "/dashboard" });
  };

  const exportPDF = async () => {
    if (!content || !rb) return;
    setExporting(true);
    try {
      await exportRoadbookPDF(rb, content);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  if (loading || !content || !rb) {
    return (
      <AppShell>
        <div className="grid min-h-[40vh] place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  const updateCover = (k: keyof RoadbookContent["cover"], v: string) =>
    setContent({ ...content, cover: { ...content.cover, [k]: v } });

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link to="/dashboard">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={remove} className="gap-2 text-muted-foreground hover:text-destructive">
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
          <Button variant="outline" size="sm" onClick={save} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
          </Button>
          <Button size="sm" onClick={exportPDF} disabled={exporting} className="gap-2">
            <Download className="h-4 w-4" /> {exporting ? "Exporting…" : "Export PDF"}
          </Button>
        </div>
      </div>

      <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {/* Cover */}
        <div className="relative bg-gradient-to-br from-primary to-primary-light px-10 py-20 text-primary-foreground">
          <div className="text-xs font-medium uppercase tracking-[0.25em] opacity-80">
            Roadbook
          </div>
          <Editable
            as="h1"
            className="mt-3 text-5xl font-bold tracking-tight"
            value={content.cover.title}
            onChange={(v) => updateCover("title", v)}
          />
          <Editable
            as="p"
            className="mt-3 text-xl opacity-95"
            value={content.cover.subtitle}
            onChange={(v) => updateCover("subtitle", v)}
          />
          <Editable
            as="p"
            className="mt-1 text-sm opacity-80"
            value={content.cover.tagline}
            onChange={(v) => updateCover("tagline", v)}
          />
          {dateRange && <p className="mt-6 text-sm opacity-90">{dateRange}</p>}
        </div>

        <div className="space-y-12 px-10 py-12">
          {/* Overview */}
          <Section label="Trip overview">
            <Editable
              as="p"
              multiline
              className="whitespace-pre-wrap text-base leading-relaxed text-foreground/90"
              value={content.overview}
              onChange={(v) => setContent({ ...content, overview: v })}
            />
          </Section>

          {/* Days */}
          <Section label="Day by day">
            <ol className="space-y-6">
              {content.days.map((d, idx) => (
                <li key={idx} className="rounded-xl border border-border bg-secondary/30 p-5">
                  <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-primary">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground">
                      {d.day}
                    </span>
                    <Editable
                      as="span"
                      value={d.location}
                      className="text-muted-foreground"
                      onChange={(v) => {
                        const days = [...content.days];
                        days[idx] = { ...d, location: v };
                        setContent({ ...content, days });
                      }}
                    />
                  </div>
                  <Editable
                    as="h3"
                    className="mt-2 text-lg font-semibold"
                    value={d.title}
                    onChange={(v) => {
                      const days = [...content.days];
                      days[idx] = { ...d, title: v };
                      setContent({ ...content, days });
                    }}
                  />
                  <Editable
                    as="p"
                    multiline
                    className="mt-2 text-sm leading-relaxed text-foreground/80"
                    value={d.description}
                    onChange={(v) => {
                      const days = [...content.days];
                      days[idx] = { ...d, description: v };
                      setContent({ ...content, days });
                    }}
                  />
                  {d.activities.length > 0 && (
                    <ul className="mt-3 space-y-1.5 text-sm">
                      {d.activities.map((a, i) => (
                        <li key={i} className="flex gap-2 text-foreground/85">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                          <Editable
                            as="span"
                            value={a}
                            onChange={(v) => {
                              const days = [...content.days];
                              const acts = [...d.activities];
                              acts[i] = v;
                              days[idx] = { ...d, activities: acts };
                              setContent({ ...content, days });
                            }}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          </Section>

          {/* Accommodations */}
          <Section label="Accommodations">
            <ul className="grid gap-3 sm:grid-cols-2">
              {content.accommodations.map((a, i) => (
                <li key={i} className="rounded-xl border border-border p-4">
                  <Editable
                    as="h4"
                    className="font-semibold"
                    value={a.name}
                    onChange={(v) => {
                      const list = [...content.accommodations];
                      list[i] = { ...a, name: v };
                      setContent({ ...content, accommodations: list });
                    }}
                  />
                  <p className="mt-1 text-sm text-muted-foreground">
                    {a.location} · {a.nights} {a.nights > 1 ? "nights" : "night"}
                  </p>
                  <Editable
                    as="p"
                    multiline
                    className="mt-2 text-sm text-foreground/80"
                    value={a.notes}
                    onChange={(v) => {
                      const list = [...content.accommodations];
                      list[i] = { ...a, notes: v };
                      setContent({ ...content, accommodations: list });
                    }}
                  />
                </li>
              ))}
            </ul>
          </Section>

          {/* Contacts */}
          <Section label="Contacts">
            <dl className="grid gap-3 sm:grid-cols-2">
              {content.contacts.map((c, i) => (
                <div key={i} className="rounded-xl border border-border p-4">
                  <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {c.label}
                  </dt>
                  <dd className="mt-1">
                    <Editable
                      as="span"
                      value={c.value}
                      onChange={(v) => {
                        const list = [...content.contacts];
                        list[i] = { ...c, value: v };
                        setContent({ ...content, contacts: list });
                      }}
                    />
                  </dd>
                </div>
              ))}
            </dl>
          </Section>

          {/* Tips */}
          <Section label="Tips & good to know">
            <ul className="space-y-2 text-sm">
              {content.tips.map((t, i) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <Editable
                    as="span"
                    value={t}
                    onChange={(v) => {
                      const tips = [...content.tips];
                      tips[i] = v;
                      setContent({ ...content, tips });
                    }}
                  />
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </article>
    </AppShell>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
        {label}
      </div>
      {children}
    </section>
  );
}

function Editable({
  as = "span",
  value,
  onChange,
  className = "",
  multiline = false,
}: {
  as?: "h1" | "h3" | "h4" | "p" | "span";
  value: string;
  onChange: (v: string) => void;
  className?: string;
  multiline?: boolean;
}) {
  const Tag = as as React.ElementType;
  return (
    <Tag
      contentEditable
      suppressContentEditableWarning
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        const text = multiline ? e.currentTarget.innerText : e.currentTarget.textContent || "";
        if (text !== value) onChange(text);
      }}
      className={`outline-none rounded px-0.5 -mx-0.5 hover:bg-primary-soft/40 focus:bg-primary-soft/60 focus:ring-1 focus:ring-primary/30 ${className}`}
    >
      {value}
    </Tag>
  );
}
