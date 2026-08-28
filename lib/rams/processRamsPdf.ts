import { PDFDocument } from "pdf-lib";
import { replaceRamsProcessedData, updateRamsProcessingStatus } from "@/lib/db/rams";
import { getOcrProvider } from "@/lib/ocr/provider";
import { chunkRamsPages } from "@/lib/rams/chunkRams";
import { detectSections } from "@/lib/rams/detectSections";
import { extractPdfTextWithBoxes } from "@/lib/rams/extractPdfText";
import type { ExtractedPage } from "@/lib/rams/types";

const OCR_TEXT_THRESHOLD_PER_PAGE = 35;

export async function validatePdfBuffer(buffer: Buffer) {
  const pdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
  return { pageCount: pdf.getPageCount() };
}

function averageCharacters(pages: ExtractedPage[]) {
  const totalCharacters = pages.reduce((sum, page) => sum + page.text.trim().length, 0);
  return totalCharacters / Math.max(1, pages.length);
}

async function storeExtractedPages(input: { documentId: string; pages: ExtractedPage[]; pageCount: number; textStatus: "EXTRACTED" }) {
  const sections = detectSections(input.pages);
  const chunks = await chunkRamsPages(input.pages, sections);
  await replaceRamsProcessedData(input.documentId, {
    sections: sections.map((section) => ({
      id: section.id!,
      title: section.title,
      start_page: section.startPage,
      end_page: section.endPage,
      sort_order: section.sortOrder,
    })),
    chunks,
  });
  await updateRamsProcessingStatus(input.documentId, "READY", {
    textStatus: input.textStatus,
    error: null,
    pageCount: input.pageCount,
  });
  return { status: "READY" as const, pageCount: input.pageCount, sectionCount: sections.length, chunkCount: chunks.length };
}

export async function processRamsPdf(input: { documentId: string; filePath: string; pageCount: number }) {
  await updateRamsProcessingStatus(input.documentId, "PROCESSING", { error: null });

  try {
    let pages = await extractPdfTextWithBoxes(input.filePath, input.pageCount);

    if (averageCharacters(pages) < OCR_TEXT_THRESHOLD_PER_PAGE) {
      const ocrProvider = getOcrProvider();
      if (ocrProvider.isAvailable()) {
        pages = await ocrProvider.extractText({ filePath: input.filePath, pageCount: input.pageCount });
        if (averageCharacters(pages) >= OCR_TEXT_THRESHOLD_PER_PAGE) {
          return storeExtractedPages({ documentId: input.documentId, pages, pageCount: input.pageCount, textStatus: "EXTRACTED" });
        }
      }

      await updateRamsProcessingStatus(input.documentId, "OCR_REQUIRED", {
        textStatus: "OCR_REQUIRED",
        error: ocrProvider.isAvailable()
          ? "This RAMS appears to be scanned, but OCR did not extract enough searchable text."
          : "This RAMS appears to be scanned. OCR processing is required before it can be searched.",
        pageCount: input.pageCount,
      });
      return { status: "OCR_REQUIRED" as const, pageCount: input.pageCount, sectionCount: 0, chunkCount: 0 };
    }

    return storeExtractedPages({ documentId: input.documentId, pages, pageCount: input.pageCount, textStatus: "EXTRACTED" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "RAMS PDF processing failed.";
    await updateRamsProcessingStatus(input.documentId, "FAILED", { textStatus: "FAILED", error: message, pageCount: input.pageCount });
    throw error;
  }
}
