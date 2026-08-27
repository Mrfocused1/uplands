import { randomUUID } from "node:crypto";
import { getEmbeddingProvider } from "@/lib/ai/embeddings/provider";
import { normaliseText, tokenCount } from "@/lib/rams/text";
import type { DetectedSection, ExtractedPage, RamsChunkInput } from "@/lib/rams/types";

const TARGET_TOKENS = 700;
const MAX_BOXES_PER_CHUNK = 36;

function sectionForPage(sections: DetectedSection[], pageNumber: number) {
  return sections.find((section) => pageNumber >= section.startPage && pageNumber <= section.endPage) ?? sections[0] ?? null;
}

function firstBoxesForPages(pages: ExtractedPage[], startPage: number, endPage: number) {
  return pages
    .filter((page) => page.pageNumber >= startPage && page.pageNumber <= endPage)
    .flatMap((page) =>
      page.items.slice(0, MAX_BOXES_PER_CHUNK).map((item, index) => ({
        pageNumber: page.pageNumber,
        text: item.text,
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height,
        pageWidth: page.width,
        pageHeight: page.height,
        sortOrder: index + 1,
      })),
    )
    .slice(0, MAX_BOXES_PER_CHUNK);
}

export async function chunkRamsPages(pages: ExtractedPage[], sections: DetectedSection[]): Promise<RamsChunkInput[]> {
  const embeddingProvider = getEmbeddingProvider();
  const chunks: RamsChunkInput[] = [];
  let currentText: string[] = [];
  let currentStart = 1;
  let currentEnd = 1;
  let currentSection = sectionForPage(sections, 1);

  async function flush() {
    const text = currentText.join("\n\n").trim();
    if (!text) return;
    const embedding = embeddingProvider ? await embeddingProvider.embedText(text) : null;
    chunks.push({
      id: randomUUID(),
      sectionId: currentSection?.id ?? null,
      pageNumber: currentStart,
      endPageNumber: currentEnd,
      chunkIndex: chunks.length,
      text,
      normalisedText: normaliseText(text),
      tokenCount: tokenCount(text),
      embedding,
      boxes: firstBoxesForPages(pages, currentStart, currentEnd),
    });
    currentText = [];
  }

  for (const page of pages) {
    const section = sectionForPage(sections, page.pageNumber);
    const nextTokens = tokenCount([...currentText, page.text].join("\n\n"));
    const changedSection = currentText.length > 0 && section?.id !== currentSection?.id;
    if (currentText.length > 0 && (nextTokens > TARGET_TOKENS || changedSection)) {
      await flush();
      currentStart = page.pageNumber;
      currentSection = section;
    }
    if (currentText.length === 0) {
      currentStart = page.pageNumber;
      currentSection = section;
    }
    currentEnd = page.pageNumber;
    if (page.text.trim()) currentText.push(page.text.trim());
  }

  await flush();
  return chunks;
}
