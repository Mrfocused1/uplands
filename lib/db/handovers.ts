import { randomUUID } from "node:crypto";

import { getDb } from "@/lib/db";
import { recordSiteActivity, type SiteActivityEventType } from "@/lib/db/activity";
import { isAttendanceDatabaseSetupError, listAttendanceBySite } from "@/lib/db/attendance";
import { isPermitDatabaseSetupError, listPriorityPermitsBySite } from "@/lib/db/permits";
import { env, isSupabaseAdminConfigured } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const MISSING_HANDOVER_SCHEMA_CODES = new Set(["42P01", "42703", "PGRST204", "PGRST205"]);

export class HandoverDatabaseSetupError extends Error {
  constructor(action: string, message: string) {
    super(`${action}: ${message}`);
    this.name = "HandoverDatabaseSetupError";
  }
}

export function isHandoverDatabaseSetupError(error: unknown): error is HandoverDatabaseSetupError {
  return error instanceof HandoverDatabaseSetupError;
}

export type HandoverShift = "DAY" | "NIGHT";
export type HandoverStatus = "DRAFT" | "SUBMITTED" | "ACKNOWLEDGED" | "ARCHIVED";

export type SiteHandoverRow = {
  id: string;
  site_id: string;
  project_id: string | null;
  handover_date: string;
  shift: HandoverShift;
  status: HandoverStatus;
  manager_name: string | null;
  summary: string | null;
  work_completed: string | null;
  contractors_present: string | null;
  permits_summary: string | null;
  issues: string | null;
  deliveries: string | null;
  outstanding_actions: string | null;
  next_shift_notes: string | null;
  submitted_at: string | null;
  submitted_by: string | null;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type UpsertHandoverInput = {
  projectId?: string | null;
  handoverDate: string;
  shift: HandoverShift;
  status: HandoverStatus;
  managerName?: string | null;
  summary?: string | null;
  workCompleted?: string | null;
  contractorsPresent?: string | null;
  permitsSummary?: string | null;
  issues?: string | null;
  deliveries?: string | null;
  outstandingActions?: string | null;
  nextShiftNotes?: string | null;
  actor?: string | null;
};

export type HandoverDashboardSummary = {
  latest: {
    id: string;
    handoverDate: string;
    shift: HandoverShift;
    status: HandoverStatus;
    managerName: string | null;
    updatedAt: string;
    href: string;
  } | null;
  unacknowledged: number;
  outstandingActions: number;
};

export type HandoverPrefill = {
  summary: string;
  contractorsPresent: string;
  permitsSummary: string;
  outstandingActions: string;
};

function shouldUseSupabaseHandoverDb() {
  const provider = env(
    "HANDOVER_DATABASE_PROVIDER",
    env("UPLANDS_DATABASE_PROVIDER", env("ATTENDANCE_DATABASE_PROVIDER", env("SUBMISSIONS_DATABASE_PROVIDER", process.env.VERCEL && isSupabaseAdminConfigured() ? "supabase" : "sqlite"))),
  );
  if (provider === "supabase" && !isSupabaseAdminConfigured()) {
    throw new Error("HANDOVER_DATABASE_PROVIDER is set to supabase, but Supabase admin environment variables are missing.");
  }
  return provider === "supabase";
}

function assertNoError(error: { code?: string; message: string } | null, action: string) {
  if (!error) return;
  if (error.code && MISSING_HANDOVER_SCHEMA_CODES.has(error.code)) {
    throw new HandoverDatabaseSetupError(action, "Handover database tables are not installed in Supabase. Apply the handover foundation migration.");
  }
  throw new Error(`${action}: ${error.message}`);
}

function cleanText(value: string | null | undefined) {
  return value?.trim() || null;
}

function normaliseShift(value: string): HandoverShift {
  return value === "NIGHT" ? "NIGHT" : "DAY";
}

function normaliseStatus(value: string): HandoverStatus {
  if (value === "SUBMITTED" || value === "ACKNOWLEDGED" || value === "ARCHIVED") return value;
  return "DRAFT";
}

function payload(input: UpsertHandoverInput, now: string) {
  const status = normaliseStatus(input.status);
  return {
    project_id: input.projectId ?? null,
    handover_date: input.handoverDate,
    shift: normaliseShift(input.shift),
    status,
    manager_name: cleanText(input.managerName),
    summary: cleanText(input.summary),
    work_completed: cleanText(input.workCompleted),
    contractors_present: cleanText(input.contractorsPresent),
    permits_summary: cleanText(input.permitsSummary),
    issues: cleanText(input.issues),
    deliveries: cleanText(input.deliveries),
    outstanding_actions: cleanText(input.outstandingActions),
    next_shift_notes: cleanText(input.nextShiftNotes),
    submitted_at: status === "SUBMITTED" || status === "ACKNOWLEDGED" ? now : null,
    submitted_by: status === "SUBMITTED" || status === "ACKNOWLEDGED" ? input.actor ?? null : null,
    acknowledged_at: status === "ACKNOWLEDGED" ? now : null,
    acknowledged_by: status === "ACKNOWLEDGED" ? input.actor ?? null : null,
    updated_at: now,
  };
}

export async function listHandoversBySite(siteId: string, limit = 50): Promise<SiteHandoverRow[]> {
  if (shouldUseSupabaseHandoverDb()) {
    const { data, error } = await createSupabaseAdminClient()
      .from("site_handovers")
      .select("*")
      .eq("site_id", siteId)
      .order("handover_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);
    assertNoError(error, "Unable to list handovers");
    return (data ?? []) as SiteHandoverRow[];
  }

  return getDb()
    .prepare(
      `SELECT *
       FROM site_handovers
       WHERE site_id = ?
       ORDER BY handover_date DESC, created_at DESC
       LIMIT ?`,
    )
    .all(siteId, limit) as SiteHandoverRow[];
}

export async function getHandoverDashboardSummary(siteId: string): Promise<HandoverDashboardSummary> {
  const rows = await listHandoversBySite(siteId, 20);
  const latest = rows[0] ?? null;
  return {
    latest: latest
      ? {
          id: latest.id,
          handoverDate: latest.handover_date,
          shift: latest.shift,
          status: latest.status,
          managerName: latest.manager_name,
          updatedAt: latest.updated_at,
          href: `/admin/sites/${encodeURIComponent(siteId)}/handover`,
        }
      : null,
    unacknowledged: rows.filter((row) => row.status === "SUBMITTED").length,
    outstandingActions: rows.filter((row) => row.status !== "ACKNOWLEDGED" && Boolean(row.outstanding_actions?.trim())).length,
  };
}

export async function buildHandoverPrefill(siteId: string): Promise<HandoverPrefill> {
  const [attendance, permits] = await Promise.all([
    listAttendanceBySite(siteId, 120).catch((error) => {
      if (isAttendanceDatabaseSetupError(error)) return [];
      throw error;
    }),
    listPriorityPermitsBySite(siteId, 12).catch((error) => {
      if (isPermitDatabaseSetupError(error)) return [];
      throw error;
    }),
  ]);
  const signedIn = attendance.filter((record) => record.status === "SIGNED_IN");
  const contractors = Array.from(new Set(signedIn.map((record) => record.contractor_name ?? record.contractor_id).filter(Boolean))).sort();
  const activePermits = permits.filter((permit) => permit.status === "ACTIVE" || permit.status === "AUTHORISED" || permit.status === "WORK_COMPLETED");

  return {
    summary: `${signedIn.length} people currently signed in. ${activePermits.length} open permits in the permit watch list.`,
    contractorsPresent: contractors.join("\n"),
    permitsSummary: activePermits
      .map((permit) => `${permit.permit_number} - ${permit.template_title ?? permit.template_code ?? "Permit"} - ${permit.contractor} - ${permit.status} until ${permit.valid_to_time}`)
      .join("\n"),
    outstandingActions: activePermits
      .filter((permit) => permit.status === "WORK_COMPLETED" || !permit.rams_document_id)
      .map((permit) => `${permit.permit_number} - ${permit.status === "WORK_COMPLETED" ? "awaiting final closure" : "missing linked RAMS"}`)
      .join("\n"),
  };
}

export async function createHandover(siteId: string, input: UpsertHandoverInput) {
  const id = randomUUID();
  const now = new Date().toISOString();
  const data = payload(input, now);

  if (shouldUseSupabaseHandoverDb()) {
    const { error } = await createSupabaseAdminClient().from("site_handovers").insert({
      id,
      site_id: siteId,
      created_by: input.actor ?? null,
      created_at: now,
      ...data,
    });
    assertNoError(error, "Unable to create handover");
  } else {
    getDb()
      .prepare(
        `INSERT INTO site_handovers
         (id, site_id, project_id, handover_date, shift, status, manager_name, summary, work_completed, contractors_present,
          permits_summary, issues, deliveries, outstanding_actions, next_shift_notes, submitted_at, submitted_by,
          acknowledged_at, acknowledged_by, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        siteId,
        data.project_id,
        data.handover_date,
        data.shift,
        data.status,
        data.manager_name,
        data.summary,
        data.work_completed,
        data.contractors_present,
        data.permits_summary,
        data.issues,
        data.deliveries,
        data.outstanding_actions,
        data.next_shift_notes,
        data.submitted_at,
        data.submitted_by,
        data.acknowledged_at,
        data.acknowledged_by,
        input.actor ?? null,
        now,
        now,
      );
  }

  await recordHandoverActivity(siteId, input.projectId ?? null, id, data.status === "DRAFT" ? "handover_created" : "handover_submitted", data.status === "DRAFT" ? "Handover draft saved" : "Handover submitted", input);
  return id;
}

export async function updateHandover(siteId: string, handoverId: string, input: UpsertHandoverInput) {
  const existing = await getHandover(siteId, handoverId);
  if (!existing) throw new Error("Handover record not found.");

  const now = new Date().toISOString();
  const data = payload(input, now);
  if ((data.status === "SUBMITTED" || data.status === "ACKNOWLEDGED") && existing.submitted_at) {
    data.submitted_at = existing.submitted_at;
    data.submitted_by = existing.submitted_by;
  }
  if (data.status === "ACKNOWLEDGED" && existing.acknowledged_at) {
    data.acknowledged_at = existing.acknowledged_at;
    data.acknowledged_by = existing.acknowledged_by;
  }

  if (shouldUseSupabaseHandoverDb()) {
    const { error } = await createSupabaseAdminClient().from("site_handovers").update(data).eq("site_id", siteId).eq("id", handoverId);
    assertNoError(error, "Unable to update handover");
  } else {
    getDb()
      .prepare(
        `UPDATE site_handovers
         SET project_id = ?, handover_date = ?, shift = ?, status = ?, manager_name = ?, summary = ?, work_completed = ?,
             contractors_present = ?, permits_summary = ?, issues = ?, deliveries = ?, outstanding_actions = ?,
             next_shift_notes = ?, submitted_at = ?, submitted_by = ?, acknowledged_at = ?, acknowledged_by = ?, updated_at = ?
         WHERE site_id = ? AND id = ?`,
      )
      .run(
        data.project_id,
        data.handover_date,
        data.shift,
        data.status,
        data.manager_name,
        data.summary,
        data.work_completed,
        data.contractors_present,
        data.permits_summary,
        data.issues,
        data.deliveries,
        data.outstanding_actions,
        data.next_shift_notes,
        data.submitted_at ?? existing.submitted_at,
        data.submitted_by ?? existing.submitted_by,
        data.acknowledged_at ?? existing.acknowledged_at,
        data.acknowledged_by ?? existing.acknowledged_by,
        now,
        siteId,
        handoverId,
      );
  }

  const event = eventForStatusChange(existing.status, data.status);
  await recordHandoverActivity(siteId, input.projectId ?? existing.project_id, handoverId, event.eventType, event.title, input);
}

async function getHandover(siteId: string, handoverId: string) {
  if (shouldUseSupabaseHandoverDb()) {
    const { data, error } = await createSupabaseAdminClient().from("site_handovers").select("*").eq("site_id", siteId).eq("id", handoverId).maybeSingle();
    assertNoError(error, "Unable to get handover");
    return (data as SiteHandoverRow | null) ?? null;
  }

  return (
    (getDb().prepare("SELECT * FROM site_handovers WHERE site_id = ? AND id = ?").get(siteId, handoverId) as SiteHandoverRow | undefined) ?? null
  );
}

function eventForStatusChange(previous: HandoverStatus, next: HandoverStatus): { eventType: SiteActivityEventType; title: string } {
  if (previous !== next && next === "SUBMITTED") return { eventType: "handover_submitted", title: "Handover submitted" };
  if (previous !== next && next === "ACKNOWLEDGED") return { eventType: "handover_acknowledged", title: "Handover acknowledged" };
  return { eventType: "handover_updated", title: "Handover updated" };
}

async function recordHandoverActivity(
  siteId: string,
  projectId: string | null,
  handoverId: string,
  eventType: SiteActivityEventType,
  title: string,
  input: UpsertHandoverInput,
) {
  await recordSiteActivity({
    siteId,
    projectId,
    entityType: "handover",
    entityId: handoverId,
    eventType,
    title,
    detail: `${normaliseShift(input.shift)} shift · ${input.handoverDate}`,
    actor: input.actor ?? null,
    metadata: { handoverId, shift: normaliseShift(input.shift), status: normaliseStatus(input.status) },
  });
}
