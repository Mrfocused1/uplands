import fs from "node:fs/promises";

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { NextResponse } from "next/server";

import { findEditableImageDocument, type EditablePdfField } from "@/config/editImages";
import { getEditableImageSourcePath } from "@/lib/edit-images/source";

export const runtime = "nodejs";

type DownloadPayload = {
  fields?: Record<string, unknown>;
};

function sanitizeValue(value: unknown) {
  if (typeof value !== "string") return "";
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").slice(0, 400);
}

function wrapLine(line: string, font: PDFFont, fontSize: number, maxWidth: number) {
  const words = line.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, fontSize) <= maxWidth) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    current = word;
  }

  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function drawFieldValue(page: PDFPage, field: EditablePdfField, value: string, font: PDFFont) {
  const pageHeight = page.getHeight();
  const rectY = pageHeight - field.rect.y - field.rect.height;
  const paddingX = field.align === "left" ? 4 : 2;
  const maxTextWidth = field.rect.width - paddingX * 2;
  const fontSize = field.fontSize;
  const lineHeight = fontSize * 1.18;
  const lines = value
    .split("\n")
    .flatMap((line) => wrapLine(line, font, fontSize, maxTextWidth))
    .slice(0, field.multiline ? 3 : 2);

  page.drawRectangle({
    x: field.rect.x,
    y: rectY,
    width: field.rect.width,
    height: field.rect.height,
    color: rgb(0.75, 0.75, 0.75),
  });

  if (!value.trim()) return;

  const blockHeight = lines.length * lineHeight;
  const firstBaseline = rectY + field.rect.height - (field.rect.height - blockHeight) / 2 - fontSize;

  lines.forEach((line, index) => {
    const textWidth = font.widthOfTextAtSize(line, fontSize);
    const textX =
      field.align === "center" ? field.rect.x + (field.rect.width - textWidth) / 2 : field.rect.x + paddingX;
    page.drawText(line, {
      x: textX,
      y: firstBaseline - index * lineHeight,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    });
  });
}

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const document = findEditableImageDocument(slug);
  const sourcePath = getEditableImageSourcePath(slug);
  if (!document || !sourcePath) return NextResponse.json({ error: "Document not found." }, { status: 404 });

  let payload: DownloadPayload;
  try {
    payload = (await request.json()) as DownloadPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const sourceBytes = await fs.readFile(sourcePath);
  const pdf = await PDFDocument.load(sourceBytes);
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  const fieldValues = payload.fields ?? {};
  for (const field of document.fields) {
    const page = pdf.getPage(field.pageNumber - 1);
    const value = Object.hasOwn(fieldValues, field.id) ? sanitizeValue(fieldValues[field.id]) : field.initialValue;
    drawFieldValue(page, field, value, font);
  }

  const outputBytes = await pdf.save();

  return new NextResponse(new Uint8Array(outputBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${document.editedFileName.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
