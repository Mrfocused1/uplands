import type { ExtractedPage } from "../rams/types.ts";

export interface OcrProvider {
  name: string;
  isAvailable(): boolean;
  extractText(input: { filePath: string; pageCount: number }): Promise<ExtractedPage[]>;
}
