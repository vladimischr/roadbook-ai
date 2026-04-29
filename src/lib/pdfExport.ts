import jsPDF from "jspdf";
import type { Tables } from "@/integrations/supabase/types";
import type { RoadbookContent } from "./mockGenerator";

const TEAL: [number, number, number] = [15, 110, 86];
const TEAL_LIGHT: [number, number, number] = [29, 158, 117];
const TEAL_SOFT: [number, number, number] = [225, 245, 238];
const INK: [number, number, number] = [30, 41, 47];
const MUTED: [number, number, number] = [110, 120, 125];

export async function exportRoadbookPDF(
  rb: Tables<"roadbooks">,
  content: RoadbookContent
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 56;
  const contentW = pageW - margin * 2;

  // Helpers
  let y = 0;
  const setColor = (rgb: [number, number, number]) => doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  const setFill = (rgb: [number, number, number]) => doc.setFillColor(rgb[0], rgb[1], rgb[2]);

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const addText = (
    text: string,
    opts: { size?: number; weight?: "normal" | "bold"; color?: [number, number, number]; lh?: number; gap?: number } = {}
  ) => {
    const { size = 11, weight = "normal", color = INK, lh = 1.45, gap = 6 } = opts;
    doc.setFont("helvetica", weight);
    doc.setFontSize(size);
    setColor(color);
    const lines = doc.splitTextToSize(text || "", contentW);
    const lineH = size * lh;
    ensureSpace(lines.length * lineH);
    lines.forEach((line: string) => {
      doc.text(line, margin, y);
      y += lineH;
    });
    y += gap;
  };

  const sectionLabel = (label: string) => {
    ensureSpace(40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    setColor(TEAL);
    doc.text(label.toUpperCase(), margin, y);
    y += 8;
    setFill(TEAL);
    doc.rect(margin, y, 24, 1.5, "F");
    y += 18;
  };

  // Cover page
  setFill(TEAL);
  doc.rect(0, 0, pageW, pageH, "F");
  setColor([255, 255, 255]);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("ROADBOOK", margin, 110, { charSpace: 3 });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(42);
  const titleLines = doc.splitTextToSize(content.cover.title, contentW);
  doc.text(titleLines, margin, 200);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(16);
  const subLines = doc.splitTextToSize(content.cover.subtitle, contentW);
  doc.text(subLines, margin, 200 + titleLines.length * 46 + 20);

  doc.setFontSize(11);
  doc.setTextColor(225, 245, 238);
  doc.text(content.cover.tagline, margin, pageH - 130);

  if (rb.start_date && rb.end_date) {
    const fmt = (d: string) =>
      new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
    doc.text(`${fmt(rb.start_date)}  →  ${fmt(rb.end_date)}`, margin, pageH - 110);
  }

  doc.setFontSize(9);
  doc.text("Prepared by your travel designer", margin, pageH - 60);

  // Content pages
  doc.addPage();
  y = margin;

  sectionLabel("Trip overview");
  addText(content.overview, { size: 11, gap: 14 });

  sectionLabel("Day by day");
  content.days.forEach((d) => {
    ensureSpace(80);
    // Day pill
    setFill(TEAL_SOFT);
    doc.roundedRect(margin, y - 12, contentW, 0, 6, 6, "F"); // baseline marker (no-op visually)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    setColor(TEAL);
    doc.text(`DAY ${d.day}  ·  ${d.location.toUpperCase()}`, margin, y);
    y += 14;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    setColor(INK);
    const tLines = doc.splitTextToSize(d.title, contentW);
    ensureSpace(tLines.length * 16 + 10);
    doc.text(tLines, margin, y);
    y += tLines.length * 16 + 4;

    addText(d.description, { size: 10.5, gap: 6 });

    d.activities.forEach((a) => {
      ensureSpace(16);
      setFill(TEAL_LIGHT);
      doc.circle(margin + 3, y - 3, 1.5, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      setColor(INK);
      const aLines = doc.splitTextToSize(a, contentW - 14);
      doc.text(aLines, margin + 12, y);
      y += aLines.length * 14;
    });
    y += 14;
  });

  sectionLabel("Accommodations");
  content.accommodations.forEach((a) => {
    ensureSpace(60);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    setColor(INK);
    doc.text(a.name, margin, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    setColor(MUTED);
    doc.text(`${a.location}  ·  ${a.nights} ${a.nights > 1 ? "nights" : "night"}`, margin, y);
    y += 14;
    addText(a.notes, { size: 10, color: INK, gap: 12 });
  });

  sectionLabel("Contacts");
  content.contacts.forEach((c) => {
    ensureSpace(36);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    setColor(MUTED);
    doc.text(c.label.toUpperCase(), margin, y);
    y += 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    setColor(INK);
    doc.text(c.value, margin, y);
    y += 18;
  });

  sectionLabel("Tips & good to know");
  content.tips.forEach((t) => {
    ensureSpace(20);
    setFill(TEAL_LIGHT);
    doc.circle(margin + 3, y - 3, 1.5, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    setColor(INK);
    const lines = doc.splitTextToSize(t, contentW - 14);
    doc.text(lines, margin + 12, y);
    y += lines.length * 14 + 4;
  });

  // Footer on each page
  const pageCount = doc.getNumberOfPages();
  for (let i = 2; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setColor(MUTED);
    doc.text(`${content.cover.title} · Roadbook`, margin, pageH - 28);
    doc.text(`${i - 1} / ${pageCount - 1}`, pageW - margin, pageH - 28, { align: "right" });
  }

  const filename = `Roadbook - ${rb.client_name} - ${rb.destination}.pdf`.replace(/[^\w\s.-]/g, "");
  doc.save(filename);
}
