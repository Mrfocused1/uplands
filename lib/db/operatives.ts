import { randomUUID } from "node:crypto";

import { getDb } from "@/lib/db";
import { recordSiteActivity } from "@/lib/db/activity";
import { env, isSupabaseAdminConfigured } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const MISSING_OPERATIVE_SCHEMA_CODES = new Set(["42P01", "42703", "PGRST204", "PGRST205"]);

export class OperativeDatabaseSetupError extends Error {
  constructor(action: string, message: string) {
    super(`${action}: ${message}`);
    this.name = "OperativeDatabaseSetupError";
  }
}

export function isOperativeDatabaseSetupError(error: unknown): error is OperativeDatabaseSetupError {
  return error instanceof OperativeDatabaseSetupError;
}

export type SiteOperativeRow = {
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
  cscs_card_number: string | null;
  cscs_expiry: string | null;
  operative_status: string;
  site_status: string;
  induction_status: string;
  induction_submission_id: string | null;
  induction_reference: string | null;
  created_at: string;
  updated_at: string;
};

export type UpsertSiteOperativeInput = {
  siteId: string;
  projectId?: string | null;
  contractorId: string;
  operativeId?: string | null;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  cscsCardNumber?: string | null;
  cscsExpiry?: string | null;
  inductionStatus?: string | null;
  siteStatus?: string | null;
  actor?: string | null;
};

