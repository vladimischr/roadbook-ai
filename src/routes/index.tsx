import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Sparkles,
  Compass,
  FileText,
  PenLine,
  MapPin,
  Quote,
  Upload,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Roadbook.ai — Roadbooks de voyage sur-mesure" },
      {
        name: "description",
        content:
          "Composez en quelques minutes des roadbooks éditoriaux pour vos voyageurs. L'IA pose la trame, vous gardez la main.",
      },
    ],
  }),
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <Hero />
        <ThreeWays />
        <Pillars />
        <HowItWorks />
        <ShowcaseStrip />
        <Testimonial />
        <CTASection />
      </main>
      <SiteFooter />
    </div>
  );
}

/* ---------- Header ---------- */

function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/40 bg-background/85 backdrop-blur-xl">
      <div className="container-editorial flex items-center justify-between px-6 py-4 sm:px-10">
        <Logo />
        <nav className="flex items-center gap-2 sm:gap-3">
          <Link to="/pricing">
            <Button
              variant="ghost"
              size="sm"
              className="text-[13px]"
            >
              Tarifs
            </Button>
          </Link>
          <Link to="/login">
            <Button
              variant="ghost"
              size="sm"
              className="hidden text-[13px] sm:inline-flex"
            >
              Se connecter
            </Button>
          </Link>
          <Link to="/login">
            <Button
              size="sm"
              className="h-9 gap-1.5 rounded-full px-4 text-[13px] transition-smooth hover:scale-[1.02]"
            >
              Commencer
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}

/* ---------- Hero ---------- */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Soft warm gradient backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-b from-surface-warm/60 via-background to-background"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[640px] w-[1100px] -translate-x-1/2 rounded-full bg-primary-soft/40 blur-[120px]"
      />

      <div className="container-editorial px-6 pb-24 pt-20 sm:px-10 sm:pb-32 sm:pt-28 lg:pb-40 lg:pt-32">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-surface px-3.5 py-1.5 shadow-soft">
            <span className="rule-warm" aria-hidden />
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
              Pour travel designers indépendants
            </span>
          </div>

          <h1 className="font-display mt-8 text-[44px] font-semibold leading-[1.02] tracking-tight text-foreground sm:text-[68px] lg:text-[84px]">
            Vos itinéraires,
            <br className="hidden sm:block" />{" "}
            <span className="italic text-primary">en livret</span>
            <br className="hidden sm:block" />{" "}
            éditorial.
          </h1>

          <p className="mx-auto mt-8 max-w-xl text-[16px] leading-[1.65] text-muted-foreground sm:text-[18px]">
            IA, saisie manuelle ou import Excel — apportez votre matière,
            Roadbook.ai en fait un document beau à lire et prêt à livrer
            à vos voyageurs.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/login">
              <Button
                size="lg"
                className="h-12 gap-2 rounded-full px-7 text-[14px] font-medium shadow-[0_4px_14px_-4px_rgba(15,110,86,0.4)] transition-smooth hover:scale-[1.02] hover:shadow-[0_6px_18px_-4px_rgba(15,110,86,0.55)]"
              >
                <Sparkles className="h-4 w-4" />
                Créer mon premier roadbook
              </Button>
            </Link>
            <a
              href="#trois-facons"
              className="text-[13px] font-medium text-muted-foreground transition hover:text-foreground"
            >
              Voir les trois modes →
            </a>
          </div>

          <p className="mt-6 text-[12px] text-text-soft">
            Connexion par lien magique · Pas de carte bancaire pour démarrer
          </p>
        </div>

        {/* Decorative editorial card preview — illustration “à la main” */}
        <HeroPreview />
      </div>
    </section>
  );
}

