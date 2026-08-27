import sharp from "sharp";
import { computeRenderedLayout, EVIDENCE_DPI, frameRectInPoints } from "@/lib/evidence/transform";
import type { EditableEvidenceType, EvidencePrintTransform } from "@/types/evidence";

/**
 * Render a single evidence document into a fixed-size, frame-shaped PNG for
 * printing. The original source is never overwritten — this produces a
 * rendering derivative only.
 *
 * Pipeline: load → EXIF auto-orient → rotate (90° steps) → scale (fit-relative)
 * → translate (normalised offset) → clip to the frame. The output is a PNG
 * whose pixel dimensions equal the frame at EVIDENCE_DPI, so pdf-lib embeds it
 * one-to-one into the fixed frame.
 */
export async function renderEvidenceForPrint(
  source: Buffer,
  mime: string,
  type: EditableEvidenceType,
  transform: EvidencePrintTransform,
): Promise<Buffer> {
  const frame = frameRectInPoints(type);
  const frameWidth = Math.max(1, Math.round((frame.width / 72) * EVIDENCE_DPI));
  const frameHeight = Math.max(1, Math.round((frame.height / 72) * EVIDENCE_DPI));

  // Rasterise (PDF page 1) and auto-orient into a normalised PNG.
  const oriented = await (mime === "application/pdf"
    ? sharp(source, { density: EVIDENCE_DPI })
    : sharp(source)
  ).rotate().png().toBuffer();

  const meta = await sharp(oriented).metadata();
  const sourceWidth = meta.width ?? 1;
  const sourceHeight = meta.height ?? 1;

  const layout = computeRenderedLayout(sourceWidth, sourceHeight, frameWidth, frameHeight, transform);

  const rendered = await sharp(oriented)
    .rotate(transform.rotation)
    .resize(Math.round(layout.renderedWidth), Math.round(layout.renderedHeight), { fit: "fill" })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: frameWidth,
      height: frameHeight,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{ input: rendered, left: Math.round(layout.left), top: Math.round(layout.top) }])
    .png()
    .toBuffer();
}
