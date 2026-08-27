import { randomUUID } from "node:crypto";
import type { DetectedSection, ExtractedPage } from "@/lib/rams/types";

const SECTION_PATTERNS = [
  /method statement/i,
  /risk assessment/i,
  /ppe|personal protective equipment/i,
  /training|competenc/i,
  /plant|equipment|tools/i,
  /coshh|hazardous substances|safety data sheet|material data/i,
  /emergency procedures?|first aid/i,
  /working at height|work at height/i,
  /asbestos/i,
  /personnel|responsibilit/i,
  /environmental|waste/i,
  /manual handling/i,
];

function headingFromLine(line: string) {
  const cleaned = line.replace(/\s+/g, " ").trim();
  if (cleaned.length < 4 || cleaned.length > 90) return null;
  if (SECTION_PATTERNS.some((pattern) => pattern.test(cleaned))) return cleaned;
  const alpha = cleaned.replace(/[^a-zA-Z]/g, "");
  if (alpha.length >= 6 && alpha === alpha.toUpperCase()) return cleaned;
  if (/^\d+(\.\d+)*\s+[A-Z][A-Za-z /&-]{6,}$/.test(cleaned)) return cleaned;
  return null;
}

export function detectSections(pages: ExtractedPage[]): DetectedSection[] {
  const candidates: Array<{ title: string; page: number }> = [];

  for (const page of pages) {
    for (const line of page.text.split("\n").slice(0, 24)) {
      const heading = headingFromLine(line);
      if (heading && !candidates.some((item) => item.page === page.pageNumber && item.title === heading)) {
        candidates.push({ title: heading, page: page.pageNumber });
      }
    }
  }

  if (candidates.length === 0) {
    return [
      {
        id: randomUUID(),
        title: "Document",
        startPage: 1,
        endPage: Math.max(1, pages.length),
        sortOrder: 1,
      },
    ];
  }

  return candidates.map((candidate, index) => ({
    id: randomUUID(),
    title: candidate.title,
    startPage: candidate.page,
    endPage: (candidates[index + 1]?.page ?? pages.length + 1) - 1,
    sortOrder: index + 1,
  }));
}
