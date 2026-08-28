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

const TABLE_FRAGMENT_PATTERNS = [
  /\bactivity\b.*\bpersons? at risk\b/i,
  /\bassessor\b.*\bassessment no\b/i,
  /\bdistribution of\b.*\bemployees\b/i,
  /\bfloor area\b.*\bmanual handling\b/i,
  /\boperatives?\b.*\bensure\b/i,
  /\bplease refer to material data sheet\b/i,
];

function headingFromLine(line: string) {
  const cleaned = line.replace(/\s+/g, " ").trim();
  if (cleaned.length < 4 || cleaned.length > 90) return null;
  if (TABLE_FRAGMENT_PATTERNS.some((pattern) => pattern.test(cleaned))) return null;
  if (cleaned.split(/\s+/).length > 12 && !/^\d+(\.\d+)*\s+/.test(cleaned)) return null;
  if (SECTION_PATTERNS.some((pattern) => pattern.test(cleaned))) return cleaned;
  const alpha = cleaned.replace(/[^a-zA-Z]/g, "");
  if (alpha.length >= 6 && alpha === alpha.toUpperCase() && cleaned.split(/\s+/).length <= 8) return cleaned;
  if (/^\d+(\.\d+)*\s+[A-Z][A-Za-z /&-]{6,}$/.test(cleaned)) return cleaned;
  return null;
}

function normaliseHeading(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function detectSections(pages: ExtractedPage[]): DetectedSection[] {
  const candidates: Array<{ title: string; page: number }> = [];
  const seen = new Set<string>();

  for (const page of pages) {
    for (const line of page.text.split("\n").slice(0, 24)) {
      const heading = headingFromLine(line);
      if (heading) {
        const key = `${page.pageNumber}:${normaliseHeading(heading)}`;
        if (seen.has(key)) continue;
        seen.add(key);
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

  return candidates
    .map((candidate, index) => {
      const nextLaterPage = candidates.slice(index + 1).find((item) => item.page > candidate.page)?.page;
      return {
        id: randomUUID(),
        title: candidate.title,
        startPage: candidate.page,
        endPage: Math.max(candidate.page, (nextLaterPage ?? pages.length + 1) - 1),
        sortOrder: index + 1,
      };
    })
    .filter((section, index, all) => {
      const key = `${section.startPage}:${normaliseHeading(section.title)}`;
      return all.findIndex((candidate) => `${candidate.startPage}:${normaliseHeading(candidate.title)}` === key) === index;
    });
}