type OperativeRow = {
  id: string;
  contractor_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  cscs_card_number: string | null;
  cscs_expiry: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

function shouldUseSupabaseOperativesDb() {
  const provider = env("OPERATIVES_DATABASE_PROVIDER", env("UPLANDS_DATABASE_PROVIDER", process.env.VERCEL && isSupabaseAdminConfigured() ? "supabase" : "sqlite"));
  if (provider === "supabase" && !isSupabaseAdminConfigured()) {
    throw new Error("OPERATIVES_DATABASE_PROVIDER is set to supabase, but Supabase admin environment variables are missing.");
  }
  return provider === "supabase";
}

function assertNoError(error: { code?: string; message: string } | null, action: string) {
  if (!error) return;
  if (error.code && MISSING_OPERATIVE_SCHEMA_CODES.has(error.code)) {
    throw new OperativeDatabaseSetupError(action, "Operative database tables are not installed in Supabase. Apply the operative registry migration.");
  }
  throw new Error(`${action}: ${error.message}`);
}

function normaliseSiteStatus(value: string | null | undefined) {
  return value === "INACTIVE" || value === "ARCHIVED" ? value : "ACTIVE";
}

function normaliseInductionStatus(value: string | null | undefined) {
  return value === "INVITED" || value === "PENDING_REVIEW" || value === "APPROVED" || value === "REJECTED" || value === "EXPIRED" ? value : "NOT_STARTED";
}

export async function listSiteOperatives(siteId: string, contractorId: string): Promise<SiteOperativeRow[]> {
  if (shouldUseSupabaseOperativesDb()) {
    const { data, error } = await createSupabaseAdminClient()
      .from("site_operatives_with_details")
      .select("*")
      .eq("site_id", siteId)
      .eq("contractor_id", contractorId)
      .order("full_name");
    assertNoError(error, "Unable to list site operatives");
    return (data ?? []) as SiteOperativeRow[];
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
         o.cscs_card_number,
         o.cscs_expiry,
         o.status AS operative_status,
         so.status AS site_status,
         so.induction_status,
         so.induction_submission_id,
         s.reference AS induction_reference,
         so.created_at,
         so.updated_at
       FROM site_operatives so
       JOIN operatives o ON o.id = so.operative_id
       JOIN contractors c ON c.id = so.contractor_id
       LEFT JOIN submissions s ON s.id = so.induction_submission_id
       WHERE so.site_id = ? AND so.contractor_id = ?
       ORDER BY o.full_name COLLATE NOCASE`,
    )
    .all(siteId, contractorId) as SiteOperativeRow[];
}

export async function createSiteOperative(input: UpsertSiteOperativeInput) {
  const fullName = input.fullName.trim();
  if (!fullName) throw new Error("Operative name is required.");

  const now = new Date().toISOString();
  const existing = await findExistingOperative(input.contractorId, fullName, input.email, input.phone);
  const operative = existing ?? (await insertOperative(input, now));
  if (existing) await updateOperative({ ...input, operativeId: existing.id }, now);

  await ensureSiteOperativeLink({
    ...input,
    operativeId: operative.id,
    inductionStatus: normaliseInductionStatus(input.inductionStatus),
    siteStatus: normaliseSiteStatus(input.siteStatus),
    now,
  });

  await recordSiteActivity({
    siteId: input.siteId,
    projectId: input.projectId ?? null,
    entityType: "operative",
    entityId: operative.id,
    eventType: "operative_added",
    title: "Operative added",
    detail: fullName,
    actor: input.actor ?? null,
    metadata: { contractorId: input.contractorId, operativeId: operative.id },
  });

  return { operativeId: operative.id, operativeName: fullName };
}

export async function updateSiteOperative(input: UpsertSiteOperativeInput & { operativeId: string }) {
  const fullName = input.fullName.trim();
  if (!fullName) throw new Error("Operative name is required.");
  const now = new Date().toISOString();

  await updateOperative(input, now);
  await ensureSiteOperativeLink({
    ...input,
    inductionStatus: normaliseInductionStatus(input.inductionStatus),
    siteStatus: normaliseSiteStatus(input.siteStatus),
    now,
  });

  await recordSiteActivity({
    siteId: input.siteId,
    projectId: input.projectId ?? null,
    entityType: "operative",
    entityId: input.operativeId,
    eventType: "operative_updated",
    title: "Operative updated",
    detail: fullName,
    actor: input.actor ?? null,
    metadata: { contractorId: input.contractorId, operativeId: input.operativeId, inductionStatus: normaliseInductionStatus(input.inductionStatus) },
  });

  return { operativeId: input.operativeId, operativeName: fullName };
}

async function findExistingOperative(contractorId: string, fullName: string, email?: string | null, phone?: string | null): Promise<OperativeRow | null> {
  const trimmedEmail = email?.trim() || null;
  const trimmedPhone = phone?.trim() || null;

  if (shouldUseSupabaseOperativesDb()) {
    const supabase = createSupabaseAdminClient();
    if (trimmedEmail) {
      const { data, error } = await supabase
        .from("operatives")
        .select("*")
        .eq("contractor_id", contractorId)
        .ilike("email", trimmedEmail)
        .maybeSingle();
      assertNoError(error, "Unable to find operative by email");
      if (data) return data as OperativeRow;
    }

    let query = supabase.from("operatives").select("*").eq("contractor_id", contractorId).ilike("full_name", fullName);
    if (trimmedPhone) query = query.eq("phone", trimmedPhone);
    const { data, error } = await query.limit(1).maybeSingle();
    assertNoError(error, "Unable to find operative by name");
    return (data as OperativeRow | null) ?? null;
  }

  if (trimmedEmail) {
    const byEmail = getDb()
      .prepare("SELECT * FROM operatives WHERE contractor_id = ? AND lower(email) = lower(?) LIMIT 1")
      .get(contractorId, trimmedEmail) as OperativeRow | undefined;
    if (byEmail) return byEmail;
  }

  const sql = trimmedPhone
    ? "SELECT * FROM operatives WHERE contractor_id = ? AND lower(full_name) = lower(?) AND phone = ? LIMIT 1"
    : "SELECT * FROM operatives WHERE contractor_id = ? AND lower(full_name) = lower(?) LIMIT 1";
  const args = trimmedPhone ? [contractorId, fullName, trimmedPhone] : [contractorId, fullName];
  return (getDb().prepare(sql).get(...args) as OperativeRow | undefined) ?? null;
}

async function insertOperative(input: UpsertSiteOperativeInput, now: string): Promise<OperativeRow> {
  const id = randomUUID();
  const row: OperativeRow = {
    id,
    contractor_id: input.contractorId,
    full_name: input.fullName.trim(),
    email: input.email?.trim() || null,
    phone: input.phone?.trim() || null,
    role: input.role?.trim() || null,
    cscs_card_number: input.cscsCardNumber?.trim() || null,
    cscs_expiry: input.cscsExpiry?.trim() || null,
    status: "ACTIVE",
    created_at: now,
    updated_at: now,
  };

  if (shouldUseSupabaseOperativesDb()) {
    const { data, error } = await createSupabaseAdminClient().from("operatives").insert(row).select("*").single();
    assertNoError(error, "Unable to create operative");
    return data as OperativeRow;
  }

  getDb()
    .prepare(
      `INSERT INTO operatives
       (id, contractor_id, full_name, email, phone, role, cscs_card_number, cscs_expiry, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)`,
    )
    .run(row.id, row.contractor_id, row.full_name, row.email, row.phone, row.role, row.cscs_card_number, row.cscs_expiry, row.created_at, row.updated_at);
  return row;
}

async function updateOperative(input: UpsertSiteOperativeInput & { operativeId?: string | null }, now: string) {
  if (!input.operativeId) return;
  const payload = {
    full_name: input.fullName.trim(),
    email: input.email?.trim() || null,
    phone: input.phone?.trim() || null,
    role: input.role?.trim() || null,
    cscs_card_number: input.cscsCardNumber?.trim() || null,
    cscs_expiry: input.cscsExpiry?.trim() || null,
    updated_at: now,
  };

  if (shouldUseSupabaseOperativesDb()) {
    const { error } = await createSupabaseAdminClient()
      .from("operatives")
      .update(payload)
      .eq("id", input.operativeId)
      .eq("contractor_id", input.contractorId);
    assertNoError(error, "Unable to update operative");
    return;
  }

  getDb()
    .prepare(
      `UPDATE operatives
       SET full_name = ?, email = ?, phone = ?, role = ?, cscs_card_number = ?, cscs_expiry = ?, updated_at = ?
       WHERE id = ? AND contractor_id = ?`,
    )
    .run(payload.full_name, payload.email, payload.phone, payload.role, payload.cscs_card_number, payload.cscs_expiry, now, input.operativeId, input.contractorId);
}

async function ensureSiteOperativeLink(input: UpsertSiteOperativeInput & { operativeId: string; now: string }) {
  const siteStatus = normaliseSiteStatus(input.siteStatus);
  const inductionStatus = normaliseInductionStatus(input.inductionStatus);

  if (shouldUseSupabaseOperativesDb()) {
    const supabase = createSupabaseAdminClient();
    const { data: existing, error: existingError } = await supabase
      .from("site_operatives")
      .select("id")
      .eq("site_id", input.siteId)
      .eq("operative_id", input.operativeId)
      .maybeSingle();
    assertNoError(existingError, "Unable to get site operative link");

    if (existing) {
      const { error } = await supabase
        .from("site_operatives")
        .update({
          project_id: input.projectId ?? null,
          contractor_id: input.contractorId,
          induction_status: inductionStatus,
          status: siteStatus,
          updated_at: input.now,
        })
        .eq("id", String(existing.id));
      assertNoError(error, "Unable to update site operative");
      return;
    }

    const { error } = await supabase.from("site_operatives").insert({
      id: randomUUID(),
      site_id: input.siteId,
      project_id: input.projectId ?? null,
      contractor_id: input.contractorId,
      operative_id: input.operativeId,
      induction_status: inductionStatus,
      status: siteStatus,
      created_at: input.now,
      updated_at: input.now,
    });
    assertNoError(error, "Unable to link operative to site");
    return;
  }

  const existing = getDb()
    .prepare("SELECT id FROM site_operatives WHERE site_id = ? AND operative_id = ?")
    .get(input.siteId, input.operativeId) as { id: string } | undefined;

  if (existing) {
    getDb()
      .prepare(
        `UPDATE site_operatives
         SET project_id = ?, contractor_id = ?, induction_status = ?, status = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(input.projectId ?? null, input.contractorId, inductionStatus, siteStatus, input.now, existing.id);
    return;
  }

  getDb()
    .prepare(
      `INSERT INTO site_operatives
       (id, site_id, project_id, contractor_id, operative_id, induction_status, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(randomUUID(), input.siteId, input.projectId ?? null, input.contractorId, input.operativeId, inductionStatus, siteStatus, input.now, input.now);
}
