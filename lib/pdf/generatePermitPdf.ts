import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import { PERMIT_TEMPLATES } from "@/config/permitTemplates";
import type { PermitDetail } from "@/lib/db/permits";

const A4_WIDTH = 595.275590551;
const A4_HEIGHT = 841.88976378;
const MARGIN = 34;
const CONTENT_WIDTH = A4_WIDTH - MARGIN * 2;
const MAGENTA = rgb(188 / 255, 0, 150 / 255);
const CHARCOAL = rgb(30 / 255, 30 / 255, 34 / 255);
const MUTED = rgb(86 / 255, 86 / 255, 92 / 255);
const LIGHT = rgb(246 / 255, 246 / 255, 246 / 255);
const SOFT_MAGENTA = rgb(252 / 255, 241 / 255, 249 / 255);
const BORDER = rgb(202 / 255, 202 / 255, 208 / 255);
const GREEN = rgb(52 / 255, 128 / 255, 74 / 255);
const RED = rgb(174 / 255, 44 / 255, 44 / 255);

type Fonts = { regular: PDFFont; bold: PDFFont };

function displayStatus(value: string) {
  return value.replaceAll("_", " ");
}

function displayAnswer(value: string | null | undefined) {
  if (value === "NA") return "N/A";
  return value || "-";
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" });
}

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
  return lines.length ? lines : [""];
}

function drawWrappedText(page: PDFPage, font: PDFFont, text: string, x: number, y: number, size: number, color = CHARCOAL, maxWidth = CONTENT_WIDTH, lineGap = 3) {
  const lines = wrapText(text, font, size, maxWidth);
  lines.forEach((line, index) => {
    page.drawText(line, { x, y: y - index * (size + lineGap), size, font, color });
  });
  return y - lines.length * (size + lineGap);
}

function drawHeader(page: PDFPage, fonts: Fonts, detail: PermitDetail) {
  page.drawText("UPLANDS", { x: MARGIN, y: A4_HEIGHT - 42, size: 25, font: fonts.bold, color: CHARCOAL });
  page.drawText("CONSTRUCTING CHANGE", { x: MARGIN + 1, y: A4_HEIGHT - 55, size: 6.5, font: fonts.regular, color: MUTED });
  page.drawText(detail.template.code, { x: A4_WIDTH - 124, y: A4_HEIGHT - 39, size: 10, font: fonts.bold, color: MAGENTA });
  page.drawText(detail.template.version ? `Version ${detail.template.version}` : "Version -", { x: A4_WIDTH - 124, y: A4_HEIGHT - 54, size: 7, font: fonts.regular, color: MUTED });
  page.drawLine({ start: { x: MARGIN, y: A4_HEIGHT - 72 }, end: { x: A4_WIDTH - MARGIN, y: A4_HEIGHT - 72 }, thickness: 1, color: MAGENTA });
}

function drawFooter(pdfDoc: PDFDocument, fonts: Fonts, detail: PermitDetail) {
  const pages = pdfDoc.getPages();
  pages.forEach((page, index) => {
    page.drawLine({ start: { x: MARGIN, y: 32 }, end: { x: A4_WIDTH - MARGIN, y: 32 }, thickness: 0.5, color: BORDER });
    page.drawText(`${detail.permit.permit_number} | Generated ${formatDateTime(new Date().toISOString())}`, {
      x: MARGIN,
      y: 18,
      size: 6.5,
      font: fonts.regular,
      color: MUTED,
    });
    page.drawText(`Page ${index + 1} of ${pages.length}`, {
      x: A4_WIDTH - 82,
      y: 18,
      size: 6.5,
      font: fonts.regular,
      color: MUTED,
    });
  });
}

function drawLabelValue(page: PDFPage, fonts: Fonts, label: string, value: string | null | undefined, x: number, y: number, width: number, height = 31) {
  page.drawRectangle({ x, y: y - height, width, height, borderColor: BORDER, borderWidth: 0.7 });
  page.drawText(label, { x: x + 5, y: y - 10, size: 6.6, font: fonts.bold, color: MUTED });
  drawWrappedText(page, fonts.regular, value?.trim() || "-", x + 5, y - 22, 8.2, CHARCOAL, width - 10, 2);
}

function answerColor(answer: string | null | undefined) {
  if (answer === "YES") return GREEN;
  if (answer === "NO") return RED;
  return MUTED;
}

function addPage(pdfDoc: PDFDocument, fonts: Fonts, detail: PermitDetail) {
  const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  drawHeader(page, fonts, detail);
  return { page, y: A4_HEIGHT - 96 };
}

function ensureSpace(pdfDoc: PDFDocument, fonts: Fonts, detail: PermitDetail, current: { page: PDFPage; y: number }, required: number) {
  if (current.y - required >= 46) return current;
  return addPage(pdfDoc, fonts, detail);
}

