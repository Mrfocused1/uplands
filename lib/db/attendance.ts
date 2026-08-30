import { randomUUID } from "node:crypto";

import { getDb } from "@/lib/db";
import { recordSiteActivity } from "@/lib/db/activity";
import { env, isSupabaseAdminConfigured } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const MISSING_ATTENDANCE_SCHEMA_CODES = new Set(["42P01", "42703", "PGRST204", "PGRST205"]);

export class AttendanceDatabaseSetupError extends Error {
  constructor(action: string, message: string) {
    super(`${action}: ${message}`);
    this.name = "AttendanceDatabaseSetupError";
  }
}

export function isAttendanceDatabaseSetupError(error: unknown): error is AttendanceDatabaseSetupError {
  return error instanceof AttendanceDatabaseSetupError;
}

export type AttendanceStatus = "SIGNED_IN" | "SIGNED_OUT";
export type AttendanceShift = "DAY" | "NIGHT";

export type AttendanceRecordRow = {
  id: string;
  site_id: string;
  project_id: string | null;
  contractor_id: string;
  operative_id: string;
  induction_status: string;
  shift: AttendanceShift;
  status: AttendanceStatus;
  signed_in_at: string;
  signed_in_by: string | null;
  signed_out_at: string | null;
  signed_out_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  contractor_name?: string;
  full_name?: string;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  site_operative_id?: string | null;
  operative_site_status?: string | null;
  induction_submission_id?: string | null;
  induction_reference?: string | null;
};

export type AttendanceOperativeOptionRow = {
  site_operative_id: string;
  site_id: string;
  project_id: string | null;
  contractor_id: string;
  contractor_name: string;
  operative_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  site_status: string;
  induction_status: string;
  induction_reference: string | null;
};

export type SignInAttendanceInput = {
  siteId: string;
  projectId?: string | null;
  contractorId: string;
  operativeId: string;
  shift?: AttendanceShift | null;
  notes?: string | null;
  actor?: string | null;
};

export type SignOutAttendanceInput = {
  siteId: string;
  attendanceId: string;
  actor?: string | null;
};

function shouldUseSupabaseAttendanceDb() {
  const provider = env(
    "ATTENDANCE_DATABASE_PROVIDER",
    env(
      "OPERATIVES_DATABASE_PROVIDER",
      env(
        "CONTRACTORS_DATABASE_PROVIDER",
        env("UPLANDS_DATABASE_PROVIDER", env("SUBMISSIONS_DATABASE_PROVIDER", process.env.VERCEL && isSupabaseAdminConfigured() ? "supabase" : "sqlite")),
      ),
    ),
  );
  if (provider === "supabase" && !isSupabaseAdminConfigured()) {
    throw new Error("ATTENDANCE_DATABASE_PROVIDER is set to supabase, but Supabase admin environment variables are missing.");
  }
  return provider === "supabase";
}

function assertNoError(error: { code?: string; message: string } | null, action: string) {
  if (!error) return;
  if (error.code && MISSING_ATTENDANCE_SCHEMA_CODES.has(error.code)) {
    throw new AttendanceDatabaseSetupError(action, "Attendance database tables are not installed in Supabase. Apply the attendance foundation migration.");
  }
  throw new Error(`${action}: ${error.message}`);
}

function normaliseShift(value: string | null | undefined): AttendanceShift {
  return value === "NIGHT" ? "NIGHT" : "DAY";
}

export async function listAttendanceOperatives(siteId: string): Promise<AttendanceOperativeOptionRow[]> {
  if (shouldUseSupabaseAttendanceDb()) {
    const { data, error } = await createSupabaseAdminClient()
      .from("site_operatives_with_details")
      .select("*")
      .eq("site_id", siteId)
      .eq("site_status", "ACTIVE")
      .order("contractor_name")
      .order("full_name");
    assertNoError(error, "Unable to list attendance operatives");
    return (data ?? []) as AttendanceOperativeOptionRow[];
  }

  return getDb()
    .prepare(
      `SELECT
         so.id AS site_operative_id,
         so.site_id,
         so.project_id,
         so.contractor_id,
         c.name AS contractor_name,
         o.id AS operative_id,
         o.full_name,
         o.email,
         o.phone,
         o.role,
         so.status AS site_status,
         so.induction_status,
         s.reference AS induction_reference
       FROM site_operatives so
       JOIN operatives o ON o.id = so.operative_id
       JOIN contractors c ON c.id = so.contractor_id
       LEFT JOIN submissions s ON s.id = so.induction_submission_id
       WHERE so.site_id = ? AND so.status = 'ACTIVE'
       ORDER BY c.name COLLATE NOCASE, o.full_name COLLATE NOCASE`,
    )
    .all(siteId) as AttendanceOperativeOptionRow[];
}

