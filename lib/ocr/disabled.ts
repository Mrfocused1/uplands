import type { OcrProvider } from "./types.ts";

export const disabledOcrProvider: OcrProvider = {
  name: "disabled",
  isAvailable() {
    return false;
  },
  async extractText() {
    throw new Error("OCR is not configured for this environment.");
  },
};
