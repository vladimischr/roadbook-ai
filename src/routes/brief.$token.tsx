import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Loader2,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  BRIEF_QUESTIONS,
  type BriefQuestion,
} from "@/lib/briefQuestions";

// ============================================================================
// /brief/$token — formulaire public que le client final remplit
// ============================================================================
// Pas d'auth. Branding du designer en header. Une question par écran (style
// Typeform), barre de progression, validation à la fin.

export const Route = createFileRoute("/brief/$token")({
  component: BriefForm,
  head: () => ({
    meta: [
      { title: "Préparons votre voyage" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

interface DesignerInfo {
  display_name: string | null;
  agency_name: string | null;
  agency_logo_url: string | null;
  brand_color: string | null;
}

interface BriefMeta {
  status: "pending" | "completed" | "used";
  client_name: string | null;
  destination_hint: string | null;
  completed_at: string | null;
  designer: DesignerInfo;
}

function BriefForm() {
  const { token } = useParams({ from: "/brief/$token" });
  const [meta, setMeta] = useState<BriefMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [step, setStep] = useState<"intro" | number | "done">("intro");
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/brief-get-public?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const data = await r.json().catch(() => null);
        if (!r.ok) {
          setError(data?.error || `Erreur ${r.status}`);
        } else {
          setMeta(data);
          if (data?.status === "completed" || data?.status === "used") {
            setStep("done");
          }
        }
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      });
  }, [token]);

  const brand = meta?.designer.brand_color || "#0F6E56";
  const agencyName =
    meta?.designer.agency_name ||
    meta?.designer.display_name ||
    "Votre conseiller voyage";

  const total = BRIEF_QUESTIONS.length;
  const currentIdx = typeof step === "number" ? step : 0;
  const currentQ: BriefQuestion | null =
    typeof step === "number" ? BRIEF_QUESTIONS[step] : null;

  const setAnswer = (id: string, value: any) =>
    setAnswers((prev) => ({ ...prev, [id]: value }));

  const validateCurrent = (): boolean => {
    if (!currentQ) return true;
    if (!currentQ.required) return true;
    const v = answers[currentQ.id];
    if (currentQ.type === "multi") return Array.isArray(v) && v.length > 0;
    if (currentQ.type === "number") return v !== undefined && v !== "";
    return typeof v === "string" && v.trim().length > 0;
  };

  const next = () => {
    if (!validateCurrent()) {
      toast.error("Cette réponse est requise");
      return;
    }
    if (typeof step === "number") {
      if (step < total - 1) setStep(step + 1);
      else submit();
    }
  };

  const prev = () => {
    if (typeof step === "number" && step > 0) setStep(step - 1);
    else if (step === 0) setStep("intro");
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/brief-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, answers }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error || "Erreur lors de l'envoi");
        setSubmitting(false);
        return;
      }
      setStep("done");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-6">
        <div className="max-w-md text-center">
          <h1 className="font-display text-[28px] font-semibold text-foreground">
            Lien introuvable
          </h1>
          <p className="mt-3 text-[14px] text-muted-foreground">{error}</p>
          <p className="mt-6 text-[12.5px] text-text-soft">
            Vérifiez que le lien est complet ou contactez votre conseiller
            voyage.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen flex-col bg-canvas"
      style={{ ["--brand" as any]: brand }}
    >
      {/* Header avec branding designer */}
      <header className="border-b border-border/60 bg-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-6 py-5">
          {meta?.designer.agency_logo_url ? (
            <img
              src={meta.designer.agency_logo_url}
              alt=""
              className="h-9 max-w-[160px] object-contain"
            />
          ) : (
            <div
              className="grid h-9 w-9 place-items-center rounded-full text-white"
              style={{ backgroundColor: brand }}
            >
              <Sparkles className="h-4 w-4" />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-semibold text-foreground">
              {agencyName}
            </p>
            <p className="truncate text-[11.5px] text-muted-foreground">
              vous prépare un voyage sur mesure
            </p>
          </div>
        </div>
      </header>

      {/* Barre de progression */}
      {typeof step === "number" && (
        <div className="border-b border-border/40 bg-surface/40">
          <div className="mx-auto max-w-3xl px-6 py-2">
            <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${((step + 1) / total) * 100}%`,
                  backgroundColor: brand,
                }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Question {step + 1} sur {total}
            </p>
          </div>
        </div>
      )}

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl">
          {step === "intro" && (
            <IntroPanel
              meta={meta!}
              onStart={() => setStep(0)}
              brand={brand}
            />
          )}

          {typeof step === "number" && currentQ && (
            <QuestionPanel
              question={currentQ}
              value={answers[currentQ.id]}
              onChange={(v) => setAnswer(currentQ.id, v)}
              brand={brand}
              onNext={next}
              onPrev={prev}
              isFirst={step === 0}
              isLast={step === total - 1}
              submitting={submitting}
            />
          )}

          {step === "done" && (
            <DonePanel agencyName={agencyName} brand={brand} />
          )}
        </div>
      </main>

      <footer className="border-t border-border/40 px-6 py-5 text-center">
        <p className="text-[11px] text-text-soft">
          Propulsé par{" "}
          <a
            href="https://getroadbook.com"
            target="_blank"
            rel="noreferrer"
            className="font-medium hover:text-foreground"
          >
            Roadbook
          </a>
        </p>
      </footer>
    </div>
  );
}

/* ---------- Sub-panels ---------- */

function IntroPanel({
  meta,
  onStart,
  brand,
}: {
  meta: BriefMeta;
  onStart: () => void;
  brand: string;
}) {
  const greeting = meta.client_name
    ? `Bonjour ${meta.client_name},`
    : "Bonjour,";
  const agencyName =
    meta.designer.agency_name || meta.designer.display_name || "votre conseiller";

  return (
    <div className="rounded-2xl border border-border bg-surface p-8 shadow-soft-md sm:p-12">
      <div className="flex items-center gap-3">
        <span
          className="inline-block h-px w-8"
          style={{ backgroundColor: brand }}
        />
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Préparons votre voyage
        </span>
      </div>
      <h1 className="font-display mt-5 text-[36px] font-semibold leading-[1.1] tracking-tight text-foreground sm:text-[44px]">
        {greeting}
      </h1>
      <p className="mt-5 text-[15.5px] leading-relaxed text-muted-foreground">
        Avant de concevoir votre voyage, {agencyName} aimerait mieux comprendre
        vos envies. Cela prend <strong>environ 4 minutes</strong> et permettra
        de bâtir un itinéraire vraiment taillé pour vous.
      </p>
      {meta.destination_hint && (
        <p className="mt-3 text-[14px] text-muted-foreground">
          Destination envisagée :{" "}
          <strong className="text-foreground">{meta.destination_hint}</strong>
        </p>
      )}
      <Button
        onClick={onStart}
        className="mt-8 h-12 gap-2 rounded-full px-8 text-[14px] font-medium"
        style={{ backgroundColor: brand, color: "white" }}
      >
        Commencer
        <ArrowRight className="h-4 w-4" />
      </Button>
      <p className="mt-5 text-[11.5px] text-text-soft">
        Vos réponses sont confidentielles et n'iront qu'à {agencyName}.
      </p>
    </div>
  );
}

function QuestionPanel({
  question,
  value,
  onChange,
  brand,
  onNext,
  onPrev,
  isFirst,
  isLast,
  submitting,
}: {
  question: BriefQuestion;
  value: any;
  onChange: (v: any) => void;
  brand: string;
  onNext: () => void;
  onPrev: () => void;
  isFirst: boolean;
  isLast: boolean;
  submitting: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-8 shadow-soft-md sm:p-12">
      <h2 className="font-display text-[26px] font-semibold leading-tight tracking-tight text-foreground sm:text-[32px]">
        {question.title}
        {question.required && (
          <span className="ml-1.5 text-[20px]" style={{ color: brand }}>
            *
          </span>
        )}
      </h2>
      {question.subtitle && (
        <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
          {question.subtitle}
        </p>
      )}

      <div className="mt-7">
        <QuestionInput
          question={question}
          value={value}
          onChange={onChange}
          brand={brand}
        />
      </div>

      <div className="mt-10 flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={onPrev}
          disabled={isFirst || submitting}
          className="gap-1.5 text-[13px]"
        >
          <ArrowLeft className="h-4 w-4" />
          Précédent
        </Button>
        <Button
          type="button"
          onClick={onNext}
          disabled={submitting}
          className="h-11 gap-2 rounded-full px-6 text-[13.5px]"
          style={{ backgroundColor: brand, color: "white" }}
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isLast ? (
            "Envoyer mes réponses"
          ) : (
            "Suivant"
          )}
          {!submitting && !isLast && <ArrowRight className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

function QuestionInput({
  question,
  value,
  onChange,
  brand,
}: {
  question: BriefQuestion;
  value: any;
  onChange: (v: any) => void;
  brand: string;
}) {
  if (question.type === "text") {
    return (
      <Input
        autoFocus
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={question.placeholder}
        className="h-12 text-[15px]"
      />
    );
  }
  if (question.type === "longtext") {
    return (
      <Textarea
        autoFocus
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={question.placeholder}
        rows={4}
        className="text-[14.5px]"
      />
    );
  }
  if (question.type === "number") {
    return (
      <Input
        autoFocus
        type="number"
        min={1}
        max={365}
        value={value ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === "" ? null : Number(v));
        }}
        placeholder={question.placeholder}
        className="h-12 max-w-[200px] text-[18px]"
      />
    );
  }
  if (question.type === "single") {
    const opts = question.options ?? [];
    return (
      <div className="grid gap-2.5 sm:grid-cols-2">
        {opts.map((opt) => {
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                "flex flex-col items-start rounded-xl border p-4 text-left transition-all",
                selected
                  ? "shadow-soft"
                  : "border-border/60 bg-surface hover:border-border hover:bg-surface-warm/50",
              )}
              style={
                selected
                  ? { borderColor: brand, backgroundColor: `${brand}10` }
                  : undefined
              }
            >
              <span
                className="text-[14.5px] font-medium"
                style={{ color: selected ? brand : undefined }}
              >
                {opt.label}
              </span>
              {opt.hint && (
                <span className="mt-0.5 text-[12px] text-muted-foreground">
                  {opt.hint}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }
  if (question.type === "multi") {
    const opts = question.options ?? [];
    const arr: string[] = Array.isArray(value) ? value : [];
    const toggle = (v: string) => {
      onChange(
        arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v],
      );
    };
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {opts.map((opt) => {
          const selected = arr.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              className={cn(
                "flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-all",
                selected
                  ? "shadow-soft"
                  : "border-border/60 bg-surface hover:border-border hover:bg-surface-warm/50",
              )}
              style={
                selected
                  ? { borderColor: brand, backgroundColor: `${brand}10` }
                  : undefined
              }
            >
              <span
                className="text-[14px] font-medium"
                style={{ color: selected ? brand : undefined }}
              >
                {opt.label}
              </span>
              <span
                className={cn(
                  "grid h-5 w-5 place-items-center rounded-full border text-[10px] font-bold",
                  selected
                    ? "text-white"
                    : "border-border bg-transparent text-transparent",
                )}
                style={
                  selected
                    ? { backgroundColor: brand, borderColor: brand }
                    : undefined
                }
              >
                ✓
              </span>
            </button>
          );
        })}
      </div>
    );
  }
  return null;
}

function DonePanel({
  agencyName,
  brand,
}: {
  agencyName: string;
  brand: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-8 text-center shadow-soft-md sm:p-12">
      <div
        className="mx-auto grid h-14 w-14 place-items-center rounded-full"
        style={{ backgroundColor: `${brand}15` }}
      >
        <CheckCircle2 className="h-7 w-7" style={{ color: brand }} />
      </div>
      <h1 className="font-display mt-6 text-[32px] font-semibold leading-tight text-foreground sm:text-[40px]">
        Merci !
      </h1>
      <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
        Vos réponses ont été transmises à <strong>{agencyName}</strong>. Vous
        recevrez une proposition de voyage sur mesure très bientôt.
      </p>
      <p className="mt-6 text-[12.5px] text-text-soft">
        Vous pouvez fermer cette page.
      </p>
    </div>
  );
}
