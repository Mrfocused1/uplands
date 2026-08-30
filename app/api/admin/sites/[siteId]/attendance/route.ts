import { NextResponse } from "next/server";

import { requireAdmin, UnauthorizedError } from "@/lib/auth/admin";
import {
  isAttendanceDatabaseSetupError,
  listAttendanceBySite,
  listAttendanceOperatives,
  signInAttendance,
  signOutAttendance,
} from "@/lib/db/attendance";

export const runtime = "nodejs";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function serializeRecord(row: Awaited<ReturnType<typeof listAttendanceBySite>>[number]) {
  return {
    id: row.id,
    siteId: row.site_id,
    projectId: row.project_id,
    contractorId: row.contractor_id,
    contractorName: row.contractor_name,
    operativeId: row.operative_id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    inductionStatus: row.induction_status,
    inductionReference: row.induction_reference,
    shift: row.shift,
    status: row.status,
    signedInAt: row.signed_in_at,
    signedInBy: row.signed_in_by,
    signedOutAt: row.signed_out_at,
    signedOutBy: row.signed_out_by,
    notes: row.notes,
  };
}

function serializeOperative(row: Awaited<ReturnType<typeof listAttendanceOperatives>>[number]) {
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
    siteStatus: row.site_status,
    inductionStatus: row.induction_status,
    inductionReference: row.induction_reference,
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
    const [records, operatives] = await Promise.all([listAttendanceBySite(siteId), listAttendanceOperatives(siteId)]);
    return NextResponse.json({ records: records.map(serializeRecord), operatives: operatives.map(serializeOperative) });
  } catch (error) {
    if (isAttendanceDatabaseSetupError(error)) return NextResponse.json({ error: "Attendance database setup required." }, { status: 503 });
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
  if (!body) return NextResponse.json({ error: "Invalid attendance payload." }, { status: 400 });
  if (!text(body.contractorId)) return NextResponse.json({ error: "contractorId is required." }, { status: 400 });
  if (!text(body.operativeId)) return NextResponse.json({ error: "operativeId is required." }, { status: 400 });

  try {
    const id = await signInAttendance({
      siteId,
      projectId: text(body.projectId) || null,
      contractorId: text(body.contractorId),
      operativeId: text(body.operativeId),
      shift: text(body.shift) === "NIGHT" ? "NIGHT" : "DAY",
      notes: text(body.notes) || null,
      actor: admin.displayName,
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    if (isAttendanceDatabaseSetupError(error)) return NextResponse.json({ error: "Attendance database setup required." }, { status: 503 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to sign operative in." }, { status: 400 });
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
  if (!body) return NextResponse.json({ error: "Invalid attendance payload." }, { status: 400 });
  if (!text(body.attendanceId)) return NextResponse.json({ error: "attendanceId is required." }, { status: 400 });

  try {
    await signOutAttendance({ siteId, attendanceId: text(body.attendanceId), actor: admin.displayName });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isAttendanceDatabaseSetupError(error)) return NextResponse.json({ error: "Attendance database setup required." }, { status: 503 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to sign operative out." }, { status: 400 });
  }
}