export async function listAttendanceBySite(siteId: string, limit = 80): Promise<AttendanceRecordRow[]> {
  if (shouldUseSupabaseAttendanceDb()) {
    const { data, error } = await createSupabaseAdminClient()
      .from("attendance_records_with_details")
      .select("*")
      .eq("site_id", siteId)
      .order("signed_in_at", { ascending: false })
      .limit(limit);
    assertNoError(error, "Unable to list attendance");
    return (data ?? []) as AttendanceRecordRow[];
  }

  return getDb()
    .prepare(
      `SELECT
         ar.*,
         c.name AS contractor_name,
         o.full_name,
         o.email,
         o.phone,
         o.role,
         so.id AS site_operative_id,
         so.status AS operative_site_status,
         so.induction_submission_id,
         s.reference AS induction_reference
       FROM attendance_records ar
       JOIN contractors c ON c.id = ar.contractor_id
       JOIN operatives o ON o.id = ar.operative_id
       LEFT JOIN site_operatives so ON so.site_id = ar.site_id AND so.operative_id = ar.operative_id
       LEFT JOIN submissions s ON s.id = so.induction_submission_id
       WHERE ar.site_id = ?
       ORDER BY ar.signed_in_at DESC
       LIMIT ?`,
    )
    .all(siteId, limit) as AttendanceRecordRow[];
}

export async function listAttendanceByContractor(siteId: string, contractorId: string, limit = 80): Promise<AttendanceRecordRow[]> {
  if (shouldUseSupabaseAttendanceDb()) {
    const { data, error } = await createSupabaseAdminClient()
      .from("attendance_records_with_details")
      .select("*")
      .eq("site_id", siteId)
      .eq("contractor_id", contractorId)
      .order("signed_in_at", { ascending: false })
      .limit(limit);
    assertNoError(error, "Unable to list contractor attendance");
    return (data ?? []) as AttendanceRecordRow[];
  }

  return getDb()
    .prepare(
      `SELECT
         ar.*,
         c.name AS contractor_name,
         o.full_name,
         o.email,
         o.phone,
         o.role,
         so.id AS site_operative_id,
         so.status AS operative_site_status,
         so.induction_submission_id,
         s.reference AS induction_reference
       FROM attendance_records ar
       JOIN contractors c ON c.id = ar.contractor_id
       JOIN operatives o ON o.id = ar.operative_id
       LEFT JOIN site_operatives so ON so.site_id = ar.site_id AND so.operative_id = ar.operative_id
       LEFT JOIN submissions s ON s.id = so.induction_submission_id
       WHERE ar.site_id = ? AND ar.contractor_id = ?
       ORDER BY ar.signed_in_at DESC
       LIMIT ?`,
    )
    .all(siteId, contractorId, limit) as AttendanceRecordRow[];
}

export async function countCurrentAttendance(siteId: string) {
  if (shouldUseSupabaseAttendanceDb()) {
    const { count, error } = await createSupabaseAdminClient()
      .from("attendance_records")
      .select("id", { count: "exact", head: true })
      .eq("site_id", siteId)
      .eq("status", "SIGNED_IN");
    assertNoError(error, "Unable to count current attendance");
    return count ?? 0;
  }

  const row = getDb().prepare("SELECT COUNT(*) AS count FROM attendance_records WHERE site_id = ? AND status = 'SIGNED_IN'").get(siteId) as { count: number };
  return row.count;
}

export async function signInAttendance(input: SignInAttendanceInput) {
  const operative = await getAttendanceOperative(input.siteId, input.contractorId, input.operativeId);
  if (!operative) throw new Error("Operative is not active on this site.");

  const existing = await getOpenAttendance(input.siteId, input.operativeId);
  if (existing) throw new Error(`${operative.full_name} is already signed in.`);

  const id = randomUUID();
  const now = new Date().toISOString();
  const shift = normaliseShift(input.shift);

  if (shouldUseSupabaseAttendanceDb()) {
    const { error } = await createSupabaseAdminClient().from("attendance_records").insert({
      id,
      site_id: input.siteId,
      project_id: input.projectId ?? operative.project_id,
      contractor_id: input.contractorId,
      operative_id: input.operativeId,
      induction_status: operative.induction_status,
      shift,
      status: "SIGNED_IN",
      signed_in_at: now,
      signed_in_by: input.actor ?? null,
      notes: input.notes?.trim() || null,
      created_at: now,
      updated_at: now,
    });
    assertNoError(error, "Unable to sign operative in");
  } else {
    getDb()
      .prepare(
        `INSERT INTO attendance_records
         (id, site_id, project_id, contractor_id, operative_id, induction_status, shift, status, signed_in_at, signed_in_by, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'SIGNED_IN', ?, ?, ?, ?, ?)`,
      )
      .run(id, input.siteId, input.projectId ?? operative.project_id, input.contractorId, input.operativeId, operative.induction_status, shift, now, input.actor ?? null, input.notes?.trim() || null, now, now);
  }

  await recordSiteActivity({
    siteId: input.siteId,
    projectId: input.projectId ?? operative.project_id,
    entityType: "attendance",
    entityId: id,
    eventType: "operative_signed_in",
    title: "Operative signed in",
    detail: `${operative.full_name} · ${operative.contractor_name}`,
    actor: input.actor ?? null,
    metadata: { attendanceId: id, contractorId: input.contractorId, operativeId: input.operativeId, shift },
  });

  return id;
}

