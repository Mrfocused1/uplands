export const EVIDENCE_TYPES = ["cscs", "asbestos", "manualHandling"] as const;

export type EditableEvidenceType = (typeof EVIDENCE_TYPES)[number];
export type EvidenceType = EditableEvidenceType | "firstAid" | "smstsSssts" | "ipaf" | "pasma";
export type EvidenceFitMode = "fit" | "fill" | "custom";
export type EvidenceRotation = 0 | 90 | 180 | 270;

export interface EvidencePrintTransform {
  fitMode: EvidenceFitMode;
  /** Normalised offset relative to the print frame: -0.5..0.5 (0 = centred). */
  offsetX: number;
  offsetY: number;
  /** Scale multiplier relative to the default "fit" scale (1 = fit). */
  scale: number;
  rotation: EvidenceRotation;
  updatedAt?: string;
  updatedBy?: string;
}

export interface EvidenceDocument {
  id: string;
  type: EvidenceType;
  originalName: string;
  mimeType: string;
  storagePath: string;
  sourceWidth?: number;
  sourceHeight?: number;
  printTransform: EvidencePrintTransform;
}

export function defaultEvidenceTransform(): EvidencePrintTransform {
  return { fitMode: "fit", offsetX: 0, offsetY: 0, scale: 1, rotation: 0 };
}
