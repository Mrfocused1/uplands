import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ExtractedPage, ExtractedTextItem } from "@/lib/rams/types";

const execFileAsync = promisify(execFile);

function decodeEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)));
}

function attr(tag: string, name: string) {
  return tag.match(new RegExp(`${name}="([^"]+)"`))?.[1] ?? "";
}

function groupWordsIntoText(words: ExtractedTextItem[]) {
  const lines = new Map<number, ExtractedTextItem[]>();
  for (const word of words) {
    const key = Math.round(word.y / 4) * 4;
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
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

export async function extractPdfTextWithBoxes(filePath: string, expectedPageCount: number): Promise<ExtractedPage[]> {
  let stdout = "";
  try {
    const result = await execFileAsync("pdftotext", ["-bbox-layout", filePath, "-"], {
      maxBuffer: 80 * 1024 * 1024,
    });
    stdout = result.stdout;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      throw new Error("PDF text extraction requires Poppler pdftotext, which is not installed in this runtime.");
    }
    const message = error instanceof Error ? error.message : "Unable to extract PDF text.";
    throw new Error(`PDF text extraction failed. Ensure Poppler is installed. ${message}`);
  }

  const pages: ExtractedPage[] = [];
  const pageRegex = /<page\b([^>]*)>([\s\S]*?)<\/page>/g;
  let pageMatch: RegExpExecArray | null;
  let pageNumber = 1;

  while ((pageMatch = pageRegex.exec(stdout))) {
    const pageTag = pageMatch[1];
    const body = pageMatch[2];
    const words: ExtractedTextItem[] = [];
    const wordRegex = /<word\b([^>]*)>([\s\S]*?)<\/word>/g;
    let wordMatch: RegExpExecArray | null;

    while ((wordMatch = wordRegex.exec(body))) {
      const tag = wordMatch[1];
      const text = decodeEntities(wordMatch[2]).trim();
      if (!text) continue;
      const xMin = Number(attr(tag, "xMin"));
      const yMin = Number(attr(tag, "yMin"));
      const xMax = Number(attr(tag, "xMax"));
      const yMax = Number(attr(tag, "yMax"));
      words.push({
        text,
        x: xMin,
        y: yMin,
        width: Math.max(0, xMax - xMin),
        height: Math.max(0, yMax - yMin),
      });
    }

    pages.push({
      pageNumber,
      width: Number(attr(pageTag, "width")) || 595,
      height: Number(attr(pageTag, "height")) || 842,
      text: groupWordsIntoText(words),
      items: words,
    });
    pageNumber += 1;
  }

  while (pages.length < expectedPageCount) {
    pages.push({ pageNumber: pages.length + 1, width: 595, height: 842, text: "", items: [] });
  }

  return pages;
}
