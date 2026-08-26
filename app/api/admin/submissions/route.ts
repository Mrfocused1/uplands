import { NextResponse } from "next/server";
import { requireAdmin, UnauthorizedError } from "@/lib/auth/admin";
import { listSubmissions } from "@/lib/db/submissions";
import type { UHSF1601PrintData } from "@/types/UHSF1601PrintData";

export const runtime = "nodejs";

const EVIDENCE_TOTAL = 3;

function searchTextFrom(printData: string) {
  const data = JSON.parse(printData) as UHSF1601PrintData;
  return Object.values(data)
    .filter((value) => typeof value === "string" || typeof value === "boolean")
    .join(" ");
}

export async function GET() {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw error;
  }

  const rows = listSubmissions();
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
    searchText: searchTextFrom(row.print_data),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    evidenceCount: row.evidence_count,
    evidenceTotal: EVIDENCE_TOTAL,
  }));

  return NextResponse.json({ submissions });
}
