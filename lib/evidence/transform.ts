import {
  EVIDENCE_PRINT_MAP,
  EVIDENCE_REFERENCE_HEIGHT,
  EVIDENCE_REFERENCE_WIDTH,
} from "@/config/uhsf1601EvidencePrintMap";
import type { EvidencePrintTransform, EvidenceType } from "@/types/evidence";

export const A4_WIDTH_PT = 595.275590551;
export const A4_HEIGHT_PT = 841.88976378;

/** Resolution used when rasterising each evidence frame for print. */
export const EVIDENCE_DPI = 300;

export interface FrameRect {
  x: number;
  /** Bottom-left y (pdf-lib convention). */
  y: number;
  width: number;
  height: number;
}

/**
 * The fixed print frame for a document type, in A4 points. These frames are
 * IMMUTABLE — the editor never moves them; only the document inside is edited.
 */
export function frameRectInPoints(type: EvidenceType): FrameRect {
  const rect = EVIDENCE_PRINT_MAP[type];
  const scaleX = A4_WIDTH_PT / EVIDENCE_REFERENCE_WIDTH;
  const scaleY = A4_HEIGHT_PT / EVIDENCE_REFERENCE_HEIGHT;

  return {
    x: rect.x * scaleX,
    y: A4_HEIGHT_PT - (rect.y + rect.height) * scaleY,
    width: rect.width * scaleX,
    height: rect.height * scaleY,
  };
}

/** Source dimensions after a 90/180/270 rotation (swap axes for 90/270). */
export function orientedDimensions(sourceWidth: number, sourceHeight: number, rotation: number) {
  return rotation % 180 === 0
    ? { width: sourceWidth, height: sourceHeight }
    : { width: sourceHeight, height: sourceWidth };
}

export function fitScale(sourceWidth: number, sourceHeight: number, frameWidth: number, frameHeight: number) {
  return Math.min(frameWidth / sourceWidth, frameHeight / sourceHeight);
}

export function fillScale(sourceWidth: number, sourceHeight: number, frameWidth: number, frameHeight: number) {
  return Math.max(frameWidth / sourceWidth, frameHeight / sourceHeight);
}

/** The `scale` value (relative to fit) that corresponds to a full "fill" (cover). */
export function fillScaleMultiplier(
  sourceWidth: number,
  sourceHeight: number,
  frameWidth: number,
  frameHeight: number,
  rotation: number,
) {
  const { width, height } = orientedDimensions(sourceWidth, sourceHeight, rotation);
  return fillScale(width, height, frameWidth, frameHeight) / fitScale(width, height, frameWidth, frameHeight);
}

export interface RenderedLayout {
  renderedWidth: number;
  renderedHeight: number;
  /** Position of the rendered source's top-left within the frame. */
  left: number;
  top: number;
  effectiveScale: number;
}

/**
 * Compute the rendered geometry of a source inside a frame for a given
 * transform. Resolution-agnostic: pass the frame in display px for the editor
 * or in print px for the PDF renderer — the stored transform (normalised
 * offset + fit-relative scale) produces identical framing either way.
 */
export function computeRenderedLayout(
  sourceWidth: number,
  sourceHeight: number,
  frameWidth: number,
  frameHeight: number,
  transform: EvidencePrintTransform,
): RenderedLayout {
  const { width: ow, height: oh } = orientedDimensions(sourceWidth, sourceHeight, transform.rotation);
  const effectiveScale = transform.scale * fitScale(ow, oh, frameWidth, frameHeight);
  const renderedWidth = Math.max(1, ow * effectiveScale);
  const renderedHeight = Math.max(1, oh * effectiveScale);
  const left = (frameWidth - renderedWidth) / 2 + transform.offsetX * frameWidth;
  const top = (frameHeight - renderedHeight) / 2 + transform.offsetY * frameHeight;

  return { renderedWidth, renderedHeight, left, top, effectiveScale };
}
