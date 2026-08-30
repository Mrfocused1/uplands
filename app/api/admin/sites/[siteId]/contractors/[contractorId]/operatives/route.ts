import { NextResponse } from "next/server";

import { requireAdmin, UnauthorizedError } from "@/lib/auth/admin";
import { createSiteOperative, isOperativeDatabaseSetupError, listSiteOperatives, updateSiteOperative } from "@/lib/db/operatives";

export const runtime = "nodejs";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function serializeOperative(row: Awaited<ReturnType<typeof listSiteOperatives>>[number]) {
  return {
    siteOperativeId: row.site_operative_id,
    siteId: row.site_id,
    projectId: row.project_id,
    contractorId: row.contractor_id,
    contractorName: row.contractor_name,
    operativeId: row.operative_id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    cscsCardNumber: row.cscs_card_number,
    cscsExpiry: row.cscs_expiry,
    operativeStatus: row.operative_status,
    siteStatus: row.site_status,
    inductionStatus: row.induction_status,
    inductionSubmissionId: row.induction_submission_id,
    inductionReference: row.induction_reference,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET(_request: Request, context: { params: Promise<{ siteId: string; contractorId: string }> }) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw error;
  }

  const { siteId, contractorId } = await context.params;

  try {
    const operatives = await listSiteOperatives(siteId, contractorId);
    return NextResponse.json({ operatives: operatives.map(serializeOperative) });
  } catch (error) {
    if (isOperativeDatabaseSetupError(error)) return NextResponse.json({ error: "Operative database setup required." }, { status: 503 });
    throw error;
  }
}

export async function POST(request: Request, context: { params: Promise<{ siteId: string; contractorId: string }> }) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw error;
  }

  const { siteId, contractorId } = await context.params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid operative payload." }, { status: 400 });
  if (!text(body.fullName)) return NextResponse.json({ error: "Operative name is required." }, { status: 400 });

  try {
    const operative = await createSiteOperative({
      siteId,
      contractorId,
      projectId: text(body.projectId) || null,
      fullName: text(body.fullName),
      email: text(body.email) || null,
      phone: text(body.phone) || null,
      role: text(body.role) || null,
      cscsCardNumber: text(body.cscsCardNumber) || null,
      cscsExpiry: text(body.cscsExpiry) || null,
      inductionStatus: text(body.inductionStatus) || "NOT_STARTED",
      siteStatus: text(body.siteStatus) || "ACTIVE",
      actor: admin.displayName,
    });
    return NextResponse.json(operative, { status: 201 });
  } catch (error) {
    if (isOperativeDatabaseSetupError(error)) return NextResponse.json({ error: "Operative database setup required." }, { status: 503 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create operative." }, { status: 400 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ siteId: string; contractorId: string }> }) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw error;
  }

  const { siteId, contractorId } = await context.params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid operative payload." }, { status: 400 });
  if (!text(body.operativeId)) return NextResponse.json({ error: "operativeId is required." }, { status: 400 });
  if (!text(body.fullName)) return NextResponse.json({ error: "Operative name is required." }, { status: 400 });

  try {
    const operative = await updateSiteOperative({
      siteId,
      contractorId,
      projectId: text(body.projectId) || null,
      operativeId: text(body.operativeId),
      fullName: text(body.fullName),
      email: text(body.email) || null,
      phone: text(body.phone) || null,
      role: text(body.role) || null,
      cscsCardNumber: text(body.cscsCardNumber) || null,
      cscsExpiry: text(body.cscsExpiry) || null,
      inductionStatus: text(body.inductionStatus) || "NOT_STARTED",
      siteStatus: text(body.siteStatus) || "ACTIVE",
      actor: admin.displayName,
    });
    return NextResponse.json(operative);
  } catch (error) {
    if (isOperativeDatabaseSetupError(error)) return NextResponse.json({ error: "Operative database setup required." }, { status: 503 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update operative." }, { status: 400 });
  }
}
