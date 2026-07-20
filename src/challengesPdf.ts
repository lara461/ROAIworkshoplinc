import { jsPDF } from "jspdf";
import type { Challenge, Group } from "./types";

const INK: [number, number, number] = [20, 18, 31]; // #14121F
const INDIGO: [number, number, number] = [53, 69, 163]; // #3545A3
const CORAL: [number, number, number] = [221, 75, 78]; // #DD4B4E
const GRAY_BODY: [number, number, number] = [75, 85, 99]; // gray-600
const GRAY_LINE: [number, number, number] = [229, 229, 229]; // border gray

const MARGIN = 20;
const PAGE_W = 210;
const PAGE_H = 297;
const USABLE_W = PAGE_W - MARGIN * 2;

// Lists every group's generated challenge options (marking which one, if
// any, the group has picked) so someone can review them all offline before
// the workshop, without needing to click through each group in the admin.
export async function downloadChallengesPdf(workshopName: string, groups: Group[], challenges: Challenge[]) {
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
  }

  paragraph(`${workshopName} — Challenge Options`, { size: 18, color: INK, bold: true, lineHeight: 8 });
  y += 6;

  const groupsWithChallenges = groups.filter((g) => challenges.some((c) => c.groupId === g.id));

  if (groupsWithChallenges.length === 0) {
    paragraph("No challenge options have been generated yet.", { size: 11, color: GRAY_BODY, lineHeight: 5.5 });
  }

  groupsWithChallenges.forEach((g, gi) => {
    if (gi > 0) y += 4;
    ensureRoom(10);
    doc.setDrawColor(...GRAY_LINE);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 6;

    paragraph(g.name, { size: 13, color: INDIGO, bold: true, lineHeight: 6 });
    y += 2;

    const groupChallenges = challenges.filter((c) => c.groupId === g.id);
    groupChallenges.forEach((c, i) => {
      const isSelected = c.status === "selected";
      paragraph(`${i + 1}. ${c.title}${isSelected ? "  (selected)" : ""}`, {
        size: 11,
        color: isSelected ? CORAL : INK,
        bold: true,
        lineHeight: 5.2,
      });
      paragraph(c.description, { size: 10, color: GRAY_BODY, lineHeight: 5 });
      y += 3;
    });
  });

  const safeName = workshopName.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "workshop";
  doc.save(`${safeName}-challenges.pdf`);
}
