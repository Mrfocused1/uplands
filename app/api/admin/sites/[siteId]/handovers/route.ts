import { NextResponse } from "next/server";

import { requireAdmin, UnauthorizedError } from "@/lib/auth/admin";
import {
  createHandover,
  isHandoverDatabaseSetupError,
  listHandoversBySite,
  updateHandover,
  type HandoverShift,
  type HandoverStatus,
  type SiteHandoverRow,
  type UpsertHandoverInput,
} from "@/lib/db/handovers";

export const runtime = "nodejs";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function shift(value: unknown): HandoverShift {
  return text(value) === "NIGHT" ? "NIGHT" : "DAY";
}

function status(value: unknown): HandoverStatus {
  const clean = text(value);
  if (clean === "SUBMITTED" || clean === "ACKNOWLEDGED" || clean === "ARCHIVED") return clean;
  return "DRAFT";
}

function dateValue(value: unknown) {
  const clean = text(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(clean) ? clean : new Date().toISOString().slice(0, 10);
}

function serialize(row: SiteHandoverRow) {
  return {
    id: row.id,
    siteId: row.site_id,
    projectId: row.project_id,
    handoverDate: row.handover_date,
    shift: row.shift,
    status: row.status,
    managerName: row.manager_name,
    summary: row.summary,
    workCompleted: row.work_completed,
    contractorsPresent: row.contractors_present,
    permitsSummary: row.permits_summary,
    issues: row.issues,
    deliveries: row.deliveries,
    outstandingActions: row.outstanding_actions,
    nextShiftNotes: row.next_shift_notes,
    submittedAt: row.submitted_at,
    submittedBy: row.submitted_by,
    acknowledgedAt: row.acknowledged_at,
    acknowledgedBy: row.acknowledged_by,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function inputFromBody(body: Record<string, unknown>, actor: string): UpsertHandoverInput {
  return {
    projectId: text(body.projectId) || null,
    handoverDate: dateValue(body.handoverDate),
    shift: shift(body.shift),
    status: status(body.status),
    managerName: text(body.managerName) || null,
    summary: text(body.summary) || null,
    workCompleted: text(body.workCompleted) || null,
    contractorsPresent: text(body.contractorsPresent) || null,
    permitsSummary: text(body.permitsSummary) || null,
    issues: text(body.issues) || null,
    deliveries: text(body.deliveries) || null,
    outstandingActions: text(body.outstandingActions) || null,
    nextShiftNotes: text(body.nextShiftNotes) || null,
    actor,
  };
}

async function adminOrUnauthorized() {
  try {
    return await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) return null;
    throw error;
  }
}

export async function GET(_request: Request, context: { params: Promise<{ siteId: string }> }) {
  const admin = await adminOrUnauthorized();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { siteId } = await context.params;
  try {
    const handovers = await listHandoversBySite(siteId);
    return NextResponse.json({ handovers: handovers.map(serialize) });
  } catch (error) {
    if (isHandoverDatabaseSetupError(error)) return NextResponse.json({ error: "Handover database setup required." }, { status: 503 });
    throw error;
  }
}

export async function POST(request: Request, context: { params: Promise<{ siteId: string }> }) {
  const admin = await adminOrUnauthorized();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { siteId } = await context.params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid handover payload." }, { status: 400 });

  try {
    const id = await createHandover(siteId, inputFromBody(body, admin.displayName));
    const handovers = await listHandoversBySite(siteId);
    return NextResponse.json({ id, handovers: handovers.map(serialize) }, { status: 201 });
  } catch (error) {
    if (isHandoverDatabaseSetupError(error)) return NextResponse.json({ error: "Handover database setup required." }, { status: 503 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save handover." }, { status: 400 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ siteId: string }> }) {
  const admin = await adminOrUnauthorized();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { siteId } = await context.params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid handover payload." }, { status: 400 });
  const handoverId = text(body.handoverId);
  if (!handoverId) return NextResponse.json({ error: "handoverId is required." }, { status: 400 });

  try {
    await updateHandover(siteId, handoverId, inputFromBody(body, admin.displayName));
    const handovers = await listHandoversBySite(siteId);
    return NextResponse.json({ ok: true, handovers: handovers.map(serialize) });
  } catch (error) {
    if (isHandoverDatabaseSetupError(error)) return NextResponse.json({ error: "Handover database setup required." }, { status: 503 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update handover." }, { status: 400 });
  }
}
