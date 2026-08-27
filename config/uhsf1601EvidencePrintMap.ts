import type { EditableEvidenceType } from "@/types/evidence";

export type EvidenceRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Reference geometry for the second printable A4 page (the "evidence" page).
 *
 * The rectangles below were measured from the visual reference
 * "Untitled design 2.pdf" rendered at 150 DPI — a 1241 × 1755 px A4 portrait.
 * Coordinates are top-left origin with `y` increasing downward, matching the
 * pixel space the measurements were taken in (and the same convention as
 * `config/uhsf1601PrintMap.ts`).
 *
 * - cscs:           landscape card, horizontally centred near the top.
 * - asbestos:       portrait certificate, bottom-left.
 * - manualHandling: portrait certificate, bottom-right.
 */
export const EVIDENCE_REFERENCE_WIDTH = 1241;
export const EVIDENCE_REFERENCE_HEIGHT = 1755;

export const EVIDENCE_PRINT_MAP: Record<EditableEvidenceType, EvidenceRect> = {
  cscs: { x: 301, y: 203, width: 639, height: 410 },
  asbestos: { x: 47, y: 712, width: 574, height: 829 },
  manualHandling: { x: 661, y: 712, width: 556, height: 829 },
};