function answerFor(detail: PermitDetail, questionKey: string) {
  return detail.answers.find((answer) => answer.question_key === questionKey);
}

async function drawSignatureImage(pdfDoc: PDFDocument, page: PDFPage, fonts: Fonts, dataUrl: string | null, x: number, y: number, width: number, height: number) {
  if (!dataUrl?.startsWith("data:image/png;base64,")) return;
  try {
    const png = await pdfDoc.embedPng(Buffer.from(dataUrl.split(",")[1], "base64"));
    const dims = png.scale(1);
    const ratio = Math.min(width / dims.width, height / dims.height);
    page.drawImage(png, { x, y, width: dims.width * ratio, height: dims.height * ratio });
  } catch {
    page.drawText("Signature image could not be rendered", { x, y: y + 12, size: 7, font: fonts.regular, color: RED });
  }
}

function drawTitleBlock(page: PDFPage, fonts: Fonts, detail: PermitDetail, y: number) {
  page.drawRectangle({ x: MARGIN, y: y - 62, width: CONTENT_WIDTH, height: 62, color: SOFT_MAGENTA, borderColor: BORDER, borderWidth: 0.7 });
  page.drawText(detail.template.title, { x: MARGIN + 10, y: y - 21, size: 18, font: fonts.bold, color: CHARCOAL });
  page.drawText(`Permit No: ${detail.permit.permit_number}`, { x: MARGIN + 10, y: y - 39, size: 9, font: fonts.bold, color: CHARCOAL });
  page.drawText(`Register: ${detail.template.register_code}`, { x: MARGIN + 10, y: y - 53, size: 7.5, font: fonts.regular, color: MUTED });
  page.drawRectangle({ x: A4_WIDTH - 153, y: y - 42, width: 110, height: 24, borderColor: MAGENTA, borderWidth: 1 });
  page.drawText(displayStatus(detail.permit.status), { x: A4_WIDTH - 144, y: y - 34, size: 9, font: fonts.bold, color: MAGENTA });
  return y - 82;
}

function drawDetails(page: PDFPage, fonts: Fonts, detail: PermitDetail, y: number) {
  const columnWidth = (CONTENT_WIDTH - 10) / 2;
  drawLabelValue(page, fonts, "Project / Site", detail.permit.site_location ?? detail.permit.project_name, MARGIN, y, columnWidth);
  drawLabelValue(page, fonts, "Contractor", detail.permit.contractor, MARGIN + columnWidth + 10, y, columnWidth);
  y -= 39;
  drawLabelValue(page, fonts, "Location of Work", detail.permit.location_of_work, MARGIN, y, columnWidth);
  drawLabelValue(
    page,
    fonts,
    "Permit Validity",
    `${detail.permit.valid_from_date} ${detail.permit.valid_from_time} to ${detail.permit.valid_to_date} ${detail.permit.valid_to_time}`,
    MARGIN + columnWidth + 10,
    y,
    columnWidth,
  );
  y -= 39;
  drawLabelValue(page, fonts, "Description of Work", detail.permit.description_of_work, MARGIN, y, CONTENT_WIDTH, 50);
  return y - 66;
}

function drawSectionHeading(page: PDFPage, fonts: Fonts, title: string, y: number) {
  page.drawRectangle({ x: MARGIN, y: y - 22, width: CONTENT_WIDTH, height: 22, color: LIGHT, borderColor: BORDER, borderWidth: 0.7 });
  page.drawText(title, { x: MARGIN + 7, y: y - 14, size: 10, font: fonts.bold, color: CHARCOAL });
  return y - 32;
}

function drawQuestion(page: PDFPage, fonts: Fonts, prompt: string, answer: string | null | undefined, comment: string | null | undefined, y: number) {
  const commentLines = comment ? wrapText(`Comment: ${comment}`, fonts.regular, 7, CONTENT_WIDTH - 82) : [];
  const promptLines = wrapText(prompt, fonts.regular, 8, CONTENT_WIDTH - 82);
  const rowHeight = Math.max(26, 12 + promptLines.length * 11 + commentLines.length * 10);
  page.drawRectangle({ x: MARGIN, y: y - rowHeight, width: CONTENT_WIDTH, height: rowHeight, borderColor: BORDER, borderWidth: 0.5 });
  page.drawText(displayAnswer(answer), { x: MARGIN + 7, y: y - 17, size: 8, font: fonts.bold, color: answerColor(answer) });
  drawWrappedText(page, fonts.regular, prompt, MARGIN + 50, y - 13, 8, CHARCOAL, CONTENT_WIDTH - 82, 3);
  if (comment) drawWrappedText(page, fonts.regular, `Comment: ${comment}`, MARGIN + 50, y - 13 - promptLines.length * 11, 7, MUTED, CONTENT_WIDTH - 82, 3);
  return y - rowHeight;
}

