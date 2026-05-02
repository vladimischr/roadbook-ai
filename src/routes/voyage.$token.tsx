import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Loader2,
  MapPin,
  Plane,
  BedDouble,
  Tent,
  Hotel,
  Home as HomeIcon,
  Building2,
  Phone,
  Mail,
  Compass,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useDestinationCover } from "@/lib/useDestinationCover";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";

// ============================================================================
// /voyage/{token} — vue publique d'un roadbook (lien envoyé au voyageur)
// ============================================================================
// Pas d'auth requise. L'API publique /api/shared-roadbook valide le token
// et retourne le contenu si le roadbook est en status "ready" ou "delivered".
// Optimisé mobile (la plupart des voyageurs ouvriront le lien sur leur
// téléphone pendant le voyage).

export const Route = createFileRoute("/voyage/$token")({
  component: VoyagePublic,
  head: ({ params }) => ({
    meta: [
      { title: "Votre carnet de voyage" },
      {
        name: "description",
        content:
          "Carnet de voyage préparé sur Roadbook.ai — étapes, hébergements, conseils pratiques.",
      },
      // Empêche l'indexation : ces liens contiennent des données personnelles
      // (noms de clients, contacts), ils ne doivent pas finir sur Google.
      { name: "robots", content: "noindex, nofollow" },
      // PWA — apparence quand installée sur écran d'accueil iOS
      { name: "apple-mobile-web-app-capable", content: "yes" },
      {
        name: "apple-mobile-web-app-status-bar-style",
        content: "black-translucent",
      },
      { name: "apple-mobile-web-app-title", content: "Carnet de voyage" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
    ],
    links: [
      // Manifest dynamique : nom = destination, couleur = brand agence
      {
        rel: "manifest",
        href: `/api/voyage-manifest?token=${encodeURIComponent(params.token)}`,
      },
      // Apple touch icon : SVG dynamique avec initiale agence + brand color
      {
        rel: "apple-touch-icon",
        href: `/api/voyage-icon?token=${encodeURIComponent(params.token)}&size=192`,
      },
    ],
  }),
});

interface SharedRoadbook {
  id: string;
  client_name: string;
  destination: string;
  start_date: string | null;
  end_date: string | null;
  travelers_count: number | null;
  traveler_profile: string | null;
  theme: string | null;
  budget_range: string | null;
  generation_mode: string;
  content: any;
  status: string;
  created_at: string;
  updated_at: string;
}

function VoyagePublic() {
  const { token } = Route.useParams();
  const [roadbook, setRoadbook] = useState<SharedRoadbook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetch(`/api/shared-roadbook?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const text = await res.text();
        let parsed: any = null;
        try {
          parsed = JSON.parse(text);
        } catch {}
        if (!active) return;
        if (!res.ok) {
          setError(parsed?.error || `Erreur ${res.status}`);
          setLoading(false);
          return;
        }
        setRoadbook(parsed as SharedRoadbook);
        setLoading(false);
      })
      .catch((e) => {
        if (!active) return;
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  // Tracking de vue — fire-and-forget. L'erreur ne doit jamais affecter le
  // visiteur. Anti-spam côté serveur : 1 vue max par 60s sur le même token.
  useEffect(() => {
    if (!token) return;
    fetch(`/api/track-view?token=${encodeURIComponent(token)}`, {
      method: "POST",
      keepalive: true,
    }).catch(() => {
      /* ignore */
    });
  }, [token]);

  // Enregistrement du Service Worker pour mode offline. Scope limité à
  // /voyage/ pour ne pas interférer avec les pages designer.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw-voyage.js", { scope: "/voyage/" })
      .catch((err) => console.warn("[voyage] SW registration failed:", err));
  }, []);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !roadbook) {
    return <ErrorState message={error || "Roadbook introuvable"} />;
  }

  // brand color de l'agence (si dispo dans content) pour styliser le prompt PWA
  const brand = (roadbook.content?.brand_color as string | undefined) ?? undefined;

  return (
    <>
      <RoadbookView roadbook={roadbook} />
      <PWAInstallPrompt brand={brand} />
    </>
  );
}

/* ---------- Error state ---------- */

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicHeader />
      <main className="grid flex-1 place-items-center px-6">
        <div className="max-w-md text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-amber-50">
            <Compass className="h-7 w-7 text-amber-700" strokeWidth={1.5} />
          </div>
          <h1 className="font-display mt-6 text-[28px] font-semibold leading-tight text-foreground">
            Lien indisponible
          </h1>
          <p className="mt-3 text-[14.5px] leading-relaxed text-muted-foreground">
            {message}
          </p>
          <p className="mt-6 text-[13px] text-text-soft">
            Vérifiez avec votre travel designer que le lien est correct et
            que le voyage a bien été finalisé.
          </p>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}

/* ---------- Roadbook view (read-only, mobile-first) ---------- */

function RoadbookView({ roadbook }: { roadbook: SharedRoadbook }) {
  const content = (roadbook.content || {}) as any;
  const cover = (content.cover || {}) as any;
  const destination =
    content.destination || roadbook.destination || cover.title || "Voyage";
  const days = Array.isArray(content.days) ? content.days : [];
  const accommodations = Array.isArray(content.accommodations_summary)
    ? content.accommodations_summary
    : [];
  const contacts = Array.isArray(content.contacts) ? content.contacts : [];
  const tips = Array.isArray(content.tips) ? content.tips : [];

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader compact />
      <Cover
        title={cover.title || destination}
        subtitle={cover.subtitle}
        tagline={cover.tagline}
        datesLabel={cover.dates_label}
        destination={destination}
        theme={content.theme || roadbook.theme}
        travelMode={content.travel_mode}
        customImageUrl={cover.image_url}
        imageCredit={
          cover.image_source === "pexels" ? cover.image_credit : undefined
        }
        imageCreditUrl={
          cover.image_source === "pexels" ? cover.image_credit_url : undefined
        }
      />

      <main className="mx-auto max-w-[760px] px-6 pb-24 sm:px-10">
        {/* Vue d'ensemble */}
        {content.overview && (
          <Section eyebrow="Vue d'ensemble">
            <p className="font-display max-w-[68ch] text-[17px] italic leading-[1.7] text-foreground/85 sm:text-[18px]">
              {content.overview}
            </p>
          </Section>
        )}

        {/* En bref */}
        <Section eyebrow="En bref">
          <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
            <Stat
              label="Durée"
              value={
                content.duration_days
                  ? `${content.duration_days} j`
                  : days.length > 0
                    ? `${days.length} j`
                    : "—"
              }
            />
            <Stat
              label="Voyageurs"
              value={
                content.travelers
                  ? `${content.travelers}${content.profile ? ` · ${content.profile}` : ""}`
                  : content.profile || "—"
              }
            />
            <Stat label="Modalité" value={content.travel_mode || "—"} />
            <Stat
              label="Distance"
              value={(() => {
                const totalKm = days.reduce(
                  (acc: number, d: any) => acc + (d.distance_km || 0),
                  0,
                );
                return totalKm > 0 ? `${totalKm} km` : "—";
              })()}
            />
          </div>
        </Section>

        {/* Itinéraire jour par jour */}
        {days.length > 0 && (
          <Section eyebrow="Itinéraire jour par jour">
            <ol className="relative space-y-5 border-l border-accent-warm/40 pl-6 sm:pl-8">
              {days.map((d: any, i: number) => (
                <DayCard key={`day-${i}`} d={d} />
              ))}
            </ol>
          </Section>
        )}

        {/* Hébergements */}
        {accommodations.length > 0 && (
          <Section eyebrow="Hébergements">
            <ul className="space-y-3">
              {accommodations.map((a: any, i: number) => (
                <li
                  key={`acc-${i}`}
                  className="flex items-start gap-4 rounded-xl border border-border/60 bg-surface p-4 shadow-soft"
                >
                  <div className="mt-1 grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
                    {(() => {
                      const Icon = accommodationIcon(a.type);
                      return <Icon className="h-4 w-4" />;
                    })()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-[16px] font-semibold leading-tight text-foreground">
                      {a.name}
                    </p>
                    <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                      {a.location}
                      {a.nights ? ` · ${a.nights} nuit${a.nights > 1 ? "s" : ""}` : ""}
                      {a.type ? ` · ${a.type}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Contacts */}
        {contacts.length > 0 && (
          <Section eyebrow="Contacts pratiques">
            <ul className="grid gap-3 sm:grid-cols-2">
              {contacts.map((c: any, i: number) => (
                <li
                  key={`contact-${i}`}
                  className="rounded-xl border border-border/60 bg-surface p-4 shadow-soft"
                >
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-accent-warm">
                    {c.role}
                  </p>
                  <p className="font-display mt-1.5 text-[16px] font-semibold leading-tight text-foreground">
                    {c.name}
                  </p>
                  {c.phone && (
                    <a
                      href={`tel:${c.phone}`}
                      className="mt-2 inline-flex items-center gap-1.5 text-[13px] text-foreground/80 hover:text-primary"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      {c.phone}
                    </a>
                  )}
                  {c.email && (
                    <a
                      href={`mailto:${c.email}`}
                      className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-foreground/80 hover:text-primary"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      {c.email}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Conseils */}
        {tips.length > 0 && (
          <Section eyebrow="Conseils & recommandations">
            <ul className="space-y-3">
              {tips.map((t: string, i: number) => (
                <li
                  key={`tip-${i}`}
                  className="flex gap-3 text-[14.5px] leading-relaxed text-foreground/85"
                >
                  <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-accent-warm" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}

/* ---------- Cover ---------- */

function Cover({
  title,
  subtitle,
  tagline,
  datesLabel,
  destination,
  theme,
  travelMode,
  customImageUrl,
  imageCredit,
  imageCreditUrl,
}: {
  title: string;
  subtitle?: string;
  tagline?: string;
  datesLabel?: string;
  destination: string;
  theme?: string;
  travelMode?: string;
  customImageUrl?: string;
  imageCredit?: string;
  imageCreditUrl?: string;
}) {
  const autoImage = useDestinationCover(destination);
  const coverImage = customImageUrl || autoImage;
  const titleLen = (title || "").length;
  const fontSize =
    titleLen > 22
      ? "clamp(36px, 7vw, 64px)"
      : titleLen > 16
        ? "clamp(48px, 9vw, 88px)"
        : "clamp(56px, 11vw, 110px)";

  return (
    <section
      className="relative isolate w-full overflow-hidden bg-primary text-white"
      style={{ minHeight: "min(70vh, 600px)", height: "65vh" }}
    >
      {coverImage ? (
        <img
          src={coverImage}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary-light" />
      )}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.20) 0%, rgba(15,110,86,0.15) 35%, rgba(15,110,86,0.55) 75%, rgba(15,110,86,0.78) 100%)",
        }}
      />

      {/* Crédit photo Pexels — petit lien discret en bas à gauche */}
      {imageCredit && (
        <div className="absolute bottom-2 left-3 z-10">
          <a
            href={imageCreditUrl ?? "#"}
            target="_blank"
            rel="noreferrer noopener"
            className="text-[10px] text-white/55 hover:text-white/85"
          >
            Photo : {imageCredit}
          </a>
        </div>
      )}

      <div className="relative z-0 flex h-full w-full items-end justify-center pb-[28%] sm:pb-[22%]">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.32em] text-white/75">
            Carnet de voyage
          </p>
          <h1
            className="font-display mt-5 font-bold leading-[0.95] text-white drop-shadow-[0_2px_30px_rgba(0,0,0,0.25)]"
            style={{
              fontSize,
              maxWidth: titleLen > 16 ? "20ch" : "16ch",
              margin: "20px auto 0",
              wordBreak: "break-word",
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="font-display mx-auto mt-5 max-w-[600px] text-[18px] italic leading-snug text-white/95 sm:text-[22px]">
              {subtitle}
            </p>
          )}
          {tagline && (
            <p className="mx-auto mt-3 max-w-[560px] text-[13px] italic leading-relaxed text-white/85 sm:text-[14px]">
              {tagline}
            </p>
          )}
          <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
            {datesLabel && (
              <span className="inline-block rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-[12px] font-medium text-white backdrop-blur-md">
                {datesLabel}
              </span>
            )}
            {(theme || travelMode) && (
              <span className="inline-block rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-white backdrop-blur-md">
                {[theme, travelMode].filter(Boolean).join(" · ")}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-6 left-1/2 z-10 -translate-x-1/2 text-white/70">
        <ChevronDown className="h-5 w-5 animate-bounce" strokeWidth={1.6} />
      </div>
    </section>
  );
}

/* ---------- Section wrapper ---------- */

function Section({
  eyebrow,
  children,
}: {
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-20 sm:mt-24 first:mt-16">
      <div className="mb-6 flex items-center gap-3">
        <span className="rule-warm" />
        <span className="eyebrow">{eyebrow}</span>
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-accent-warm/40 pb-3">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      <p className="font-display mt-1.5 text-[22px] font-semibold leading-tight text-foreground sm:text-[24px]">
        {value}
      </p>
    </div>
  );
}

/* ---------- Day card ---------- */

function DayCard({ d }: { d: any }) {
  return (
    <li className="relative">
      <span
        aria-hidden
        className="absolute -left-[31px] top-5 grid h-3.5 w-3.5 place-items-center rounded-full bg-surface ring-1 ring-accent-warm/60 sm:-left-[39px]"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
      </span>
      <article className="overflow-hidden rounded-2xl border border-border/60 bg-surface shadow-soft">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:gap-6 sm:p-6">
          <div className="flex-shrink-0 sm:w-[120px]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Jour {d.day}
            </p>
            <p className="font-display mt-1.5 text-[22px] font-semibold leading-none text-foreground">
              {formatShortDate(d.date) || "—"}
            </p>
            {d.type && (
              <span className="status-pill mt-2.5 inline-block bg-accent-warm-soft text-foreground">
                {d.type}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-[19px] font-semibold leading-tight text-foreground sm:text-[22px]">
              {d.stage || "Étape"}
            </h3>
            {d.narrative && (
              <p className="mt-2.5 text-[14.5px] leading-relaxed text-muted-foreground">
                {d.narrative}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-[12.5px] text-muted-foreground">
              {d.accommodation && (
                <span className="inline-flex items-center gap-1.5">
                  {(() => {
                    const Icon = accommodationIcon(d.type);
                    return <Icon className="h-3.5 w-3.5 text-primary/70" />;
                  })()}
                  <span className="font-medium text-foreground">
                    {d.accommodation}
                  </span>
                </span>
              )}
              {d.flight && d.flight !== "—" && (
                <span className="inline-flex items-center gap-1.5">
                  <Plane className="h-3.5 w-3.5 text-primary/70" />
                  {d.flight}
                </span>
              )}
              {d.distance_km > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-foreground/60">→</span>
                  <span className="font-medium text-foreground">
                    {d.distance_km} km
                  </span>
                  {d.drive_hours > 0 && (
                    <span>· {d.drive_hours.toFixed(1)} h</span>
                  )}
                </span>
              )}
            </div>

            {/* Photos du jour */}
            {Array.isArray(d.photos) && d.photos.length > 0 && (
              <div
                className={`mt-4 grid gap-2 ${
                  d.photos.length === 1
                    ? "grid-cols-1"
                    : d.photos.length === 2
                      ? "grid-cols-2"
                      : "grid-cols-3"
                }`}
              >
                {d.photos.slice(0, 3).map((p: any, idx: number) => (
                  <div
                    key={idx}
                    className="relative aspect-[4/3] overflow-hidden rounded-lg ring-1 ring-border/40"
                  >
                    <img
                      src={p.url}
                      alt={p.alt || ""}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </article>
    </li>
  );
}

/* ---------- Header / Footer ---------- */

function PublicHeader({ compact }: { compact?: boolean } = {}) {
  return (
    <header
      className={`sticky top-0 z-30 border-b border-border/40 bg-background/85 backdrop-blur-xl ${
        compact ? "" : ""
      }`}
    >
      <div className="container-editorial flex items-center justify-between px-6 py-3 sm:px-10">
        <Logo />
        <Link to="/pricing">
          <Button
            size="sm"
            variant="ghost"
            className="hidden gap-1.5 text-[12.5px] text-muted-foreground sm:inline-flex"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Composer le mien
          </Button>
        </Link>
      </div>
    </header>
  );
}

function PublicFooter() {
  return (
    <footer className="border-t border-border/40 bg-surface-warm/40">
      <div className="container-editorial px-6 py-12 text-center sm:px-10">
        <span className="rule-warm mx-auto" aria-hidden />
        <p className="font-display mt-6 text-[18px] italic text-foreground/70">
          Carnet préparé par votre travel designer.
        </p>
        <p className="mt-2 text-[11.5px] uppercase tracking-[0.22em] text-text-soft">
          Composé sur Roadbook.ai
        </p>
        <Link to="/pricing">
          <Button
            size="sm"
            variant="outline"
            className="mt-6 gap-1.5 rounded-full border-border/70 text-[12.5px]"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Vous êtes travel designer ? Composez le vôtre
          </Button>
        </Link>
      </div>
    </footer>
  );
}

/* ---------- Helpers ---------- */

function formatShortDate(iso?: string): string {
  if (!iso) return "";
  if (iso.includes("/")) return iso;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function accommodationIcon(type?: string) {
  const t = (type || "").toLowerCase();
  if (/lodge/.test(t)) return HomeIcon;
  if (/camp|tent/.test(t)) return Tent;
  if (/h[oô]tel/.test(t)) return Hotel;
  if (/appart|apartment/.test(t)) return Building2;
  if (/vol|fly|plane|avion/.test(t)) return Plane;
  return BedDouble;
}

// Unused import shake protection for MapPin (kept for future map feature).
void MapPin;