function HeroPreview() {
  return (
    <div className="relative mx-auto mt-20 max-w-4xl">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 -translate-y-6 rounded-[28px] bg-gradient-to-br from-primary/10 via-accent-warm/10 to-transparent blur-2xl"
      />
      <div className="overflow-hidden rounded-[24px] border border-border/60 bg-surface shadow-soft-lg">
        {/* Mock cover band */}
        <div
          className="relative h-44 w-full overflow-hidden bg-gradient-to-br from-primary via-primary-light to-primary-dark sm:h-56"
          aria-hidden
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.18),_transparent_70%)]" />
          <div className="absolute inset-x-0 bottom-0 px-8 pb-7 pt-12 text-white sm:px-10">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.32em] text-white/75">
              Roadbook
            </p>
            <h3 className="font-display mt-2 text-[34px] font-semibold leading-none sm:text-[44px]">
              Namibie
            </h3>
            <p className="font-display mt-2 text-[14px] italic text-white/85 sm:text-[16px]">
              Du Namib aux plaines d'Etosha
            </p>
          </div>
        </div>

        {/* Mock body — three days */}
        <div className="grid gap-px bg-border/40 sm:grid-cols-3">
          {[
            {
              day: "Jour 1",
              date: "15 sept.",
              stage: "Windhoek → Naukluft",
              type: "Lodge",
              km: "320 km",
            },
            {
              day: "Jour 2",
              date: "16 sept.",
              stage: "Sesriem · Sossusvlei",
              type: "Campsite",
              km: "130 km",
            },
            {
              day: "Jour 3",
              date: "17 sept.",
              stage: "Swakopmund",
              type: "Boutique hôtel",
              km: "350 km",
            },
          ].map((d) => (
            <div key={d.day} className="bg-surface px-6 py-5">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                {d.day} — {d.date}
              </p>
              <p className="font-display mt-2 text-[18px] font-semibold leading-tight text-foreground">
                {d.stage}
              </p>
              <div className="mt-3 flex items-center gap-3 text-[12px] text-muted-foreground">
                <span className="status-pill bg-accent-warm-soft text-foreground">
                  {d.type}
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="text-foreground/60">→</span>
                  <span className="font-medium text-foreground">{d.km}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating ambient pill */}
      <div className="pointer-events-none absolute -right-3 -top-3 hidden rounded-full border border-border/60 bg-surface px-3.5 py-1.5 shadow-soft sm:flex sm:items-center sm:gap-1.5">
        <Sparkles className="h-3 w-3 text-primary" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
          Généré en 47s
        </span>
      </div>
    </div>
  );
}

/* ---------- Three input modes ---------- */

