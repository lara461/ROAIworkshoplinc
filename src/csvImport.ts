import * as XLSX from "xlsx";
import { IMPORT_COLUMNS } from "./types";

export interface ImportedRow {
  name: string;
  email: string;
  role: "participant" | "facilitator";
  orgSize: string;
  aiRelationship: string;
  biggestConcern: string;
  futureOfWorkView: string;
  moveTimeline: string;
  futureVision: string;
  ownershipPreference: string;
  employeeFreedom: string;
  _rowNumber: number;
  _error?: string;
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[\s_-]+/g, "");
}

function matchColumn(header: string): string | null {
  const norm = normalizeHeader(header);
  for (const col of IMPORT_COLUMNS) {
    if (col.aliases.some((a) => normalizeHeader(a) === norm)) return col.key;
  }
  return null;
}

export async function parseParticipantsFile(file: File): Promise<{ rows: ImportedRow[]; unmatchedHeaders: string[] }> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw: Record<string, any>[] = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });

  if (raw.length === 0) return { rows: [], unmatchedHeaders: [] };

  const headers = Object.keys(raw[0]);
  const headerMap: Record<string, string> = {};
  const unmatchedHeaders: string[] = [];
  for (const h of headers) {
    const key = matchColumn(h);
    if (key) headerMap[h] = key;
    else unmatchedHeaders.push(h);
  }

  const rows: ImportedRow[] = raw.map((r, i) => {
    const mapped: any = {
      name: "",
      email: "",
      role: "participant",
      orgSize: "",
      aiRelationship: "",
      biggestConcern: "",
      futureOfWorkView: "",
      moveTimeline: "",
      futureVision: "",
      ownershipPreference: "",
      employeeFreedom: "",
    };
    for (const [header, key] of Object.entries(headerMap)) {
      const value = String(r[header] ?? "").trim();
      if (key === "role") {
        mapped.role = /facilitator/i.test(value) ? "facilitator" : "participant";
      } else {
        mapped[key] = value;
      }
    }
    let error: string | undefined;
    if (!mapped.name) error = "Missing name";
    else if (!mapped.email) error = "Missing email";
    return { ...mapped, _rowNumber: i + 2, _error: error } as ImportedRow;
  });

  return { rows, unmatchedHeaders };
}

export function downloadTemplate() {
  const headers = [
    "Name",
    "Email",
    "Role",
    "Org Size",
    "AI Relationship",
    "Biggest Concern",
    "Future of Work View",
    "Move Timeline",
    "Future Vision",
    "Ownership Preference",
    "Employee Freedom",
  ];
  const sampleRow = [
    "Jane Doe",
    "jane@example.com",
    "facilitator",
    "51–200",
    "We've started exploring",
    "How it will affect my people",
    "We think AI will reshape how our ops team works over the next 2 years...",
    "Within the next 6 months",
    "It'll be a mix — some processes AI-driven, others fully human",
    "I want to lead it internally but work with partners on execution",
    "Guided freedom — they can explore, but within clear boundaries we set",
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Participants");
  XLSX.writeFile(wb, "workshop-participants-template.xlsx");
}
