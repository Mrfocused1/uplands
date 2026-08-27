import { disabledOcrProvider } from "@/lib/ocr/disabled";
import type { OcrProvider } from "@/lib/ocr/types";

export function getOcrProvider(): OcrProvider {
  return disabledOcrProvider;
}
