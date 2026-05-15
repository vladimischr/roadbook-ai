import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  Check,
  Coins,
  Heart,
  Users,
  Sparkles,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

// ============================================================================
// /affiliation — page publique du programme d'affiliation
// ============================================================================
// Trois rôles :
//  1. Pitch : pourquoi devenir affilié (30% récurrent 12 mois)
//  2. Formulaire de candidature → /api/affiliate-apply
//  3. Lien vers /affiliate (dashboard) pour les déjà-affiliés
//
// Cible : travel designers freelance, blogueurs voyage, formateurs en école
// hôtelière. Ton : "tu", chaleureux, pro, sans jargon.

export const Route = createFileRoute("/affiliation")({
  component: AffiliationPage,
  head: () => ({
    meta: [
      { title: "Programme d'affiliation — Roadbook.ai" },
      {
        name: "description",
        content:
          "Touche 30% de chaque abonnement pendant 12 mois en recommandant Roadbook.ai à des travel designers.",
      },
      { property: "og:title", content: "Programme d'affiliation — Roadbook.ai" },
      {
        property: "og:description",
        content:
          "Touche 30% de chaque abonnement pendant 12 mois en recommandant Roadbook.ai à des travel designers.",
      },
      { property: "og:url", content: "https://getroadbook.com/affiliation" },
    ],
    links: [
      { rel: "canonical", href: "https://getroadbook.com/affiliation" },
    ],
  }),
});

function AffiliationPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pitch, setPitch] = useState("");
  const [socialUrl, setSocialUrl] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<null | "pending" | "already_active" | "already_pending">(
    null,
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !pitch) return;
    setSending(true);
    try {
      const res = await fetch("/api/affiliate-apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          pitch,
          social_url: socialUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Erreur lors de l'envoi.");
      } else {
        setSent(data.status ?? "pending");
        toast.success(data.message ?? "Candidature envoyée.");
      }
    } catch (err) {
      toast.error("Erreur réseau. Réessaie dans un instant.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ===== Header ===== */}
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/">
            <Logo />
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link
              to="/pricing"
              className="text-muted-foreground hover:text-foreground"
            >
              Tarifs
            </Link>
            <Link
              to="/login"
              className="text-muted-foreground hover:text-foreground"
            >
              Connexion
            </Link>
          </nav>
        </div>
      </header>

      {/* ===== Hero ===== */}
      <section className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" />
          Programme d'affiliation
        </div>
        <h1 className="mt-6 text-4xl font-bold tracking-tight md:text-5xl">
          Recommande Roadbook AI.{" "}
          <span className="text-primary">Touche 30%</span> récurrent
          pendant 12 mois.
        </h1>
        <p className="mt-6 text-lg text-muted-foreground">
          Tu connais des travel designers freelance ou des agences boutique ?
          Partage ton code, ils signent, tu gagnes — pendant un an.
        </p>

        {/* Banner pour les users : code instantané sans candidature */}
        <div className="mx-auto mt-8 max-w-2xl rounded-2xl border-2 border-primary/30 bg-primary/5 p-5">
          <p className="text-sm">
            <b>Tu as déjà un compte Roadbook AI ?</b>{" "}
            Pas besoin de candidater. Connecte-toi et active ton code en 1 clic.
          </p>
          <Button asChild className="mt-4" size="sm">
            <Link to="/affiliate">
              Activer mon programme
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* ===== Comment ça marche ===== */}
      <section className="mx-auto max-w-5xl px-4 pb-16">
        <div className="grid gap-6 md:grid-cols-3">
          <Card
            icon={<Users className="h-5 w-5" />}
            title="1. Tu candidates"
            text="Tu remplis le formulaire ci-dessous. On valide ta demande sous 48h et on t'envoie ton code personnel (ex : SOPHIE25)."
          />
          <Card
            icon={<Heart className="h-5 w-5" />}
            title="2. Tu partages"
            text="Tu envoies ton lien getroadbook.com?ref=TONCODE à tes contacts. Eux profitent de -20% sur leur premier mois."
          />
          <Card
            icon={<Coins className="h-5 w-5" />}
            title="3. Tu touches 30%"
            text="Pour chaque filleul qui souscrit, tu touches 30% de son abonnement pendant 12 mois. Payé tous les mois par virement."
          />
        </div>
      </section>

      {/* ===== Combien je peux gagner ===== */}
      <section className="mx-auto max-w-4xl px-4 pb-16">
        <div className="rounded-2xl border bg-muted/30 p-8">
          <h2 className="text-2xl font-bold">Concrètement, combien ?</h2>
          <p className="mt-2 text-muted-foreground">
            Voici trois scénarios réalistes, sur 12 mois :
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Scenario
              count="3 filleuls"
              plan="plan Solo (29€/mois)"
              total="313€"
              detail="3 × 8,70€ × 12 mois"
            />
            <Scenario
              count="10 filleuls"
              plan="plan Solo (29€/mois)"
              total="1 044€"
              detail="10 × 8,70€ × 12 mois"
              highlight
            />
            <Scenario
              count="5 agences"
              plan="plan Atelier (99€/mois)"
              total="1 782€"
              detail="5 × 29,70€ × 12 mois"
            />
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Calcul : abonnement × 30% × nombre de mois où le filleul reste actif
            (max 12). Si le filleul reste abonné au-delà de 12 mois, tu gardes
            tout — il reste juste hors de ta période de commission.
          </p>
        </div>
      </section>

      {/* ===== Qui peut candidater ===== */}
      <section className="mx-auto max-w-4xl px-4 pb-16">
        <h2 className="text-2xl font-bold">Qui peut candidater ?</h2>
        <ul className="mt-6 space-y-3 text-base">
          <li className="flex gap-3">
            <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
            <span>
              <b>Travel designers</b> freelance ou en agence (déjà clients ou pas)
            </span>
          </li>
          <li className="flex gap-3">
            <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
            <span>
              <b>Blogueurs et créateurs voyage</b> avec une audience qualifiée
              (LinkedIn, Instagram, YouTube, newsletter)
            </span>
          </li>
          <li className="flex gap-3">
            <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
            <span>
              <b>Formateurs et écoles</b> de tourisme (ESTHUA, hôtellerie, MBA
              tourisme)
            </span>
          </li>
          <li className="flex gap-3">
            <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
            <span>
              <b>Consultants</b> en transformation digitale pour agences de voyage
            </span>
          </li>
        </ul>
        <p className="mt-6 text-sm text-muted-foreground">
          Nos règles : on refuse l'auto-parrainage, le spam et tout achat de
          trafic incentivé. La qualité prime sur le volume.
        </p>
      </section>

      {/* ===== Formulaire ===== */}
      <section id="apply" className="mx-auto max-w-2xl px-4 pb-24">
        <div className="rounded-2xl border bg-card p-8 shadow-sm">
          <h2 className="text-2xl font-bold">Candidate au programme</h2>
          <p className="mt-2 text-muted-foreground">
            Ce formulaire est pour les <b>partenaires externes</b> (blogueurs,
            formateurs, écoles, consultants) qui n'ont pas de compte
            Roadbook AI. Réponse sous 48h.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Si tu as déjà un compte Roadbook AI, va plutôt sur{" "}
            <Link to="/affiliate" className="text-primary underline">
              ton dashboard affiliation
            </Link>{" "}
            (code instantané, pas de candidature).
          </p>

          {sent === "pending" ? (
            <div className="mt-8 rounded-lg border border-primary/30 bg-primary/5 p-6 text-center">
              <Check className="mx-auto h-10 w-10 text-primary" />
              <h3 className="mt-4 text-lg font-semibold">
                Candidature reçue
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                On revient vers toi sous 48h avec ton code personnel par email.
              </p>
            </div>
          ) : sent === "already_active" ? (
            <div className="mt-8 rounded-lg border bg-muted/30 p-6 text-center">
              <h3 className="text-lg font-semibold">Tu as déjà un code actif</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Connecte-toi pour retrouver ton code et tes stats.
              </p>
              <Button asChild className="mt-4">
                <Link to="/affiliate">Voir mon dashboard</Link>
              </Button>
            </div>
          ) : sent === "already_pending" ? (
            <div className="mt-8 rounded-lg border bg-muted/30 p-6 text-center">
              <h3 className="text-lg font-semibold">
                Candidature déjà en cours
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                On revient vers toi sous 48h.
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-medium" htmlFor="aff-name">
                  Nom complet
                </label>
                <Input
                  id="aff-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="mt-1"
                  placeholder="Sophie Martin"
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="aff-email">
                  Email
                </label>
                <Input
                  id="aff-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1"
                  placeholder="sophie@agencevoyage.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="aff-social">
                  LinkedIn / site / Instagram (facultatif)
                </label>
                <Input
                  id="aff-social"
                  type="url"
                  value={socialUrl}
                  onChange={(e) => setSocialUrl(e.target.value)}
                  className="mt-1"
                  placeholder="https://linkedin.com/in/sophie-martin"
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="aff-pitch">
                  Pourquoi tu nous rejoindrais
                </label>
                <Textarea
                  id="aff-pitch"
                  value={pitch}
                  onChange={(e) => setPitch(e.target.value)}
                  required
                  minLength={20}
                  rows={5}
                  className="mt-1"
                  placeholder="Je suis travel designer freelance depuis 4 ans, j'ai un réseau d'environ 30 confrères et je publie sur LinkedIn 2x/semaine sur le métier..."
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Quelques lignes suffisent. On veut juste comprendre qui tu es
                  et à qui tu pourrais en parler.
                </p>
              </div>
              <Button
                type="submit"
                size="lg"
                disabled={sending || !name || !email || !pitch}
                className="w-full"
              >
                {sending ? "Envoi..." : "Envoyer ma candidature"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}

function Card({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function Scenario({
  count,
  plan,
  total,
  detail,
  highlight,
}: {
  count: string;
  plan: string;
  total: string;
  detail: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        highlight
          ? "rounded-lg border-2 border-primary bg-background p-5"
          : "rounded-lg border bg-background p-5"
      }
    >
      <div className="text-sm text-muted-foreground">{count}</div>
      <div className="text-xs text-muted-foreground">{plan}</div>
      <div className="mt-3 text-3xl font-bold">{total}</div>
      <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
    </div>
  );
}
