import { NextResponse } from "next/server";

import { requireAdmin, UnauthorizedError } from "@/lib/auth/admin";
import { createSiteContractor, isContractorDatabaseSetupError, listSiteContractors, updateSiteContractor } from "@/lib/db/contractors";

export const runtime = "nodejs";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

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
    operativeCount: row.operative_count,
    permitCount: row.permit_count,
    ramsCount: row.rams_count,
    inductionCount: row.induction_count,
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

export async function POST(request: Request, context: { params: Promise<{ siteId: string }> }) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw error;
  }

  const { siteId } = await context.params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid contractor payload." }, { status: 400 });
  if (!text(body.name)) return NextResponse.json({ error: "Contractor name is required." }, { status: 400 });

  try {
    const contractor = await createSiteContractor({
      siteId,
      projectId: text(body.projectId) || null,
      name: text(body.name),
      trade: text(body.trade) || null,
      siteStatus: text(body.siteStatus) || "ACTIVE",
      primaryContactName: text(body.primaryContactName) || null,
      primaryContactEmail: text(body.primaryContactEmail) || null,
      primaryContactPhone: text(body.primaryContactPhone) || null,
      actor: admin.displayName,
    });
    return NextResponse.json(contractor, { status: 201 });
  } catch (error) {
    if (isContractorDatabaseSetupError(error)) return NextResponse.json({ error: "Contractor database setup required." }, { status: 503 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create contractor." }, { status: 400 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ siteId: string }> }) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw error;
  }

  const { siteId } = await context.params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid contractor payload." }, { status: 400 });
  if (!text(body.contractorId)) return NextResponse.json({ error: "contractorId is required." }, { status: 400 });
  if (!text(body.name)) return NextResponse.json({ error: "Contractor name is required." }, { status: 400 });

  try {
    const contractor = await updateSiteContractor({
      siteId,
      projectId: text(body.projectId) || null,
      contractorId: text(body.contractorId),
      name: text(body.name),
      trade: text(body.trade) || null,
      siteStatus: text(body.siteStatus) || "ACTIVE",
      primaryContactName: text(body.primaryContactName) || null,
      primaryContactEmail: text(body.primaryContactEmail) || null,
      primaryContactPhone: text(body.primaryContactPhone) || null,
      actor: admin.displayName,
    });
    return NextResponse.json(contractor);
  } catch (error) {
    if (isContractorDatabaseSetupError(error)) return NextResponse.json({ error: "Contractor database setup required." }, { status: 503 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update contractor." }, { status: 400 });
  }
}