async function drawSignatureStage(pdfDoc: PDFDocument, page: PDFPage, fonts: Fonts, title: string, action: string, signature: PermitDetail["signatures"][number] | undefined, y: number) {
  const height = 72;
  page.drawRectangle({ x: MARGIN, y: y - height, width: CONTENT_WIDTH, height, borderColor: BORDER, borderWidth: 0.7 });
  page.drawText(title, { x: MARGIN + 7, y: y - 14, size: 9, font: fonts.bold, color: CHARCOAL });
  page.drawText(action, { x: MARGIN + 7, y: y - 28, size: 7, font: fonts.regular, color: MUTED });
  page.drawText(`Name: ${signature?.name || "-"}`, { x: MARGIN + 7, y: y - 45, size: 7.5, font: fonts.regular, color: CHARCOAL });
  page.drawText(`Company: ${signature?.company || "-"}`, { x: MARGIN + 157, y: y - 45, size: 7.5, font: fonts.regular, color: CHARCOAL });
  page.drawText(`Position: ${signature?.position || signature?.role || "-"}`, { x: MARGIN + 307, y: y - 45, size: 7.5, font: fonts.regular, color: CHARCOAL });
  page.drawText(`Signed: ${formatDateTime(signature?.signed_at)}`, { x: MARGIN + 7, y: y - 60, size: 7, font: fonts.regular, color: MUTED });
  await drawSignatureImage(pdfDoc, page, fonts, signature?.signature_data_url ?? null, A4_WIDTH - 164, y - 66, 116, 34);
  return y - height - 10;
}

function drawAuditEvent(page: PDFPage, fonts: Fonts, event: PermitDetail["activity"][number], y: number) {
  const detail = [event.detail, event.actor ? `By ${event.actor}` : ""].filter(Boolean).join(" | ");
  const detailLines = wrapText(detail, fonts.regular, 7, CONTENT_WIDTH - 118);
  const rowHeight = Math.max(28, 16 + detailLines.length * 10);
  page.drawRectangle({ x: MARGIN, y: y - rowHeight, width: CONTENT_WIDTH, height: rowHeight, borderColor: BORDER, borderWidth: 0.5 });
  page.drawText(formatDateTime(event.occurred_at), { x: MARGIN + 7, y: y - 15, size: 7, font: fonts.bold, color: MUTED });
  page.drawText(event.title, { x: MARGIN + 118, y: y - 14, size: 8, font: fonts.bold, color: CHARCOAL });
  drawWrappedText(page, fonts.regular, detail, MARGIN + 118, y - 25, 7, MUTED, CONTENT_WIDTH - 126, 3);
  return y - rowHeight;
}

export async function generatePermitPdf(detail: PermitDetail) {
  const pdfDoc = await PDFDocument.create();
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fonts = { regular, bold };
  let current = addPage(pdfDoc, fonts, detail);

  current.y = drawTitleBlock(current.page, fonts, detail, current.y);
  current.y = drawDetails(current.page, fonts, detail, current.y);

  for (const section of detail.template.sections) {
    current = ensureSpace(pdfDoc, fonts, detail, current, 70);
    current.y = drawSectionHeading(current.page, fonts, section.title, current.y);

    for (const question of section.questions) {
      const answer = answerFor(detail, question.question_key);
      current = ensureSpace(pdfDoc, fonts, detail, current, answer?.comment ? 58 : 38);
      current.y = drawQuestion(current.page, fonts, question.prompt, answer?.answer, answer?.comment, current.y);
    }
    current.y -= 10;
  }

  current = ensureSpace(pdfDoc, fonts, detail, current, 110);
  current.y = drawSectionHeading(current.page, fonts, "Authorisation / Signatures", current.y);
  const templateConfig = PERMIT_TEMPLATES.find((template) => template.id === detail.template.id);
  const signatureStages = templateConfig?.signatures ?? [];
  for (const stage of signatureStages) {
    current = ensureSpace(pdfDoc, fonts, detail, current, 88);
    const signature = detail.signatures.find((item) => item.signature_key === stage.key);
    current.y = await drawSignatureStage(pdfDoc, current.page, fonts, stage.title, stage.action, signature, current.y);
  }

  current = ensureSpace(pdfDoc, fonts, detail, current, 86);
  current.y = drawSectionHeading(current.page, fonts, "Audit Trail", current.y);
  const activity = [...detail.activity].reverse();
  if (activity.length === 0) {
    current.y = drawQuestion(current.page, fonts, "No audit activity recorded for this permit.", "-", null, current.y);
  } else {
    for (const event of activity) {
      current = ensureSpace(pdfDoc, fonts, detail, current, 42);
      current.y = drawAuditEvent(current.page, fonts, event, current.y);
    }
  }

  drawFooter(pdfDoc, fonts, detail);
  return Buffer.from(await pdfDoc.save());
}
