import { PDFDocument } from "pdf-lib";
import { replaceRamsProcessedData, updateRamsProcessingStatus } from "@/lib/db/rams";
import { chunkRamsPages } from "@/lib/rams/chunkRams";
import { detectSections } from "@/lib/rams/detectSections";
import { extractPdfTextWithBoxes } from "@/lib/rams/extractPdfText";

const OCR_TEXT_THRESHOLD_PER_PAGE = 35;

export async function validatePdfBuffer(buffer: Buffer) {
  const pdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
  return { pageCount: pdf.getPageCount() };
}

export async function processRamsPdf(input: { documentId: string; filePath: string; pageCount: number }) {
  updateRamsProcessingStatus(input.documentId, "PROCESSING", { error: null });

  try {
    const pages = await extractPdfTextWithBoxes(input.filePath, input.pageCount);
    const totalCharacters = pages.reduce((sum, page) => sum + page.text.trim().length, 0);
    const averageCharacters = totalCharacters / Math.max(1, pages.length);

    if (averageCharacters < OCR_TEXT_THRESHOLD_PER_PAGE) {
      updateRamsProcessingStatus(input.documentId, "OCR_REQUIRED", {
        textStatus: "OCR_REQUIRED",
        error: "This RAMS appears to be scanned. OCR processing is required before it can be searched.",
        pageCount: input.pageCount,
      });
      return { status: "OCR_REQUIRED" as const, pageCount: input.pageCount, sectionCount: 0, chunkCount: 0 };
    }

    const sections = detectSections(pages);
    const chunks = await chunkRamsPages(pages, sections);
    replaceRamsProcessedData(input.documentId, {
      sections: sections.map((section) => ({
        id: section.id!,
        title: section.title,
        start_page: section.startPage,
        end_page: section.endPage,
        sort_order: section.sortOrder,
      })),
      chunks,
    });
    updateRamsProcessingStatus(input.documentId, "READY", {
      textStatus: "EXTRACTED",
      error: null,
      pageCount: input.pageCount,
    });
    return { status: "READY" as const, pageCount: input.pageCount, sectionCount: sections.length, chunkCount: chunks.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "RAMS PDF processing failed.";
    updateRamsProcessingStatus(input.documentId, "FAILED", { textStatus: "FAILED", error: message, pageCount: input.pageCount });
    throw error;
  }
}
