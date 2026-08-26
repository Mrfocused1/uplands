import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { UHSF1601_PRINT_MAP, type PixelRect } from "@/config/uhsf1601PrintMap";
import { addInductionEvidencePage } from "@/lib/pdf/addInductionEvidencePage";
import type { UHSF1601PrintData } from "@/types/UHSF1601PrintData";

const TEMPLATE_WIDTH = 1055;
const TEMPLATE_HEIGHT = 1491;
const A4_WIDTH_PT = 595.275590551;
const A4_HEIGHT_PT = 841.88976378;
const ANSWER_COLOR = rgb(17 / 255, 17 / 255, 17 / 255);
const TICK_COLOR = rgb(0.04, 0.04, 0.04);
const DEBUG_PRINT_FIELDS = false;

function convertRect(rect: PixelRect) {
  const scaleX = A4_WIDTH_PT / TEMPLATE_WIDTH;
  const scaleY = A4_HEIGHT_PT / TEMPLATE_HEIGHT;

  return {
    x: rect.x * scaleX,
    y: A4_HEIGHT_PT - (rect.y + rect.height) * scaleY,
    width: rect.width * scaleX,
    height: rect.height * scaleY,
  };
}

function fitTextSize(text: string, font: PDFFont, maxWidth: number, preferred = 8, minimum = 5.5) {
  let size = preferred;

  while (size > minimum && font.widthOfTextAtSize(text, size) > maxWidth) {
    size -= 0.25;
  }

  return size;
}

function drawSingleLine(
  page: PDFPage,
  font: PDFFont,
  value: string | null | undefined,
  rect: PixelRect,
  options?: {
    fontSize?: number;
    align?: "left" | "center";
  },
) {
  const text = value?.trim();
  if (!text) return;

  const r = convertRect(rect);
  const preferred = options?.fontSize ?? 8;
  const paddingX = 3;
  const size = fitTextSize(text, font, r.width - paddingX * 2, preferred, 5.5);
  const textWidth = font.widthOfTextAtSize(text, size);
  const x = options?.align === "center" ? r.x + (r.width - textWidth) / 2 : r.x + paddingX;
  const y = r.y + (r.height - size) / 2 + 1;

  page.drawText(text, {
    x,
    y,
    size,
    font,
    color: ANSWER_COLOR,
  });
}

function drawYesNo(page: PDFPage, boldFont: PDFFont, value: boolean | null | undefined, rect: PixelRect) {
  if (value === null || value === undefined) return;
  drawSingleLine(page, boldFont, value ? "YES" : "NO", rect, { fontSize: 8, align: "center" });
}

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number) {
  const lines: string[] = [];
  const paragraphs = text.trim().split(/\r?\n/);

  paragraphs.forEach((paragraph) => {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    let line = "";

    words.forEach((word) => {
      const next = line ? `${line} ${word}` : word;

      if (font.widthOfTextAtSize(next, fontSize) <= maxWidth) {
        line = next;
      } else {
        if (line) lines.push(line);
        line = word;
      }
    });

    if (line) lines.push(line);
  });

  return lines;
}

function drawMultiline(
  page: PDFPage,
  font: PDFFont,
  value: string | null | undefined,
  rect: PixelRect,
  options?: {
    preferredSize?: number;
    minimumSize?: number;
    maxLines?: number;
  },
) {
  const text = value?.trim();
  if (!text) return;

  const r = convertRect(rect);
  const preferred = options?.preferredSize ?? 7;
  const minimum = options?.minimumSize ?? 5;
  const maxLines = options?.maxLines ?? 4;
  const horizontalPadding = 3;
  const verticalPadding = 3;

  let size = preferred;
  let lines = wrapText(text, font, size, r.width - horizontalPadding * 2);

  while (size > minimum) {
    lines = wrapText(text, font, size, r.width - horizontalPadding * 2);
    const lineHeight = size * 1.15;
    const requiredHeight = lines.length * lineHeight;

    if (lines.length <= maxLines && requiredHeight <= r.height - verticalPadding * 2) break;
    size -= 0.25;
  }

  const lineHeight = size * 1.15;
  const safeLines = lines.slice(0, maxLines);
  let y = r.y + r.height - verticalPadding - size;

  safeLines.forEach((line) => {
    page.drawText(line, {
      x: r.x + horizontalPadding,
      y,
      size,
      font,
      color: ANSWER_COLOR,
    });
    y -= lineHeight;
  });
}