export async function signOutAttendance(input: SignOutAttendanceInput) {
  const record = await getAttendanceRecord(input.siteId, input.attendanceId);
  if (!record) throw new Error("Attendance record not found.");
  if (record.status !== "SIGNED_IN") return;

  const now = new Date().toISOString();
  if (shouldUseSupabaseAttendanceDb()) {
    const { error } = await createSupabaseAdminClient()
      .from("attendance_records")
      .update({
        status: "SIGNED_OUT",
        signed_out_at: now,
        signed_out_by: input.actor ?? null,
        updated_at: now,
      })
      .eq("id", input.attendanceId)
      .eq("site_id", input.siteId);
    assertNoError(error, "Unable to sign operative out");
  } else {
    getDb()
      .prepare(
        `UPDATE attendance_records
         SET status = 'SIGNED_OUT', signed_out_at = ?, signed_out_by = ?, updated_at = ?
         WHERE id = ? AND site_id = ?`,
      )
      .run(now, input.actor ?? null, now, input.attendanceId, input.siteId);
  }

  await recordSiteActivity({
    siteId: input.siteId,
    projectId: record.project_id,
    entityType: "attendance",
    entityId: input.attendanceId,
    eventType: "operative_signed_out",
    title: "Operative signed out",
    detail: `${record.full_name ?? "Operative"} · ${record.contractor_name ?? "Contractor"}`,
    actor: input.actor ?? null,
    metadata: { attendanceId: input.attendanceId, contractorId: record.contractor_id, operativeId: record.operative_id, shift: record.shift },
  });
}

async function getAttendanceOperative(siteId: string, contractorId: string, operativeId: string) {
  if (shouldUseSupabaseAttendanceDb()) {
    const { data, error } = await createSupabaseAdminClient()
      .from("site_operatives_with_details")
      .select("*")
      .eq("site_id", siteId)
      .eq("contractor_id", contractorId)
      .eq("operative_id", operativeId)
      .eq("site_status", "ACTIVE")
      .maybeSingle();
    assertNoError(error, "Unable to get attendance operative");
    return (data as AttendanceOperativeOptionRow | null) ?? null;
  }

  return (
    (getDb()
      .prepare(
        `SELECT
           so.id AS site_operative_id,
           so.site_id,
           so.project_id,
           so.contractor_id,
           c.name AS contractor_name,
           o.id AS operative_id,
           o.full_name,
           o.email,
           o.phone,
           o.role,
           so.status AS site_status,
           so.induction_status,
           s.reference AS induction_reference
         FROM site_operatives so
         JOIN operatives o ON o.id = so.operative_id
         JOIN contractors c ON c.id = so.contractor_id
         LEFT JOIN submissions s ON s.id = so.induction_submission_id
         WHERE so.site_id = ? AND so.contractor_id = ? AND so.operative_id = ? AND so.status = 'ACTIVE'`,
      )
      .get(siteId, contractorId, operativeId) as AttendanceOperativeOptionRow | undefined) ?? null
  );
}

async function getOpenAttendance(siteId: string, operativeId: string) {
  if (shouldUseSupabaseAttendanceDb()) {
    const { data, error } = await createSupabaseAdminClient()
      .from("attendance_records")
      .select("*")
      .eq("site_id", siteId)
      .eq("operative_id", operativeId)
      .eq("status", "SIGNED_IN")
      .maybeSingle();
    assertNoError(error, "Unable to get open attendance");
    return (data as AttendanceRecordRow | null) ?? null;
  }

  return (
    (getDb()
      .prepare("SELECT * FROM attendance_records WHERE site_id = ? AND operative_id = ? AND status = 'SIGNED_IN' LIMIT 1")
      .get(siteId, operativeId) as AttendanceRecordRow | undefined) ?? null
  );
}

async function getAttendanceRecord(siteId: string, attendanceId: string) {
  const rows = await listAttendanceBySite(siteId, 200);
  return rows.find((row) => row.id === attendanceId) ?? null;
}
