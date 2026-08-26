import { listSubmissions } from "@/lib/db/submissions";
import { SubmissionsTable } from "@/components/admin/SubmissionsTable";

export const dynamic = "force-dynamic";

export default function SubmissionsPage() {
  const rows = listSubmissions();

  const submissions = rows.map((row) => ({
    id: row.id,
    reference: row.reference,
    fullName: row.full_name,
    companyName: row.company_name,
    siteName: row.site_name,
    declarationDate: row.declaration_date,
    printReviewStatus: row.print_review_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    evidenceCount: row.evidence_count,
    evidenceTotal: 3,
  }));

  return <SubmissionsTable submissions={submissions} />;
}
