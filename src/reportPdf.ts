import { jsPDF } from "jspdf";
import type { GroupReport } from "./types";

const INK: [number, number, number] = [20, 18, 31]; // #14121F
const INDIGO: [number, number, number] = [53, 69, 163]; // #3545A3
const INDIGO_BG: [number, number, number] = [237, 239, 249]; // light indigo tint
const GRAY_LABEL: [number, number, number] = [156, 163, 175]; // gray-400
const GRAY_BODY: [number, number, number] = [75, 85, 99]; // gray-600

const MARGIN = 20;
const PAGE_W = 210;
const PAGE_H = 297;
const USABLE_W = PAGE_W - MARGIN * 2;

// Builds a proper PDF from an approved (or any) group report and triggers a
// browser download — used from both the facilitator's Report section and
// the admin's Report tab, so the two never drift apart. A PDF (rather than
// an editable Word doc) matches what the report actually is at this point:
// a final, locked deliverable, not a draft anyone still edits.
export async function downloadReportPdf(report: GroupReport, groupName: string) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN;

  function ensureRoom(height: number) {
    if (y + height > PAGE_H - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  }

  function paragraph(text: string, opts: { size: number; color: [number, number, number]; bold?: boolean; lineHeight?: number }) {
    const lineHeight = opts.lineHeight ?? opts.size * 0.42;
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(opts.size);
    doc.setTextColor(...opts.color);
    const lines = doc.splitTextToSize(text || "", USABLE_W) as string[];
    for (const line of lines) {
      ensureRoom(lineHeight);
      doc.text(line, MARGIN, y);
      y += lineHeight;
    }
    return lines.length * lineHeight;
  }

  function label(text: string) {
    ensureRoom(6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...GRAY_LABEL);
    doc.text(text.toUpperCase(), MARGIN, y);
    y += 6;
  }

  // Title
  paragraph(`${groupName} — Workshop Report`, { size: 20, color: INK, bold: true, lineHeight: 8 });
  y += 4;

  // Executive summary
  paragraph(report.executiveSummary || "", { size: 11, color: GRAY_BODY, lineHeight: 5.5 });
  y += 6;

  // Key insight — drawn as a tinted callout box, matching the on-screen design
  const insightText = report.keyInsight || "";
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  const insightLines = doc.splitTextToSize(insightText, USABLE_W - 10) as string[];
  const insightLineHeight = 5;
  const boxHeight = 8 + insightLines.length * insightLineHeight + 4;
  ensureRoom(boxHeight);
  doc.setFillColor(...INDIGO_BG);
  doc.rect(MARGIN - 4, y - 5, USABLE_W + 4, boxHeight, "F");
  doc.setDrawColor(...INDIGO);
  doc.setLineWidth(1.2);
  doc.line(MARGIN - 4, y - 5, MARGIN - 4, y - 5 + boxHeight);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...INDIGO);
  doc.text("KEY INSIGHT", MARGIN, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(...INK);
  for (const line of insightLines) {
    doc.text(line, MARGIN, y);
    y += insightLineHeight;
  }
  y += 8;

  // How their thinking evolved
  label("How Their Thinking Evolved");
  paragraph(report.evolution || "", { size: 10.5, color: GRAY_BODY, lineHeight: 5.2 });
  y += 6;

  // Recommended next steps
  label("Recommended Next Steps");
  const steps = report.recommendedNextSteps || [];
  if (steps.length === 0) {
    paragraph("None recorded.", { size: 10.5, color: GRAY_BODY, lineHeight: 5.2 });
  } else {
    steps.forEach((step, i) => {
      paragraph(`${i + 1}. ${step}`, { size: 10.5, color: INK, lineHeight: 5.5 });
    });
  }

  const safeName = groupName.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "group";
  doc.save(`${safeName}-workshop-report.pdf`);
}
