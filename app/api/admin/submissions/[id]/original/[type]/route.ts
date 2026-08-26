import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import { requireAdmin, UnauthorizedError } from "@/lib/auth/admin";
import { getSubmission } from "@/lib/db/submissions";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string; type: string }> }) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw error;
  }

  const { id, type } = await context.params;
  const result = getSubmission(id);
  if (!result) return NextResponse.json({ error: "Submission not found." }, { status: 404 });

  const document = result.evidence.find((doc) => doc.document_type === type && doc.storage_path);
  if (!document?.storage_path) return NextResponse.json({ error: "No original uploaded." }, { status: 404 });

  const buffer = await fs.readFile(document.storage_path);
  const filename = document.original_name ?? type;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": document.mime_type ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
