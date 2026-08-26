import type { EvidenceType } from "@/types/evidence";

export interface CameraGuideConfig {
  /** width / height of the target document. */
  aspectRatio: number;
  label: string;
  hint: string;
}

/**
 * Live capture guidelines, one per document type. The CSCS card is a landscape
 * card (~1.586:1); the two certificates are portrait A4 (~0.7071:1).
 */
export const CAMERA_GUIDES: Record<EvidenceType, CameraGuideConfig> = {
  cscs: { aspectRatio: 1.586, label: "CSCS card", hint: "Fit the card inside the guide" },
  asbestos: { aspectRatio: 0.7071, label: "Certificate (portrait)", hint: "Fit the certificate inside the guide" },
  manualHandling: { aspectRatio: 0.7071, label: "Certificate (portrait)", hint: "Fit the certificate inside the guide" },
};

/** Map an upload field id back to its evidence type for guide selection. */
export function evidenceTypeFromFieldId(fieldId: string): EvidenceType | undefined {
  switch (fieldId) {
    case "cscsUpload":
      return "cscs";
    case "asbestosAwarenessUpload":
      return "asbestos";
    case "manualHandlingUpload":
      return "manualHandling";
    default:
      return undefined;
  }
}