function ThreeWays() {
  const ways = [
    {
      icon: Sparkles,
      eyebrow: "Mode 01 — IA",
      title: "L'IA propose une trame",
      body:
        "Vous donnez le brief — destination, dates, profil, modalité. L'IA dessine le squelette du voyage en quelques secondes. Idéal pour défricher une nouvelle destination ou partir d'un brouillon.",
      footer: "Pour démarrer rapidement.",
    },
    {
      icon: PenLine,
      eyebrow: "Mode 02 — Manuel",
      title: "Vous composez à la main",
      body:
        "Vous connaissez les lodges qu'aucune IA n'a référencés, les chemins de traverse, les gens à appeler. Vous saisissez les étapes, l'IA met le tout en forme éditoriale autour.",
      footer: "Pour vos coins secrets.",
      highlighted: true,
    },
    {
      icon: Upload,
      eyebrow: "Mode 03 — Import",
      title: "Vous importez votre Excel",
      body:
        "Votre programme existe déjà sur tableur ? Vous le déposez tel quel, on le passe au format éditorial, vous corrigez si besoin. Quelques minutes au lieu d'une demi-journée de copier-coller.",
      footer: "Pour vos programmes existants.",
    },
  ];

  return (
    <section
      id="trois-facons"
      className="border-t border-border/40 bg-background"
    >
      <div className="container-editorial px-6 py-24 sm:px-10 sm:py-32">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-3">
            <span className="rule-warm" aria-hidden />
            <span className="eyebrow">Trois façons de composer</span>
            <span className="rule-warm" aria-hidden />
          </div>
          <h2 className="font-display mt-6 text-[34px] font-semibold leading-[1.05] tracking-tight text-foreground sm:text-[44px]">
            L'outil s'adapte à votre matière, pas l'inverse.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[15.5px] leading-relaxed text-muted-foreground">
            Roadbook.ai n'est pas qu'un outil de génération IA. C'est la
            <em> couche de design </em>
            qui transforme votre programme — d'où qu'il vienne — en livret
            éditorial.
          </p>
        </div>

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {ways.map((w) => (
            <article
              key={w.title}
              className={`relative flex flex-col rounded-2xl border bg-surface p-7 transition-smooth hover:-translate-y-0.5 ${
                w.highlighted
                  ? "border-primary/40 shadow-soft-md"
                  : "border-border/60 shadow-soft"
              }`}
            >
              <div
                className={`grid h-11 w-11 place-items-center rounded-full ${
                  w.highlighted
                    ? "bg-primary text-primary-foreground"
                    : "bg-primary-soft text-primary"
                }`}
              >
                <w.icon className="h-4.5 w-4.5" strokeWidth={1.6} />
              </div>
              <p className="mt-7 text-[10.5px] font-semibold uppercase tracking-[0.22em] text-accent-warm">
                {w.eyebrow}
              </p>
              <h3 className="font-display mt-3 text-[22px] font-semibold leading-tight text-foreground">
                {w.title}
              </h3>
              <p className="mt-3 text-[14.5px] leading-relaxed text-muted-foreground">
                {w.body}
              </p>
              <div className="flex-1" />
              <p className="mt-6 border-t border-border/50 pt-4 text-[12.5px] font-medium italic text-foreground/70">
                {w.footer}
              </p>
            </article>
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-xl text-center text-[13.5px] leading-relaxed text-muted-foreground">
          Quel que soit le mode choisi, vous arrivez sur le même livret —
          modifiable étape par étape, exportable en PDF, partageable en
          ligne.
        </p>
      </div>
    </section>
  );
}

/* ---------- Pillars (3 promises) ---------- */

function Pillars() {
  const items = [
    {
      icon: PenLine,
      eyebrow: "Trame éditoriale",
      title: "Un récit, pas un tableur",
      body:
        "Chaque jour est rédigé comme une page de carnet : narrative concise, hébergement nommé, conseils ancrés dans le réel — quelle que soit la source de vos étapes.",
    },
    {
      icon: MapPin,
      eyebrow: "Carte intégrée",
      title: "Distances, durées, tracés réels",
      body:
        "Géocodage automatique des étapes via Google Maps. Tracé routier calculé entre chaque jour. Vous éditez, ça se met à jour.",
    },
    {
      icon: FileText,
      eyebrow: "Sortie PDF",
      title: "Prêt à envoyer au client",
      body:
        "Export PDF éditorial avec couverture, carte, jours, hébergements et carnet de contacts. En un clic, en haute qualité.",
    },
  ];

  return (
    <section className="border-t border-border/40 bg-surface-warm/40">
      <div className="container-editorial px-6 py-24 sm:px-10 sm:py-32">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-3">
            <span className="rule-warm" aria-hidden />
            <span className="eyebrow">Le résultat, toujours</span>
            <span className="rule-warm" aria-hidden />
          </div>
          <h2 className="font-display mt-6 text-[34px] font-semibold leading-[1.05] tracking-tight text-foreground sm:text-[44px]">
            Le même livret premium, peu importe la source.
          </h2>
        </div>

        <div className="mt-16 grid gap-px overflow-hidden rounded-3xl border border-border/60 bg-border/40 sm:grid-cols-3">
          {items.map((it) => (
            <article
              key={it.title}
              className="bg-surface px-8 py-10 transition hover:bg-surface-warm/60"
            >
              <div className="grid h-10 w-10 place-items-center rounded-full bg-primary-soft text-primary">
                <it.icon className="h-4 w-4" strokeWidth={1.6} />
              </div>
              <p className="mt-7 text-[10.5px] font-semibold uppercase tracking-[0.22em] text-accent-warm">
                {it.eyebrow}
              </p>
              <h3 className="font-display mt-3 text-[22px] font-semibold leading-tight text-foreground">
                {it.title}
              </h3>
              <p className="mt-3 text-[14.5px] leading-relaxed text-muted-foreground">
                {it.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- How it works ---------- */

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Vous apportez votre matière",
      body:
        "Brief pour l'IA, étapes saisies à la main, ou fichier Excel. Trois entrées, un même destin éditorial.",
    },
    {
      n: "02",
      title: "Le livret prend forme",
      body:
        "L'outil structure chaque jour, calcule les distances, géocode les étapes, dessine la carte.",
    },
    {
      n: "03",
      title: "Vous éditez",
      body:
        "Réordonner, ajouter une étape, fixer un lodge précis. Recalcul intelligent à la demande.",
    },
    {
      n: "04",
      title: "Vous livrez",
      body:
        "Export PDF éditorial, prêt à envoyer. Ou partagez le lien sécurisé du carnet en ligne.",
    },
  ];

  return (
    <section
      id="fonctionnement"
      className="border-t border-border/40 bg-background"
    >
      <div className="container-editorial px-6 py-24 sm:px-10 sm:py-32">
        <div className="grid gap-12 lg:grid-cols-[1fr_2fr] lg:gap-20">
          <div>
            <div className="flex items-center gap-3">
              <span className="rule-warm" aria-hidden />
              <span className="eyebrow">Fonctionnement</span>
            </div>
            <h2 className="font-display mt-6 text-[34px] font-semibold leading-[1.05] tracking-tight text-foreground sm:text-[44px]">
              Quatre temps, un roadbook.
            </h2>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-muted-foreground">
              Pensé pour les agences indépendantes qui veulent récupérer
              du temps sans sacrifier la finition de leurs livrables.
            </p>
          </div>

          <ol className="space-y-2">
            {steps.map((s, i) => (
              <li
                key={s.n}
                className="group grid grid-cols-[auto_1fr] gap-6 border-t border-border/60 py-7 transition hover:bg-surface-warm/40 sm:gap-10"
                style={{
                  borderBottom:
                    i === steps.length - 1
                      ? "1px solid var(--color-border)"
                      : undefined,
                }}
              >
                <span className="font-display text-[40px] font-semibold leading-none text-accent-warm sm:text-[52px]">
                  {s.n}
                </span>
                <div className="pt-1.5 sm:pt-3">
                  <h3 className="font-display text-[22px] font-semibold leading-tight text-foreground sm:text-[24px]">
                    {s.title}
                  </h3>
                  <p className="mt-2.5 max-w-lg text-[14.5px] leading-relaxed text-muted-foreground">
                    {s.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ---------- Showcase strip — destinations ---------- */

function ShowcaseStrip() {
  const destinations = [
    "Namibie",
    "Tanzanie",
    "Patagonie",
    "Japon",
    "Islande",
    "Maroc",
    "Vietnam",
    "Pérou",
    "Jordanie",
    "Sri Lanka",
  ];
  return (
    <section className="border-t border-border/40 bg-surface-warm/30 py-16 sm:py-20">
      <div className="container-editorial px-6 sm:px-10">
        <div className="flex items-center justify-center gap-3">
          <span className="rule-warm" aria-hidden />
          <p className="eyebrow-warm">Destinations préparées par les agences</p>
          <span className="rule-warm" aria-hidden />
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 sm:gap-x-12">
          {destinations.map((d) => (
            <span
              key={d}
              className="font-display text-[18px] italic text-foreground/60 sm:text-[22px]"
            >
              {d}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Testimonial ---------- */

function Testimonial() {
  return (
    <section className="border-t border-border/40 bg-background">
      <div className="container-editorial px-6 py-24 sm:px-10 sm:py-32">
        <figure className="mx-auto max-w-3xl">
          <Quote className="h-8 w-8 text-accent-warm" strokeWidth={1.4} />
          <blockquote className="font-display mt-8 text-[28px] font-medium leading-[1.3] text-foreground sm:text-[36px]">
            <span className="italic">
              « Avant, je passais huit heures à mettre en page un roadbook.
              Aujourd'hui, je peaufine — et le voyageur reçoit un livret qui
              ressemble enfin à mon agence. »
            </span>
          </blockquote>
          <figcaption className="mt-10 flex items-center gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-primary-soft font-display text-[18px] font-semibold text-primary">
              C
            </span>
            <div>
              <p className="text-[14px] font-semibold text-foreground">
                Camille Vidal
              </p>
              <p className="text-[12.5px] text-muted-foreground">
                Travel designer indépendante · Voyages d'Auteur
              </p>
            </div>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

/* ---------- CTA ---------- */

function CTASection() {
  return (
    <section className="relative overflow-hidden border-t border-border/40">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-br from-primary via-primary to-primary-dark"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.18),_transparent_60%)]"
      />
      <div className="container-editorial px-6 py-24 text-center sm:px-10 sm:py-32">
        <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-white/75">
          Prêt à composer
        </p>
        <h2 className="font-display mx-auto mt-6 max-w-3xl text-[40px] font-semibold leading-[1.05] tracking-tight text-white sm:text-[56px]">
          Votre prochain voyage,
          <br />
          <span className="italic">livré dans la matinée.</span>
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-[15.5px] leading-relaxed text-white/85">
          Connectez-vous avec un lien magique et créez votre premier
          roadbook en moins de cinq minutes.
        </p>
        <div className="mt-10 flex justify-center">
          <Link to="/login">
            <Button
              size="lg"
              className="h-12 gap-2 rounded-full bg-white px-7 text-[14px] font-medium text-primary transition-smooth hover:scale-[1.02] hover:bg-white/95"
            >
              <Compass className="h-4 w-4" />
              Démarrer maintenant
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ---------- Footer ---------- */

function SiteFooter() {
  return (
    <footer className="border-t border-border/40 bg-background">
      <div className="container-editorial px-6 py-12 sm:px-10">
        <div className="flex flex-col items-start gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <Logo />
            <p className="text-[12.5px] text-muted-foreground">
              Pensé pour les travel designers indépendants.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-[12.5px] text-muted-foreground">
            <Link
              to="/pricing"
              className="transition hover:text-foreground"
            >
              Tarifs
            </Link>
            <Link
              to="/cgu"
              className="transition hover:text-foreground"
            >
              CGU
            </Link>
            <Link
              to="/confidentialite"
              className="transition hover:text-foreground"
            >
              Confidentialité
            </Link>
            <Link
              to="/mentions-legales"
              className="transition hover:text-foreground"
            >
              Mentions légales
            </Link>
            <a
              href="mailto:contact@roadbook.ai"
              className="transition hover:text-foreground"
            >
              Contact
            </a>
          </nav>
        </div>
        <p className="mt-8 border-t border-border/30 pt-6 text-[11.5px] text-text-soft">
          © {new Date().getFullYear()} Roadbook.ai
        </p>
      </div>
    </footer>
  );
}
