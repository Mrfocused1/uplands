import { PDFDocument, rgb, type PDFPage } from "pdf-lib";
import fs from "node:fs/promises";
import type { UploadedDocument } from "@/types/UHSF1601PrintData";
import type { EvidencePrintTransform, EvidenceType } from "@/types/evidence";
import { defaultEvidenceTransform } from "@/types/evidence";
import { A4_HEIGHT_PT, A4_WIDTH_PT, frameRectInPoints } from "@/lib/evidence/transform";
import { renderEvidenceForPrint } from "@/lib/evidence/renderEvidenceForPrint";

/**
 * Set to `true` to draw a red border around every evidence frame. Layout aid
 * only — keep `false` in production.
 */
const DEBUG_EVIDENCE_LAYOUT = false;

interface ResolvedSource {
  buffer: Buffer;
  mime: string;
}

async function resolveSource(document: UploadedDocument): Promise<ResolvedSource | null> {
  if (document.dataUrl) {
    const comma = document.dataUrl.indexOf(",");
    if (comma === -1) return null;
    const mime = document.dataUrl.slice(0, comma).match(/^data:([^;]+)/)?.[1]?.toLowerCase() ?? "";
    return { buffer: Buffer.from(document.dataUrl.slice(comma + 1), "base64"), mime };
  }

  if (document.storagePath) {
    const buffer = await fs.readFile(document.storagePath);
    return { buffer, mime: document.mimeType ?? "" };
  }

  return null;
}

/**
 * Render a single uploaded document into its fixed print frame and draw it.
 * The document is clipped to the frame — content never bleeds into neighbours.
 */
export async function drawEvidence(
  pdfDoc: PDFDocument,
  page: PDFPage,
  type: EvidenceType,
  source: Buffer,
  mime: string,
  transform: EvidencePrintTransform,
): Promise<void> {
  const frame = frameRectInPoints(type);
  const png = await renderEvidenceForPrint(source, mime, type, transform);
  const image = await pdfDoc.embedPng(png);

  page.drawImage(image, {
    x: frame.x,
    y: frame.y,
    width: frame.width,
    height: frame.height,
  });
}

function drawDebugEvidenceLayout(page: PDFPage) {
  if (!DEBUG_EVIDENCE_LAYOUT) return;

  (["cscs", "asbestos", "manualHandling"] as const).forEach((type) => {
    const frame = frameRectInPoints(type);
    page.drawRectangle({
      x: frame.x,
      y: frame.y,
      width: frame.width,
      height: frame.height,
      borderColor: rgb(1, 0, 0),
      borderWidth: 0.6,
      opacity: 0.5,
    });
  });
}

/**
 * Append the second printable A4 page holding the uploaded competency
 * documents. Returns without adding a page when no document has a resolvable
 * source. Missing documents leave plain white space — frames never reflow.
 */
export async function addInductionEvidencePage(
  pdfDoc: PDFDocument,
  documents: UploadedDocument[],
): Promise<void> {
  const resolved = await Promise.all(
    documents.map(async (document) => {
      const source = await resolveSource(document);
      if (!source) return null;
      return {
        type: document.id as EvidenceType,
        source,
        transform: document.transform ?? defaultEvidenceTransform(),
      };
    }),
  );

  const present = resolved.filter((item): item is NonNullable<typeof item> => item !== null);
  if (present.length === 0) return;

  const page = pdfDoc.addPage([A4_WIDTH_PT, A4_HEIGHT_PT]);

  for (const item of present) {
    try {
      await drawEvidence(pdfDoc, page, item.type, item.source.buffer, item.source.mime, item.transform);
    } catch (error) {
      console.warn(`[evidence] Failed to render ${item.type} — leaving blank space.`, error);
    }
  }

  drawDebugEvidenceLayout(page);
}
