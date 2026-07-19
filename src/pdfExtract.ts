import * as pdfjsLib from "pdfjs-dist";
// @ts-ignore — Vite's ?url import returns the built worker as a served URL
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// Some PDFs reference "standard" fonts pdfjs doesn't bundle inline. Pointing
// this at a CDN copy matching the installed version avoids a console warning
// and lets those glyphs resolve correctly instead of silently falling back.
const STANDARD_FONT_DATA_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`;

// Extracts plain text from a PDF file, page by page, entirely in the browser
// — no server round-trip needed. Good enough for text-based PDFs (briefs,
// reports, slide exports); scanned/image-only PDFs won't yield useful text.
export async function extractPdfText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer, standardFontDataUrl: STANDARD_FONT_DATA_URL }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((item: any) => ("str" in item ? item.str : "")).join(" ");
    pages.push(text);
  }
  return pages.join("\n\n");
}
