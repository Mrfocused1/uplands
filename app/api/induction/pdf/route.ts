import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { assertPublicPayloadSize, validateUHSF1601PrintData, ValidationError } from "@/lib/induction/validatePrintData";
import { generateUHSF1601Pdf } from "@/lib/pdf/generateUHSF1601Pdf";
import { rateLimit } from "@/lib/security/rateLimit";

export const runtime = "nodejs";

function sanitizeFilenamePart(value: string | null | undefined) {
  const safe = (value || "Inductee")
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .trim()
    .replace(/\s+/g, "_");

  return safe || "Inductee";
}

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, { scope: "induction-pdf", limit: 30, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;

  let data;
  try {
    assertPublicPayloadSize(request);
    data = validateUHSF1601PrintData(await request.json().catch(() => null));
  } catch (error) {
    if (error instanceof ValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    throw error;
  }

  const templatePath = path.join(process.cwd(), "public", "forms", "UHSF16.01-master-300dpi.png");

  let file: Buffer;

  try {
    file = await fs.readFile(templatePath);
  } catch {
    return NextResponse.json(
      {
        error: "UHSF16.01 master template is missing.",
        requiredPath: "public/forms/UHSF16.01-master-300dpi.png",
      },
      { status: 500 },
    );
  }

  const templateBytes = new Uint8Array(file.buffer, file.byteOffset, file.byteLength);
  const pdf = await generateUHSF1601Pdf(data, templateBytes);
  const safeName = sanitizeFilenamePart(data.fullName);

  return new NextResponse(Buffer.from(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="UHSF16.01_${safeName}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
