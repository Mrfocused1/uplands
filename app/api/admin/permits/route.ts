import { NextResponse } from "next/server";

import { requireAdmin, UnauthorizedError } from "@/lib/auth/admin";
import { createPermit, isPermitDatabaseSetupError, listPermitsBySite } from "@/lib/db/permits";

export const runtime = "nodejs";

function value(body: Record<string, unknown>, key: string) {
  const item = body[key];
  return typeof item === "string" ? item.trim() : "";
}

function serializePermit(row: Awaited<ReturnType<typeof listPermitsBySite>>[number]) {
  return {
    id: row.id,
    permitNumber: row.permit_number,
    templateId: row.template_id,
    templateCode: row.template_code,
    templateTitle: row.template_title,
    siteId: row.site_id,
    projectId: row.project_id,
    projectName: row.project_name,
    contractorId: row.contractor_id,
    contractor: row.contractor,
    locationOfWork: row.location_of_work,
    descriptionOfWork: row.description_of_work,
    validFromDate: row.valid_from_date,
    validToDate: row.valid_to_date,
    validFromTime: row.valid_from_time,
    validToTime: row.valid_to_time,
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw error;
  }

  const siteId = new URL(request.url).searchParams.get("siteId");
  if (!siteId) return NextResponse.json({ error: "siteId is required." }, { status: 400 });

  try {
    const permits = await listPermitsBySite(siteId);
    return NextResponse.json({ permits: permits.map(serializePermit) });
  } catch (error) {
    if (isPermitDatabaseSetupError(error)) return NextResponse.json({ error: "Permit database setup required." }, { status: 503 });
    throw error;
  }
}

export async function POST(request: Request) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw error;
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid permit payload." }, { status: 400 });

  const required = ["siteId", "templateId", "locationOfWork", "descriptionOfWork", "validFromDate", "validToDate", "validFromTime", "validToTime"];
  for (const key of required) {
    if (!value(body, key)) return NextResponse.json({ error: `${key} is required.` }, { status: 400 });
  }
  if (!value(body, "contractorId") && !value(body, "contractor")) return NextResponse.json({ error: "contractor is required." }, { status: 400 });

  let id;
  try {
    id = await createPermit({
      siteId: value(body, "siteId"),
      projectId: value(body, "projectId") || null,
      templateId: value(body, "templateId"),
      contractorId: value(body, "contractorId") || null,
      contractor: value(body, "contractor"),
      locationOfWork: value(body, "locationOfWork"),
      descriptionOfWork: value(body, "descriptionOfWork"),
      validFromDate: value(body, "validFromDate"),
      validToDate: value(body, "validToDate"),
      validFromTime: value(body, "validFromTime"),
      validToTime: value(body, "validToTime"),
      createdBy: admin.displayName,
    });
  } catch (error) {
    if (isPermitDatabaseSetupError(error)) return NextResponse.json({ error: "Permit database setup required." }, { status: 503 });
    throw error;
  }

  return NextResponse.json({ id }, { status: 201 });
}
