import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/roadbook/$id/print")({
  component: PrintPage,
  head: () => ({ meta: [{ title: "Roadbook — Impression" }] }),
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
  flight: string;
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
  client_name: string;
  destination: string;
  start_date: string;
  end_date: string;
  duration_days?: number;
  travelers?: number;
  profile?: string;
  theme?: string;
  budget_range?: string;
  cover: Cover;
  overview: string;
  days: Day[];
  accommodations_summary: AccommodationSummary[];
  contacts: Contact[];
  tips: string[];
}

function fmtLong(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function fmtShort(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function PrintPage() {
  const { id } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const [rb, setRb] = useState<Roadbook | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>("roadbook");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setError("Vous devez être connecté pour imprimer ce roadbook.");
      return;
    }
    supabase
      .from("roadbooks")
      .select("content, client_name, destination")
      .eq("id", id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          setError("Roadbook introuvable");
          return;
        }
        setRb(data.content as unknown as Roadbook);
        const slug = (s: string) =>
          s
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
        setFilename(`roadbook-${slug(data.client_name)}-${slug(data.destination)}`);
      });
  }, [id, user, authLoading]);

  // Set the document title — browsers use it as the default PDF filename.
  useEffect(() => {
    if (filename) document.title = filename;
  }, [filename]);

  // Best-effort auto-trigger of print dialog once the content is ready.
  // Many browsers block this without a user gesture — the on-screen button is
  // the reliable fallback.
  useEffect(() => {
    if (!rb) return;
    const t = setTimeout(() => {
      try {
        window.print();
      } catch (e) {
        console.warn("Auto-print blocked, user must click button", e);
      }
    }, 800);
    return () => clearTimeout(t);
  }, [rb]);

  if (error) {
    return (
      <div style={{ padding: 40, fontFamily: "Georgia, serif" }}>
        <h1>Erreur</h1>
        <p>{error}</p>
      </div>
    );
  }

  if (!rb) {
    return (
      <div style={{ padding: 40, fontFamily: "Georgia, serif" }}>Chargement…</div>
    );
  }

  const accommodations = rb.accommodations_summary || [];
  const contacts = rb.contacts || [];
  const days = rb.days || [];
  const tips = rb.tips || [];

  return (
    <>
      <style>{PRINT_CSS}</style>

      <div className="screen-banner no-print">
        <div className="screen-banner-inner">
          <div className="screen-banner-text">
            <strong>Aperçu pour impression / export PDF.</strong>{" "}
            <span>
              Utilise <kbd>Cmd</kbd>+<kbd>P</kbd> (ou <kbd>Ctrl</kbd>+<kbd>P</kbd>), ou clique le bouton.
            </span>
          </div>
          <button
            type="button"
            className="screen-banner-btn"
            onClick={() => window.print()}
          >
            Enregistrer en PDF
          </button>
        </div>
        <p className="screen-banner-hint">
          Dans le dialogue qui s'ouvre, choisis « Enregistrer en PDF » (ou « Save as PDF ») comme destination, puis « Enregistrer ».
        </p>
      </div>

      <div className="print-doc">
        {/* ------ Couverture pleine page ------ */}
        <section className="cover">
          <div className="cover-inner">
            <p className="cover-eyebrow">Roadbook</p>
            <h1 className="cover-title">{rb.cover.title}</h1>
            <p className="cover-subtitle">{rb.cover.subtitle}</p>
            <p className="cover-tagline">{rb.cover.tagline}</p>
            <div className="cover-dates">{rb.cover.dates_label}</div>
            <div className="cover-footer">
              <span className="cover-brand">Roadbook.ai</span>
            </div>
          </div>
        </section>

        {/* ------ Vue d'ensemble + sommaire ------ */}
        <section className="page section">
          <header className="page-header">
            <span className="brand-mini">Roadbook.ai</span>
            <span className="page-meta">
              {rb.client_name} · {rb.destination}
            </span>
          </header>

          <h2 className="section-title">Vue d'ensemble</h2>
          <p className="overview">{rb.overview}</p>

          <div className="meta-grid">
            {rb.start_date && rb.end_date && (
              <div className="meta-item">
                <span className="meta-label">Dates</span>
                <span className="meta-value">
                  {fmtLong(rb.start_date)} → {fmtLong(rb.end_date)}
                </span>
              </div>
            )}
            {rb.duration_days && (
              <div className="meta-item">
                <span className="meta-label">Durée</span>
                <span className="meta-value">{rb.duration_days} jours</span>
              </div>
            )}
            {rb.travelers && (
              <div className="meta-item">
                <span className="meta-label">Voyageurs</span>
                <span className="meta-value">
                  {rb.travelers}
                  {rb.profile ? ` · ${rb.profile}` : ""}
                </span>
              </div>
            )}
            {rb.theme && (
              <div className="meta-item">
                <span className="meta-label">Thème</span>
                <span className="meta-value">{rb.theme}</span>
              </div>
            )}
          </div>

          {days.length > 0 && (
            <>
              <h3 className="sub-title">Sommaire de l'itinéraire</h3>
              <ol className="toc">
                {days.map((d) => (
                  <li key={d.day}>
                    <span className="toc-day">J{d.day}</span>
                    <span className="toc-date">{fmtShort(d.date)}</span>
                    <span className="toc-stage">{d.stage}</span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </section>

        {/* ------ Itinéraire jour par jour ------ */}
        {days.length > 0 && (
          <section className="page section">
            <header className="page-header">
              <span className="brand-mini">Roadbook.ai</span>
              <span className="page-meta">Itinéraire jour par jour</span>
            </header>

            <h2 className="section-title">Itinéraire jour par jour</h2>

            <div className="days">
              {days.map((d) => (
                <article key={d.day} className="day">
                  <div className="day-head">
                    <span className="day-num">J{d.day}</span>
                    <div className="day-titles">
                      <h3 className="day-stage">{d.stage}</h3>
                      <p className="day-date">{fmtLong(d.date)}</p>
                    </div>
                  </div>
                  <p className="day-narrative">{d.narrative}</p>
                  <dl className="day-facts">
                    {d.accommodation && d.accommodation !== "—" && (
                      <>
                        <dt>Hébergement</dt>
                        <dd>
                          {d.accommodation}
                          {d.type ? <span className="muted"> · {d.type}</span> : null}
                        </dd>
                      </>
                    )}
                    {d.flight && d.flight !== "—" && (
                      <>
                        <dt>Vols / Transport</dt>
                        <dd>{d.flight}</dd>
                      </>
                    )}
                    {(d.distance_km > 0 || d.drive_hours > 0) && (
                      <>
                        <dt>Route</dt>
                        <dd>
                          {d.distance_km > 0 ? `${d.distance_km} km` : ""}
                          {d.distance_km > 0 && d.drive_hours > 0 ? " · " : ""}
                          {d.drive_hours > 0 ? `${d.drive_hours} h de route` : ""}
                        </dd>
                      </>
                    )}
                  </dl>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* ------ Hébergements ------ */}
        {accommodations.length > 0 && (
          <section className="page section">
            <header className="page-header">
              <span className="brand-mini">Roadbook.ai</span>
              <span className="page-meta">Hébergements</span>
            </header>

            <h2 className="section-title">Hébergements</h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Lodge / Camp</th>
                  <th>Localisation</th>
                  <th>Type</th>
                  <th className="num">Nuits</th>
                </tr>
              </thead>
              <tbody>
                {accommodations.map((a, i) => (
                  <tr key={i}>
                    <td className="strong">{a.name}</td>
                    <td>{a.location}</td>
                    <td className="muted">{a.type}</td>
                    <td className="num">{a.nights}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* ------ Contacts ------ */}
        {contacts.length > 0 && (
          <section className="page section">
            <header className="page-header">
              <span className="brand-mini">Roadbook.ai</span>
              <span className="page-meta">Contacts pratiques</span>
            </header>

            <h2 className="section-title">Contacts pratiques</h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rôle</th>
                  <th>Nom</th>
                  <th>Téléphone</th>
                  <th>Courriel</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c, i) => (
                  <tr key={i}>
                    <td className="muted">{c.role}</td>
                    <td className="strong">{c.name}</td>
                    <td className="num">{c.phone}</td>
                    <td className="muted">{c.email || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* ------ Conseils ------ */}
        {tips.length > 0 && (
          <section className="page section">
            <header className="page-header">
              <span className="brand-mini">Roadbook.ai</span>
              <span className="page-meta">Conseils &amp; recommandations</span>
            </header>

            <h2 className="section-title">Conseils &amp; recommandations</h2>
            <ul className="tips">
              {tips.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </section>
        )}

        {/* ------ Page de fin ------ */}
        <section className="endpage">
          <div className="endpage-inner">
            <p className="end-eyebrow">Bon voyage</p>
            <h2 className="end-title">{rb.cover.title}</h2>
            <p className="end-tagline">{rb.cover.tagline}</p>
            <div className="end-brand">
              Document préparé avec <strong>Roadbook.ai</strong>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

const PRINT_CSS = `
  /* ============== Page setup ============== */
  @page {
    size: A4;
    margin: 18mm 16mm;
  }
  @page :first {
    margin: 0;
  }

  html, body {
    margin: 0;
    padding: 0;
    background: #fff;
    color: #1a1a1a;
    font-family: "Georgia", "Iowan Old Style", "Times New Roman", serif;
    font-size: 10.5pt;
    line-height: 1.55;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .print-doc { color: #1a1a1a; }

  /* ============== Cover (full bleed page 1) ============== */
  .cover {
    page-break-after: always;
    break-after: page;
    background: #0F6E56;
    color: #fff;
    height: 297mm;
    width: 210mm;
    margin: 0;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    box-sizing: border-box;
    position: relative;
  }
  .cover-inner {
    padding: 0 22mm;
    max-width: 170mm;
  }
  .cover-eyebrow {
    text-transform: uppercase;
    letter-spacing: 0.32em;
    font-size: 9pt;
    opacity: 0.8;
    margin: 0 0 14mm;
    font-family: "Helvetica Neue", Arial, sans-serif;
  }
  .cover-title {
    font-size: 56pt;
    line-height: 1.05;
    font-weight: 600;
    margin: 0 0 8mm;
    letter-spacing: -0.01em;
  }
  .cover-subtitle {
    font-size: 16pt;
    margin: 0 0 4mm;
    font-weight: 400;
  }
  .cover-tagline {
    font-size: 12pt;
    font-style: italic;
    opacity: 0.9;
    margin: 0 0 18mm;
  }
  .cover-dates {
    display: inline-block;
    border: 1px solid rgba(255,255,255,0.4);
    border-radius: 999px;
    padding: 3mm 8mm;
    font-size: 10pt;
    font-family: "Helvetica Neue", Arial, sans-serif;
    letter-spacing: 0.04em;
  }
  .cover-footer {
    position: absolute;
    bottom: 18mm;
    left: 0;
    right: 0;
    text-align: center;
  }
  .cover-brand {
    font-family: "Helvetica Neue", Arial, sans-serif;
    font-size: 9pt;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    opacity: 0.7;
  }

  /* ============== Standard pages ============== */
  .section {
    page-break-before: always;
    break-before: page;
    page-break-after: auto;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    border-bottom: 1px solid #e5e5e5;
    padding-bottom: 4mm;
    margin-bottom: 8mm;
    font-family: "Helvetica Neue", Arial, sans-serif;
    font-size: 8.5pt;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #6b6b6b;
  }
  .brand-mini { color: #0F6E56; font-weight: 600; }

  .section-title {
    font-size: 24pt;
    font-weight: 600;
    color: #0F6E56;
    margin: 0 0 6mm;
    letter-spacing: -0.005em;
  }
  .sub-title {
    font-size: 13pt;
    font-weight: 600;
    margin: 10mm 0 4mm;
    color: #1a1a1a;
    border-bottom: 1px solid #e5e5e5;
    padding-bottom: 2mm;
  }

  .overview {
    font-size: 11pt;
    line-height: 1.7;
    margin: 0 0 8mm;
    text-align: justify;
    hyphens: auto;
  }

  .meta-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4mm 10mm;
    margin: 6mm 0;
    padding: 5mm 6mm;
    background: #f5f1ea;
    border-left: 3px solid #0F6E56;
  }
  .meta-item { display: flex; flex-direction: column; }
  .meta-label {
    font-family: "Helvetica Neue", Arial, sans-serif;
    font-size: 8pt;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #6b6b6b;
    margin-bottom: 1mm;
  }
  .meta-value { font-size: 10.5pt; color: #1a1a1a; }

  /* ============== TOC ============== */
  .toc {
    list-style: none;
    padding: 0;
    margin: 0;
    column-count: 2;
    column-gap: 10mm;
  }
  .toc li {
    display: grid;
    grid-template-columns: 12mm 16mm 1fr;
    gap: 2mm;
    padding: 2mm 0;
    border-bottom: 1px dotted #d4d4d4;
    font-size: 10pt;
    break-inside: avoid;
  }
  .toc-day { color: #0F6E56; font-weight: 700; font-family: "Helvetica Neue", Arial, sans-serif; }
  .toc-date { color: #6b6b6b; font-family: "Helvetica Neue", Arial, sans-serif; font-size: 9pt; }
  .toc-stage { color: #1a1a1a; }

  /* ============== Days ============== */
  .days { margin-top: 2mm; }
  .day {
    page-break-inside: avoid;
    break-inside: avoid;
    margin-bottom: 9mm;
    padding-bottom: 6mm;
    border-bottom: 1px solid #ececec;
  }
  .day:last-child { border-bottom: 0; }
  .day-head {
    display: flex;
    align-items: baseline;
    gap: 6mm;
    margin-bottom: 3mm;
  }
  .day-num {
    background: #0F6E56;
    color: #fff;
    font-family: "Helvetica Neue", Arial, sans-serif;
    font-weight: 700;
    font-size: 10pt;
    padding: 1.5mm 3mm;
    letter-spacing: 0.04em;
    border-radius: 2mm;
    flex-shrink: 0;
  }
  .day-titles { flex: 1; }
  .day-stage {
    font-size: 14pt;
    font-weight: 600;
    margin: 0;
    color: #1a1a1a;
  }
  .day-date {
    margin: 0.5mm 0 0;
    font-size: 9.5pt;
    color: #6b6b6b;
    font-family: "Helvetica Neue", Arial, sans-serif;
    letter-spacing: 0.02em;
  }
  .day-narrative {
    margin: 0 0 3mm;
    font-style: italic;
    color: #2d2d2d;
    line-height: 1.65;
    text-align: justify;
    hyphens: auto;
  }
  .day-facts {
    display: grid;
    grid-template-columns: 32mm 1fr;
    gap: 1mm 4mm;
    margin: 0;
    font-family: "Helvetica Neue", Arial, sans-serif;
    font-size: 9pt;
  }
  .day-facts dt {
    color: #6b6b6b;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-size: 8pt;
    padding-top: 0.5mm;
  }
  .day-facts dd {
    margin: 0;
    color: #1a1a1a;
  }
  .day-facts .muted { color: #6b6b6b; }

  /* ============== Tables ============== */
  .data-table {
    width: 100%;
    border-collapse: collapse;
    font-family: "Helvetica Neue", Arial, sans-serif;
    font-size: 9.5pt;
  }
  .data-table thead th {
    text-align: left;
    background: #0F6E56;
    color: #fff;
    padding: 3mm 4mm;
    font-size: 8.5pt;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-weight: 600;
  }
  .data-table th.num, .data-table td.num { text-align: right; font-variant-numeric: tabular-nums; }
  .data-table tbody td {
    padding: 2.5mm 4mm;
    border-bottom: 1px solid #ececec;
    vertical-align: top;
  }
  .data-table tbody tr:nth-child(even) { background: #faf8f4; }
  .data-table tbody tr { page-break-inside: avoid; break-inside: avoid; }
  .data-table .strong { font-weight: 600; color: #1a1a1a; font-family: "Georgia", serif; }
  .data-table .muted { color: #6b6b6b; }

  /* ============== Tips ============== */
  .tips {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .tips li {
    position: relative;
    padding: 3mm 0 3mm 8mm;
    border-bottom: 1px solid #ececec;
    line-height: 1.6;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .tips li::before {
    content: "";
    position: absolute;
    left: 2mm;
    top: 5.5mm;
    width: 2mm;
    height: 2mm;
    background: #0F6E56;
    border-radius: 50%;
  }
  .tips li:last-child { border-bottom: 0; }

  /* ============== End page ============== */
  .endpage {
    page-break-before: always;
    break-before: page;
    background: #f5f1ea;
    height: 260mm;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    border-top: 6mm solid #0F6E56;
  }
  .endpage-inner { padding: 0 24mm; }
  .end-eyebrow {
    text-transform: uppercase;
    letter-spacing: 0.3em;
    font-size: 9pt;
    color: #0F6E56;
    margin: 0 0 8mm;
    font-family: "Helvetica Neue", Arial, sans-serif;
    font-weight: 600;
  }
  .end-title {
    font-size: 36pt;
    font-weight: 600;
    margin: 0 0 5mm;
    color: #1a1a1a;
  }
  .end-tagline {
    font-style: italic;
    color: #4d4d4d;
    margin: 0 0 14mm;
    font-size: 12pt;
  }
  .end-brand {
    font-family: "Helvetica Neue", Arial, sans-serif;
    font-size: 9pt;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #6b6b6b;
  }
  .end-brand strong { color: #0F6E56; }

  /* ============== On-screen preview tweaks ============== */
  @media screen {
    body {
      background: #ececec;
      padding: 20px 0;
    }
    .print-doc {
      max-width: 210mm;
      margin: 0 auto;
      background: #fff;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
    }
    .cover { width: 100%; height: auto; padding: 80mm 22mm; }
    .section, .endpage { padding: 22mm 18mm; }
    .endpage { height: auto; padding: 60mm 24mm; }
  }

  /* ============== On-screen banner (hidden when printing) ============== */
  .screen-banner {
    position: sticky;
    top: 0;
    z-index: 50;
    background: #0F6E56;
    color: #fff;
    font-family: "Helvetica Neue", Arial, sans-serif;
    box-shadow: 0 2px 10px rgba(0,0,0,0.12);
  }
  .screen-banner-inner {
    max-width: 210mm;
    margin: 0 auto;
    padding: 12px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }
  .screen-banner-text { font-size: 13px; line-height: 1.5; }
  .screen-banner-text kbd {
    background: rgba(255,255,255,0.18);
    border: 1px solid rgba(255,255,255,0.3);
    border-radius: 4px;
    padding: 1px 6px;
    font-family: inherit;
    font-size: 12px;
  }
  .screen-banner-btn {
    background: #fff;
    color: #0F6E56;
    border: none;
    border-radius: 6px;
    padding: 8px 14px;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    white-space: nowrap;
  }
  .screen-banner-btn:hover { background: #E1F5EE; }
  .screen-banner-hint {
    max-width: 210mm;
    margin: 0 auto;
    padding: 0 20px 12px;
    font-size: 12px;
    line-height: 1.5;
    color: rgba(255,255,255,0.85);
  }

  /* ============== Print-only adjustments ============== */
  @media print {
    body { background: #fff; padding: 0; }
    .print-doc { box-shadow: none; max-width: none; margin: 0; }
    .section { padding: 0; }
    .endpage { padding: 0; }
    .no-print { display: none !important; }
  }
`;
