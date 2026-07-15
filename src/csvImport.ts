import * as XLSX from "xlsx";
import { IGNORED_IMPORT_COLUMNS, IMPORT_COLUMNS } from "./types";

export interface ImportedRow {
  name: string;
  email: string;
  role: "participant" | "facilitator";
  aiRelationship: string;
  futureVision: string;
  opportunitiesChallenges: string;
  _rowNumber: number;
  _error?: string;
}

function strip(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Matches a raw header cell to one of our internal field keys. Works both
// with short slug-style headers (old template) and full question text
// exported verbatim by external survey tools (contained either direction).
function matchColumn(header: string): string | null {
  const h = strip(header);
  if (!h) return null;
  if (IGNORED_IMPORT_COLUMNS.some((ig) => strip(ig) === h)) return "__ignore__";
  let best: { key: string; len: number } | null = null;
  for (const col of IMPORT_COLUMNS) {
    for (const alias of col.aliases) {
      const a = strip(alias);
      if (!a) continue;
      if (h.includes(a) || a.includes(h)) {
        if (!best || a.length > best.len) best = { key: col.key, len: a.length };
      }
    }
  }
  return best?.key ?? null;
}

// Finds which row in the sheet is the real header row, skipping any
// preamble/metadata lines some export tools prepend (e.g. FormAssembly's
// "Export ... as of ..." line). Picks the row with the most recognized
// column matches (must be at least 2).
function findHeaderRowIndex(rows: any[][]): number {
  let bestIndex = 0;
  let bestScore = -1;
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i] || [];
    const score = row.filter((cell) => cell && matchColumn(String(cell))).length;
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }
  return bestScore >= 2 ? bestIndex : 0;
}

export async function parseParticipantsFile(file: File): Promise<{ rows: ImportedRow[]; unmatchedHeaders: string[] }> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const allRows: any[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: "", blankrows: false });

  if (allRows.length === 0) return { rows: [], unmatchedHeaders: [] };

  const headerRowIndex = findHeaderRowIndex(allRows);
  const headerRow = allRows[headerRowIndex].map((h) => String(h));
  const dataRows = allRows.slice(headerRowIndex + 1);

  const headerMap: Record<number, string> = {};
  const unmatchedHeaders: string[] = [];
  headerRow.forEach((h, i) => {
    if (!h) return;
    const key = matchColumn(h);
    if (key && key !== "__ignore__") headerMap[i] = key;
    else if (key !== "__ignore__") unmatchedHeaders.push(h);
  });

  const rows: ImportedRow[] = dataRows.map((r, i) => {
    const mapped: any = {
      name: "",
      email: "",
      role: "participant",
      aiRelationship: "",
      futureVision: "",
      opportunitiesChallenges: "",
    };
    for (const [idxStr, key] of Object.entries(headerMap)) {
      const idx = Number(idxStr);
      const value = String(r[idx] ?? "").trim();
      if (key === "role") {
        mapped.role = /facilitator/i.test(value) ? "facilitator" : "participant";
      } else {
        mapped[key] = value;
      }
    }
    const error = !mapped.name ? "Missing name" : undefined;
    return { ...mapped, _rowNumber: headerRowIndex + i + 2, _error: error } as ImportedRow;
  });

  return { rows, unmatchedHeaders };
}

export function downloadTemplate() {
  const headers = [
    "Name",
    "Email",
    "Role",
    "How would you describe your organization's current relationship with AI?",
    "How do you think AI is going to change the future of work for your organization?",
    "What opportunities or challenges do you see with AI and your workforce?",
  ];
  const sampleRow = [
    "Jane Doe",
    "jane@example.com",
    "facilitator",
    "We've started exploring",
    "AI will support, accelerate, and amplify humans' work",
    "Opportunities: faster analysis and drafting. Challenges: making sure the team trusts the outputs and knows when to double-check them.",
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Participants");
  XLSX.writeFile(wb, "workshop-participants-template.xlsx");
}
