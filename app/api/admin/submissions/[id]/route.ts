import { NextResponse } from "next/server";
import { requireAdmin, UnauthorizedError } from "@/lib/auth/admin";
import { deleteSubmission, getSubmission, setPinned, setPrintReviewStatus, transformFromRow } from "@/lib/db/submissions";
import type { UHSF1601PrintData } from "@/types/UHSF1601PrintData";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
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

  return NextResponse.json({
    submission: {
      id: row.id,
      reference: row.reference,
      fullName: row.full_name,
      companyName: row.company_name,
      siteName: row.site_name,
      declarationDate: row.declaration_date,
      printReviewStatus: row.print_review_status,
      pinned: Boolean(row.pinned),
      isSample: Boolean(row.is_sample),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      printData: JSON.parse(row.print_data) as UHSF1601PrintData,
      evidence: evidence.map((doc) => ({
        id: doc.id,
        type: doc.document_type,
        originalName: doc.original_name,
        mimeType: doc.mime_type,
        sourceWidth: doc.source_width,
        sourceHeight: doc.source_height,
        hasOriginal: Boolean(doc.storage_path),
        printTransform: transformFromRow(doc),
      })),
    },
  });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw error;
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const status = body?.printReviewStatus;
  const pinned = body?.pinned;

  if (
    status !== undefined &&
    status !== "not_reviewed" &&
    status !== "ready"
  ) {
    return NextResponse.json({ error: "Invalid print review status." }, { status: 400 });
  }

  if (pinned !== undefined && typeof pinned !== "boolean") {
    return NextResponse.json({ error: "Invalid pinned value." }, { status: 400 });
  }

  if (status !== undefined) setPrintReviewStatus(id, status);
  if (pinned !== undefined) setPinned(id, pinned);

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw error;
  }

  const { id } = await context.params;
  const deleted = deleteSubmission(id);
  if (!deleted) return NextResponse.json({ error: "Submission not found." }, { status: 404 });

  return NextResponse.json({ ok: true });
}
