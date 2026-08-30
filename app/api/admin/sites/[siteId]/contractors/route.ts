import { NextResponse } from "next/server";

import { requireAdmin, UnauthorizedError } from "@/lib/auth/admin";
import { isContractorDatabaseSetupError, listSiteContractors } from "@/lib/db/contractors";

export const runtime = "nodejs";

function serializeContractor(row: Awaited<ReturnType<typeof listSiteContractors>>[number]) {
  return {
    siteContractorId: row.site_contractor_id,
    siteId: row.site_id,
    projectId: row.project_id,
    contractorId: row.contractor_id,
    name: row.name,
    contractorStatus: row.contractor_status,
    siteStatus: row.site_status,
    trade: row.trade,
    primaryContactName: row.primary_contact_name,
    primaryContactEmail: row.primary_contact_email,
    primaryContactPhone: row.primary_contact_phone,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET(_request: Request, context: { params: Promise<{ siteId: string }> }) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw error;
  }

  const { siteId } = await context.params;

  try {
    const contractors = await listSiteContractors(siteId);
    return NextResponse.json({ contractors: contractors.map(serializeContractor) });
  } catch (error) {
    if (isContractorDatabaseSetupError(error)) return NextResponse.json({ error: "Contractor database setup required." }, { status: 503 });
    throw error;
  }
}
