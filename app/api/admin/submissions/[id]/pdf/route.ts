import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { requireAdmin, UnauthorizedError } from "@/lib/auth/admin";
import { getSubmission, transformFromRow } from "@/lib/db/submissions";
import { generateUHSF1601Pdf } from "@/lib/pdf/generateUHSF1601Pdf";
import type { UHSF1601PrintData, UploadedDocument } from "@/types/UHSF1601PrintData";
import type { EvidenceType } from "@/types/evidence";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw error;
  }

  const { id } = await context.params;
  const result = getSubmission(id);
  if (!result) return NextResponse.json({ error: "Submission not found." }, { status: 404 });

  const { row, evidence } = result;
  const printData = JSON.parse(row.print_data) as UHSF1601PrintData;

  const uploadedDocuments: UploadedDocument[] = evidence
    .filter((document) => document.storage_path)
    .map((document) => ({
      id: document.document_type as EvidenceType,
      label: document.original_name ?? document.document_type,
      storagePath: document.storage_path!,
      mimeType: document.mime_type ?? undefined,
      transform: transformFromRow(document),
    }));

  const templatePath = path.join(process.cwd(), "public", "forms", "UHSF16.01-master-300dpi.png");
  const templateBytes = new Uint8Array(await fs.readFile(templatePath));
  const pdf = await generateUHSF1601Pdf({ ...printData, uploadedDocuments }, templateBytes);

  const safeName =
    (row.full_name || "Inductee").replace(/[^a-zA-Z0-9-_ ]/g, "").trim().replace(/\s+/g, "_") || "Inductee";

  const url = new URL(request.url);
  const disposition = url.searchParams.get("download") === "1" ? "attachment" : "inline";

  return new NextResponse(Buffer.from(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="UHSF16.01_${safeName}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
