import { NextResponse } from "next/server";
import { requireAdmin, UnauthorizedError } from "@/lib/auth/admin";
import { listSubmissions } from "@/lib/db/submissions";

export const runtime = "nodejs";

const EVIDENCE_TOTAL = 3;

export async function GET() {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw error;
  }

  const rows = await listSubmissions();
  const submissions = rows.map((row) => ({
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
    evidenceCount: row.evidence_count,
    evidenceTotal: EVIDENCE_TOTAL,
  }));

  return NextResponse.json({ submissions });
}