function drawTick(page: PDFPage, rect: PixelRect) {
  const r = convertRect(rect);

  const x1 = r.x + r.width * 0.22;
  const y1 = r.y + r.height * 0.48;
  const x2 = r.x + r.width * 0.43;
  const y2 = r.y + r.height * 0.27;
  const x3 = r.x + r.width * 0.78;
  const y3 = r.y + r.height * 0.72;

  page.drawLine({
    start: { x: x1, y: y1 },
    end: { x: x2, y: y2 },
    thickness: 1.5,
    color: TICK_COLOR,
  });

  page.drawLine({
    start: { x: x2, y: y2 },
    end: { x: x3, y: y3 },
    thickness: 1.5,
    color: TICK_COLOR,
  });
}

async function drawSignature(pdfDoc: PDFDocument, page: PDFPage, dataUrl: string | null | undefined, rect: PixelRect) {
  if (!dataUrl) return;

  const comma = dataUrl.indexOf(",");
  if (comma === -1) return;

  const binary = Buffer.from(dataUrl.slice(comma + 1), "base64");
  const signature = await pdfDoc.embedPng(binary);
  const r = convertRect(rect);
  const padding = 3;
  const maxWidth = r.width - padding * 2;
  const maxHeight = r.height - padding * 2;
  const aspect = signature.width / signature.height;

  let width: number;
  let height: number;

  if (maxWidth / maxHeight < aspect) {
    width = maxWidth;
    height = maxWidth / aspect;
  } else {
    height = maxHeight;
    width = maxHeight * aspect;
  }

  page.drawImage(signature, {
    x: r.x + (r.width - width) / 2,
    y: r.y + (r.height - height) / 2,
    width,
    height,
  });
}

