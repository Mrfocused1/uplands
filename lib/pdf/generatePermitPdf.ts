import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import type { PermitDetail } from "@/lib/db/permits";

const A4_WIDTH = 595.275590551;
const A4_HEIGHT = 841.88976378;
const MARGIN = 36;
const MAGENTA = rgb(188 / 255, 0, 150 / 255);
const CHARCOAL = rgb(30 / 255, 30 / 255, 34 / 255);
const MUTED = rgb(90 / 255, 90 / 255, 96 / 255);
const LIGHT = rgb(245 / 255, 245 / 255, 245 / 255);
const BORDER = rgb(205 / 255, 205 / 255, 210 / 255);

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= maxWidth) {
        line = next;
      } else {
        if (line) lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

function drawText(page: PDFPage, font: PDFFont, text: string, x: number, y: number, size = 9, color = CHARCOAL, maxWidth?: number) {
  const lines = maxWidth ? wrapText(text, font, size, maxWidth) : [text];
  lines.forEach((line, index) => {
    page.drawText(line, { x, y: y - index * (size + 3), size, font, color });
  });
  return y - lines.length * (size + 3);
}

function drawField(page: PDFPage, font: PDFFont, label: string, value: string | null | undefined, x: number, y: number, width: number) {
  page.drawText(label, { x, y, size: 7, font, color: MUTED });
  page.drawRectangle({ x, y: y - 24, width, height: 18, borderColor: BORDER, borderWidth: 0.7 });
  page.drawText(value?.trim() || "-", { x: x + 4, y: y - 19, size: 8.5, font, color: CHARCOAL });
}

function drawHeader(page: PDFPage, fonts: { regular: PDFFont; bold: PDFFont }, detail: PermitDetail) {
  page.drawText("UPLANDS", { x: MARGIN, y: A4_HEIGHT - 54, size: 28, font: fonts.bold, color: CHARCOAL });
  page.drawText("CONSTRUCTING CHANGE", { x: MARGIN + 2, y: A4_HEIGHT - 68, size: 7, font: fonts.regular, color: MUTED });
  page.drawText(detail.template.code, { x: A4_WIDTH - 132, y: A4_HEIGHT - 48, size: 10, font: fonts.bold, color: MAGENTA });
  page.drawText(`Permit No: ${detail.permit.permit_number}`, { x: A4_WIDTH - 220, y: A4_HEIGHT - 66, size: 8, font: fonts.bold, color: CHARCOAL });
  page.drawLine({ start: { x: MARGIN, y: A4_HEIGHT - 82 }, end: { x: A4_WIDTH - MARGIN, y: A4_HEIGHT - 82 }, thickness: 1, color: MAGENTA });
  page.drawText(detail.template.title, { x: MARGIN, y: A4_HEIGHT - 108, size: 18, font: fonts.bold, color: CHARCOAL });
  page.drawText(`Register: ${detail.template.register_code} | Status: ${detail.permit.status.replaceAll("_", " ")}`, {
    x: MARGIN,
    y: A4_HEIGHT - 124,
    size: 8,
    font: fonts.regular,
    color: MUTED,
  });
}

function answerFor(detail: PermitDetail, questionKey: string) {
  return detail.answers.find((answer) => answer.question_key === questionKey);
}

async function drawSignatureImage(pdfDoc: PDFDocument, page: PDFPage, dataUrl: string | null, x: number, y: number, width: number, height: number) {
  if (!dataUrl?.startsWith("data:image/png;base64,")) return;
  const png = await pdfDoc.embedPng(Buffer.from(dataUrl.split(",")[1], "base64"));
  const dims = png.scale(1);
  const ratio = Math.min(width / dims.width, height / dims.height);
  page.drawImage(png, { x, y, width: dims.width * ratio, height: dims.height * ratio });
}

export async function generatePermitPdf(detail: PermitDetail) {
  const pdfDoc = await PDFDocument.create();
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  const fonts = { regular, bold };
  drawHeader(page, fonts, detail);

  let y = A4_HEIGHT - 152;
  const fieldWidth = (A4_WIDTH - MARGIN * 2 - 18) / 2;
  drawField(page, regular, "Project / Site", detail.permit.site_location ?? detail.permit.project_name, MARGIN, y, fieldWidth);
  drawField(page, regular, "Contractor", detail.permit.contractor, MARGIN + fieldWidth + 18, y, fieldWidth);
  y -= 42;
  drawField(page, regular, "Location of Work", detail.permit.location_of_work, MARGIN, y, fieldWidth);
  drawField(page, regular, "Permit Validity", `${detail.permit.valid_from_date} ${detail.permit.valid_from_time} to ${detail.permit.valid_to_date} ${detail.permit.valid_to_time}`, MARGIN + fieldWidth + 18, y, fieldWidth);
  y -= 48;
  page.drawText("Description of Work", { x: MARGIN, y, size: 8, font: bold, color: MUTED });
  page.drawRectangle({ x: MARGIN, y: y - 56, width: A4_WIDTH - MARGIN * 2, height: 46, borderColor: BORDER, borderWidth: 0.7 });
  drawText(page, regular, detail.permit.description_of_work, MARGIN + 6, y - 22, 8.5, CHARCOAL, A4_WIDTH - MARGIN * 2 - 12);
  y -= 78;

  for (const section of detail.template.sections) {
    page.drawRectangle({ x: MARGIN, y: y - 20, width: A4_WIDTH - MARGIN * 2, height: 22, color: LIGHT, borderColor: BORDER, borderWidth: 0.5 });
    page.drawText(section.title, { x: MARGIN + 6, y: y - 13, size: 10, font: bold, color: CHARCOAL });
    y -= 32;

    for (const question of section.questions) {
      const answer = answerFor(detail, question.question_key);
      page.drawText(answer?.answer ?? "-", { x: MARGIN, y, size: 8, font: bold, color: MAGENTA });
      y = drawText(page, regular, question.prompt, MARGIN + 34, y, 8, CHARCOAL, A4_WIDTH - MARGIN * 2 - 34);
      if (answer?.comment) y = drawText(page, regular, `Comment: ${answer.comment}`, MARGIN + 34, y + 2, 7.2, MUTED, A4_WIDTH - MARGIN * 2 - 34);
      y -= 4;
    }
    y -= 8;
  }

  page.drawText("Authorisation / Signatures", { x: MARGIN, y, size: 12, font: bold, color: CHARCOAL });
  y -= 18;
  for (const signature of detail.signatures) {
    page.drawRectangle({ x: MARGIN, y: y - 48, width: A4_WIDTH - MARGIN * 2, height: 42, borderColor: BORDER, borderWidth: 0.7 });
    page.drawText(signature.action, { x: MARGIN + 6, y: y - 16, size: 8, font: bold, color: CHARCOAL });
    page.drawText(`${signature.name} | ${signature.company ?? "-"} | ${signature.position ?? signature.role} | ${signature.signed_at}`, {
      x: MARGIN + 6,
      y: y - 30,
      size: 7.2,
      font: regular,
      color: MUTED,
    });
    await drawSignatureImage(pdfDoc, page, signature.signature_data_url, A4_WIDTH - 170, y - 43, 128, 32);
    y -= 52;
  }

  return Buffer.from(await pdfDoc.save());
}
