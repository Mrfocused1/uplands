import type { OcrProvider } from "@/lib/ocr/types";

export const disabledOcrProvider: OcrProvider = {
  name: "disabled",
  isAvailable() {
    return false;
  },
  async extractText() {
    throw new Error("OCR is not configured for this environment.");
  },
};