function formatUKDate(value: string | Date | null | undefined) {
  if (!value) return "";

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function drawDebugFields(page: PDFPage) {
  if (!DEBUG_PRINT_FIELDS) return;

  Object.values(UHSF1601_PRINT_MAP).forEach((rect) => {
    const r = convertRect(rect);
    page.drawRectangle({
      x: r.x,
      y: r.y,
      width: r.width,
      height: r.height,
      borderColor: rgb(1, 0, 0),
      borderWidth: 0.4,
      opacity: 0.3,
    });
  });
}

export async function generateUHSF1601Pdf(data: UHSF1601PrintData, templateBytes: ArrayBuffer | Uint8Array) {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle("UHSF16.01 Site Induction Registration Form");
  pdfDoc.setSubject("Uplands Site Induction Registration");
  pdfDoc.setCreator("Uplands Digital Site Induction");
  pdfDoc.setProducer("Uplands Digital Site Induction");

  const page = pdfDoc.addPage([A4_WIDTH_PT, A4_HEIGHT_PT]);
  const template = await pdfDoc.embedPng(templateBytes);
  page.drawImage(template, {
    x: 0,
    y: 0,
    width: A4_WIDTH_PT,
    height: A4_HEIGHT_PT,
  });

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const M = UHSF1601_PRINT_MAP;

  drawSingleLine(page, font, data.fullName, M.fullName);
  drawSingleLine(page, font, data.contactNumber, M.contactNumber);
  drawMultiline(page, font, data.homeAddress, M.homeAddress, { preferredSize: 7.5, minimumSize: 5.5, maxLines: 5 });
  drawSingleLine(page, font, data.companyName, M.companyName);
  drawSingleLine(page, font, data.occupation, M.occupation);
  drawSingleLine(page, font, data.emergencyContactName, M.emergencyContactName);
  drawSingleLine(page, font, data.emergencyContactTelephone, M.emergencyContactTelephone);
  drawMultiline(page, font, data.medicalInformation, M.medicalInformation, { preferredSize: 7, minimumSize: 5, maxLines: 4 });

  drawSingleLine(page, font, data.cscsCardNumber, M.cscsCardNumber, { fontSize: 7.5 });
  drawSingleLine(page, font, formatUKDate(data.cscsExpiry), M.cscsExpiry, { fontSize: 7, align: "center" });
  if (data.asbestosCertificatePresent === true) drawTick(page, M.asbestosCertificatePresent);

  drawYesNo(page, boldFont, data.scaffolding, M.scaffoldingYesNo);
  if (data.scaffolding === true) {
    drawSingleLine(page, font, data.cisrsNumber, M.cisrsNumber, { fontSize: 7.5 });
    drawSingleLine(page, font, formatUKDate(data.cisrsExpiry), M.cisrsExpiry, { fontSize: 7, align: "center" });
  }

  drawYesNo(page, boldFont, data.operatingPlant, M.plantYesNo);
  if (data.operatingPlant === true) {
    drawSingleLine(page, font, data.cpcsNumber, M.cpcsNumber, { fontSize: 7.5 });
    drawSingleLine(page, font, formatUKDate(data.cpcsExpiry), M.cpcsExpiry, { fontSize: 7, align: "center" });
  }

  drawSingleLine(page, font, data.clientSpecificTraining, M.clientSpecificTraining, { fontSize: 6.5, align: "center" });
  drawSingleLine(page, font, formatUKDate(data.clientTrainingCompletionDate), M.clientTrainingCompletionDate, { fontSize: 7, align: "center" });
  drawSingleLine(page, font, formatUKDate(data.clientTrainingExpiryDate), M.clientTrainingExpiryDate, { fontSize: 7, align: "center" });
  drawYesNo(page, boldFont, data.trainedFirstAider, M.firstAiderYesNo);
  drawYesNo(page, boldFont, data.trainedFireWarden, M.fireWardenYesNo);
  drawYesNo(page, boldFont, data.supervisor, M.supervisorYesNo);
  drawYesNo(page, boldFont, data.currentSmstsOrSssts, M.smstsOrSsstsYesNo);
  drawYesNo(page, boldFont, data.ramsBriefed, M.ramsBriefedYesNo);

  await drawSignature(pdfDoc, page, data.inducteeSignature, M.inducteeSignature);
  drawSingleLine(page, font, formatUKDate(data.declarationDate), M.declarationDate, { fontSize: 8, align: "center" });

  drawSingleLine(page, font, data.siteName, M.siteName, { fontSize: 8 });
  if (data.hardHatPresent === true) drawTick(page, M.hardHatPresent);
  if (data.highVisPresent === true) drawTick(page, M.highVisPresent);
  if (data.glovesPresent === true) drawTick(page, M.glovesPresent);
  if (data.bootsPresent === true) drawTick(page, M.bootsPresent);
  if (data.safetyEyewearPresent === true) drawTick(page, M.safetyEyewearPresent);
  if (data.rpePresent === true) drawTick(page, M.rpePresent);

  const inductorNameDate = [data.inductorName?.trim(), formatUKDate(data.inductorDate)].filter(Boolean).join("  ");
  drawSingleLine(page, font, inductorNameDate, M.inductorNameAndDate, { fontSize: 7.5 });
  await drawSignature(pdfDoc, page, data.inductorSignature, M.inductorSignature);
  drawSingleLine(page, font, data.inductorJobTitle, M.inductorJobTitle, { fontSize: 7.5 });

  if (data.cscsCopyTaken === true) drawTick(page, M.cscsCopyTaken);
  if (data.aaCertificateCopyTaken === true) drawTick(page, M.aaCertificateCopyTaken);
  if (data.ipafCopyTaken === true) drawTick(page, M.ipafCopyTaken);
  if (data.spaCopyTaken === true) drawTick(page, M.spaCopyTaken);

  await addInductionEvidencePage(pdfDoc, data.uploadedDocuments ?? []);

  drawDebugFields(page);

  return pdfDoc.save({
    useObjectStreams: false,
  });
}
