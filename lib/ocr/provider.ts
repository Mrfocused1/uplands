import { disabledOcrProvider } from "./disabled.ts";
import { tesseractOcrProvider } from "./tesseract.ts";
import type { OcrProvider } from "./types.ts";

export function getOcrProvider(): OcrProvider {
  if (process.env.OCR_PROVIDER === "tesseract") return tesseractOcrProvider;
  return disabledOcrProvider;
}
