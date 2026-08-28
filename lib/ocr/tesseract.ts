import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";
import { createWorker } from "tesseract.js";
import type { ExtractedPage, ExtractedTextItem } from "../rams/types.ts";
import type { OcrProvider } from "./types.ts";

const execFileAsync = promisify(execFile);

function maxPages() {
  const parsed = Number(process.env.OCR_MAX_PAGES ?? "80");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 80;
}

function textFromWords(words: ExtractedTextItem[]) {
  const lines = new Map<number, ExtractedTextItem[]>();
  for (const word of words) {
    const key = Math.round(word.y / 10) * 10;
    lines.set(key, [...(lines.get(key) ?? []), word]);
  }
  return Array.from(lines.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, lineWords]) =>
      lineWords
        .sort((a, b) => a.x - b.x)
        .map((word) => word.text)
        .join(" "),
    )
    .join("\n")
    .trim();
}

function wordsFromTesseract(data: unknown): ExtractedTextItem[] {
  const words = (data as { words?: unknown[] }).words ?? [];
  return words
    .map((word) => {
      const value = word as { text?: unknown; bbox?: { x0?: unknown; y0?: unknown; x1?: unknown; y1?: unknown } };
      const text = typeof value.text === "string" ? value.text.trim() : "";
      const x0 = Number(value.bbox?.x0);
      const y0 = Number(value.bbox?.y0);
      const x1 = Number(value.bbox?.x1);
      const y1 = Number(value.bbox?.y1);
      if (!text || !Number.isFinite(x0) || !Number.isFinite(y0) || !Number.isFinite(x1) || !Number.isFinite(y1)) return null;
      return {
        text,
        x: x0,
        y: y0,
        width: Math.max(1, x1 - x0),
        height: Math.max(1, y1 - y0),
      };
    })
    .filter((word): word is ExtractedTextItem => Boolean(word));
}

export const tesseractOcrProvider: OcrProvider = {
  name: "tesseract",
  isAvailable() {
    return true;
  },
  async extractText(input) {
    const pageLimit = Math.min(input.pageCount, maxPages());
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "uplands-rams-ocr-"));
    const worker = await createWorker("eng");
    const pages: ExtractedPage[] = [];

    try {
      for (let pageNumber = 1; pageNumber <= pageLimit; pageNumber += 1) {
        const prefix = path.join(tempDir, `page-${pageNumber}`);
        await execFileAsync("pdftoppm", ["-png", "-r", "180", "-f", String(pageNumber), "-l", String(pageNumber), "-singlefile", input.filePath, prefix], {
          maxBuffer: 20 * 1024 * 1024,
        });
        const imagePath = `${prefix}.png`;
        const metadata = await sharp(imagePath).metadata();
        const result = await worker.recognize(imagePath);
        const words = wordsFromTesseract(result.data);
        pages.push({
          pageNumber,
          width: metadata.width ?? 1240,
          height: metadata.height ?? 1754,
          text: textFromWords(words) || result.data.text.trim(),
          items: words,
        });
      }

      while (pages.length < input.pageCount) {
        pages.push({ pageNumber: pages.length + 1, width: 595, height: 842, text: "", items: [] });
      }

      return pages;
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
        throw new Error("OCR processing requires Poppler pdftoppm, which is not installed in this runtime.");
      }
      throw error;
    } finally {
      await worker.terminate();
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  },
};
