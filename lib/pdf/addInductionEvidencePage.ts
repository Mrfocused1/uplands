import { PDFDocument, rgb, StandardFonts, type PDFPage } from "pdf-lib";
import fs from "node:fs/promises";
import sharp from "sharp";
import type { UploadedDocument } from "@/types/UHSF1601PrintData";
import type { EditableEvidenceType, EvidencePrintTransform, EvidenceType } from "@/types/evidence";
import { defaultEvidenceTransform, EVIDENCE_TYPES } from "@/types/evidence";
import { A4_HEIGHT_PT, A4_WIDTH_PT, EVIDENCE_DPI, frameRectInPoints } from "@/lib/evidence/transform";
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

type ResolvedEvidence = {
  type: EvidenceType;
  label: string;
  source: ResolvedSource;
  transform: EvidencePrintTransform;
};

function isEditableEvidenceType(type: EvidenceType): type is EditableEvidenceType {
  return (EVIDENCE_TYPES as readonly string[]).includes(type);
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
  type: EditableEvidenceType,
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

  EVIDENCE_TYPES.forEach((type) => {
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

async function drawAdditionalEvidencePages(pdfDoc: PDFDocument, documents: ResolvedEvidence[]) {
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const margin = 34;
  const headerHeight = 36;
  const gap = 18;
  const labelHeight = 15;
  const columns = 2;
  const rows = 2;
  const frameWidth = (A4_WIDTH_PT - margin * 2 - gap) / columns;
  const frameHeight = (A4_HEIGHT_PT - margin * 2 - headerHeight - gap - labelHeight * rows) / rows;

  for (let start = 0; start < documents.length; start += columns * rows) {
    const page = pdfDoc.addPage([A4_WIDTH_PT, A4_HEIGHT_PT]);
    page.drawText("Additional uploaded certificates", {
      x: margin,
      y: A4_HEIGHT_PT - margin - 12,
      size: 12,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.1),
    });

    const pageItems = documents.slice(start, start + columns * rows);
    for (const [index, document] of pageItems.entries()) {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const frameX = margin + column * (frameWidth + gap);
      const labelTop = margin + headerHeight + row * (frameHeight + gap + labelHeight);
      const frameTop = labelTop + labelHeight;

      page.drawText(document.label, {
        x: frameX,
        y: A4_HEIGHT_PT - labelTop - 10,
        size: 8,
        font,
        color: rgb(0.25, 0.25, 0.25),
      });
      page.drawRectangle({
        x: frameX,
        y: A4_HEIGHT_PT - frameTop - frameHeight,
        width: frameWidth,
        height: frameHeight,
        borderColor: rgb(0.85, 0.85, 0.85),
        borderWidth: 0.5,
      });

      try {
        const png = await (document.source.mime === "application/pdf"
          ? sharp(document.source.buffer, { density: EVIDENCE_DPI })
          : sharp(document.source.buffer)
        ).rotate().png().toBuffer();
        const meta = await sharp(png).metadata();
        const sourceWidth = meta.width ?? 1;
        const sourceHeight = meta.height ?? 1;
        const scale = Math.min(frameWidth / sourceWidth, frameHeight / sourceHeight);
        const width = sourceWidth * scale;
        const height = sourceHeight * scale;
        const image = await pdfDoc.embedPng(png);

        page.drawImage(image, {
          x: frameX + (frameWidth - width) / 2,
          y: A4_HEIGHT_PT - frameTop - (frameHeight + height) / 2,
          width,
          height,
        });
      } catch (error) {
        console.warn(`[evidence] Failed to render ${document.type} on additional evidence page.`, error);
      }
    }
  }
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
        label: document.label,
        source,
        transform: document.transform ?? defaultEvidenceTransform(),
      };
    }),
  );

  const present = resolved.filter((item): item is ResolvedEvidence => item !== null);
  if (present.length === 0) return;

  const fixed = present.filter((item): item is ResolvedEvidence & { type: EditableEvidenceType } => isEditableEvidenceType(item.type));
  const additional = present.filter((item) => !isEditableEvidenceType(item.type));

  if (fixed.length > 0) {
    const page = pdfDoc.addPage([A4_WIDTH_PT, A4_HEIGHT_PT]);

    for (const item of fixed) {
      try {
        await drawEvidence(pdfDoc, page, item.type, item.source.buffer, item.source.mime, item.transform);
      } catch (error) {
        console.warn(`[evidence] Failed to render ${item.type} — leaving blank space.`, error);
      }
    }

    drawDebugEvidenceLayout(page);
  }

  if (additional.length > 0) {
    await drawAdditionalEvidencePages(pdfDoc, additional);
  }
}
