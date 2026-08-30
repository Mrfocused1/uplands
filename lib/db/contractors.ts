import { randomUUID } from "node:crypto";

import { getDb } from "@/lib/db";
import { recordSiteActivity } from "@/lib/db/activity";
import { env, isSupabaseAdminConfigured } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const MISSING_CONTRACTOR_SCHEMA_CODES = new Set(["42P01", "PGRST205"]);

export class ContractorDatabaseSetupError extends Error {
  constructor(action: string, message: string) {
    super(`${action}: ${message}`);
    this.name = "ContractorDatabaseSetupError";
  }
}

export function isContractorDatabaseSetupError(error: unknown): error is ContractorDatabaseSetupError {
  return error instanceof ContractorDatabaseSetupError;
}

export type SiteContractorRow = {
  site_contractor_id: string;
  site_id: string;
  project_id: string | null;
  contractor_id: string;
  name: string;
  contractor_status: string;
  site_status: string;
  trade: string | null;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  primary_contact_phone: string | null;
  created_at: string;
  updated_at: string;
};

export type SiteContractorSummaryRow = SiteContractorRow & {
  operative_count: number;
  permit_count: number;
  rams_count: number;
  induction_count: number;
};

export type UpsertSiteContractorInput = {
  siteId: string;
  projectId?: string | null;
  contractorId?: string | null;
  name: string;
  trade?: string | null;
  siteStatus?: string | null;
  primaryContactName?: string | null;
  primaryContactEmail?: string | null;
  primaryContactPhone?: string | null;
  actor?: string | null;
};

type ContractorRow = {
  id: string;
  name: string;
  status: string;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  primary_contact_phone: string | null;
  created_at: string;
  updated_at: string;
};

function shouldUseSupabaseContractorsDb() {
  const provider = env(
    "CONTRACTORS_DATABASE_PROVIDER",
    env("UPLANDS_DATABASE_PROVIDER", env("SUBMISSIONS_DATABASE_PROVIDER", process.env.VERCEL && isSupabaseAdminConfigured() ? "supabase" : "sqlite")),
  );
  if (provider === "supabase" && !isSupabaseAdminConfigured()) {
    throw new Error("CONTRACTORS_DATABASE_PROVIDER is set to supabase, but Supabase admin environment variables are missing.");
  }
  return provider === "supabase";
}

function assertNoError(error: { code?: string; message: string } | null, action: string) {
  if (!error) return;
  if (error.code && MISSING_CONTRACTOR_SCHEMA_CODES.has(error.code)) {
    throw new ContractorDatabaseSetupError(action, "Contractor database tables are not installed in Supabase. Apply the contractor registry migration.");
  }
  throw new Error(`${action}: ${error.message}`);
}

export async function listSiteContractors(siteId: string): Promise<SiteContractorSummaryRow[]> {
  if (shouldUseSupabaseContractorsDb()) {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.from("contractors_by_site").select("*").eq("site_id", siteId).order("name");
    assertNoError(error, "Unable to list site contractors");
    const rows = (data ?? []) as SiteContractorRow[];
    return Promise.all(rows.map((row) => withSupabaseCounts(supabase, row)));
  }

  return getDb()
    .prepare(
      `SELECT
         sc.id AS site_contractor_id,
         sc.site_id,
         sc.project_id,
         c.id AS contractor_id,
         c.name,
         c.status AS contractor_status,
         sc.status AS site_status,
         sc.trade,
         c.primary_contact_name,
         c.primary_contact_email,
         c.primary_contact_phone,
         sc.created_at,
         sc.updated_at,
         (SELECT COUNT(*) FROM site_operatives so WHERE so.site_id = sc.site_id AND so.contractor_id = c.id) AS operative_count,
         (SELECT COUNT(*) FROM permits p WHERE p.site_id = sc.site_id AND (p.contractor_id = c.id OR p.contractor = c.name)) AS permit_count,
         (SELECT COUNT(*) FROM rams_documents r WHERE r.site_id = sc.site_id AND (r.contractor_id = c.id OR r.contractor = c.name)) AS rams_count,
         (SELECT COUNT(*) FROM submissions s WHERE s.site_id = sc.site_id AND s.company_name = c.name) AS induction_count
       FROM site_contractors sc
       JOIN contractors c ON c.id = sc.contractor_id
       WHERE sc.site_id = ?
       ORDER BY c.name COLLATE NOCASE`,
    )
    .all(siteId) as SiteContractorSummaryRow[];
}

async function withSupabaseCounts(supabase: ReturnType<typeof createSupabaseAdminClient>, row: SiteContractorRow): Promise<SiteContractorSummaryRow> {
  const [operatives, permits, ramsCount, inductions] = await Promise.all([
    supabase.from("site_operatives").select("id", { count: "exact", head: true }).eq("site_id", row.site_id).eq("contractor_id", row.contractor_id),
    supabase.from("permits").select("id", { count: "exact", head: true }).eq("site_id", row.site_id).or(`contractor_id.eq.${row.contractor_id},contractor.eq.${escapeFilterValue(row.name)}`),
    countContractorRams(supabase, row),
    supabase.from("submissions").select("id", { count: "exact", head: true }).eq("site_id", row.site_id).eq("company_name", row.name),
  ]);
  assertNoError(operatives.error, "Unable to count contractor operatives");
  assertNoError(permits.error, "Unable to count contractor permits");
  assertNoError(inductions.error, "Unable to count contractor inductions");
  return {
    ...row,
    operative_count: operatives.count ?? 0,
    permit_count: permits.count ?? 0,
    rams_count: ramsCount,
    induction_count: inductions.count ?? 0,
  };
}

async function countContractorRams(supabase: ReturnType<typeof createSupabaseAdminClient>, row: SiteContractorRow) {
  const linked = await supabase
    .from("rams_documents")
    .select("id", { count: "exact", head: true })
    .eq("site_id", row.site_id)
    .or(`contractor_id.eq.${row.contractor_id},contractor.eq.${escapeFilterValue(row.name)}`);
  if (!linked.error) return linked.count ?? 0;

  const legacy = await supabase.from("rams_documents").select("id", { count: "exact", head: true }).eq("site_id", row.site_id).eq("contractor", row.name);
  assertNoError(legacy.error, "Unable to count contractor RAMS");
  return legacy.count ?? 0;
}

function escapeFilterValue(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll(",", "\\,").replaceAll(")", "\\)");
}

export async function createSiteContractor(input: UpsertSiteContractorInput) {
  const contractor = await ensureContractorForSite({
    siteId: input.siteId,
    projectId: input.projectId ?? null,
    name: input.name,
    trade: input.trade,
    siteStatus: input.siteStatus,
    primaryContactName: input.primaryContactName,
    primaryContactEmail: input.primaryContactEmail,
    primaryContactPhone: input.primaryContactPhone,
  });

  await recordSiteActivity({
    siteId: input.siteId,
    projectId: input.projectId ?? null,
    entityType: "contractor",
    entityId: contractor.contractorId,
    eventType: "contractor_added",
    title: "Contractor added",
    detail: contractor.contractorName,
    actor: input.actor ?? null,
    metadata: { contractorId: contractor.contractorId },
  });

  return contractor;
}

export async function updateSiteContractor(input: UpsertSiteContractorInput & { contractorId: string }) {
  const name = input.name.trim();
  if (!name) throw new Error("Contractor name is required.");
  const now = new Date().toISOString();
  const siteStatus = normaliseSiteStatus(input.siteStatus);

  if (shouldUseSupabaseContractorsDb()) {
    const supabase = createSupabaseAdminClient();
    const { error: contractorError } = await supabase
      .from("contractors")
      .update({
        name,
        primary_contact_name: input.primaryContactName ?? null,
        primary_contact_email: input.primaryContactEmail ?? null,
        primary_contact_phone: input.primaryContactPhone ?? null,
        updated_at: now,
      })
      .eq("id", input.contractorId);
    assertNoError(contractorError, "Unable to update contractor");

    const { error: siteError } = await supabase
      .from("site_contractors")
      .update({
        project_id: input.projectId ?? null,
        trade: input.trade ?? null,
        status: siteStatus,
        updated_at: now,
      })
      .eq("site_id", input.siteId)
      .eq("contractor_id", input.contractorId);
    assertNoError(siteError, "Unable to update site contractor");
  } else {
    getDb()
      .prepare(
        `UPDATE contractors
         SET name = ?, primary_contact_name = ?, primary_contact_email = ?, primary_contact_phone = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(name, input.primaryContactName ?? null, input.primaryContactEmail ?? null, input.primaryContactPhone ?? null, now, input.contractorId);

    getDb()
      .prepare(
        `UPDATE site_contractors
         SET project_id = ?, trade = ?, status = ?, updated_at = ?
         WHERE site_id = ? AND contractor_id = ?`,
      )
      .run(input.projectId ?? null, input.trade ?? null, siteStatus, now, input.siteId, input.contractorId);
  }

  await recordSiteActivity({
    siteId: input.siteId,
    projectId: input.projectId ?? null,
    entityType: "contractor",
    entityId: input.contractorId,
    eventType: "contractor_updated",
    title: "Contractor updated",
    detail: name,
    actor: input.actor ?? null,
    metadata: { contractorId: input.contractorId, siteStatus },
  });

  return { contractorId: input.contractorId, contractorName: name };
}

export async function resolvePermitContractor(input: {
  siteId: string;
  projectId?: string | null;
  contractorId?: string | null;
  contractorName: string;
}) {
  const contractorId = input.contractorId?.trim() || null;
  if (contractorId) {
    const contractor = await getContractorById(contractorId);
    if (contractor) {
      await ensureSiteContractorLink(input.siteId, input.projectId ?? null, contractor.id);
      return { contractorId: contractor.id, contractorName: contractor.name };
    }
  }

  return ensureContractorForSite({
    siteId: input.siteId,
    projectId: input.projectId ?? null,
    name: input.contractorName,
  });
}

export async function ensureContractorForSite(input: {
  siteId: string;
  projectId?: string | null;
  name: string;
  trade?: string | null;
  siteStatus?: string | null;
  primaryContactName?: string | null;
  primaryContactEmail?: string | null;
  primaryContactPhone?: string | null;
}) {
  const name = input.name.trim();
  if (!name) throw new Error("Contractor is required.");

  const existing = await getContractorByName(name);
  const contractor = existing ?? (await createContractor({
    name,
    primaryContactName: input.primaryContactName ?? null,
    primaryContactEmail: input.primaryContactEmail ?? null,
    primaryContactPhone: input.primaryContactPhone ?? null,
  }));
  if (existing) {
    await updateContractorContact(contractor.id, {
      primaryContactName: input.primaryContactName,
      primaryContactEmail: input.primaryContactEmail,
      primaryContactPhone: input.primaryContactPhone,
    });
  }
  await ensureSiteContractorLink(
    input.siteId,
    input.projectId ?? null,
    contractor.id,
    input.trade ?? null,
    input.siteStatus === undefined ? undefined : normaliseSiteStatus(input.siteStatus),
  );
  return { contractorId: contractor.id, contractorName: contractor.name };
}

async function getContractorById(id: string): Promise<ContractorRow | null> {
  if (shouldUseSupabaseContractorsDb()) {
    const { data, error } = await createSupabaseAdminClient().from("contractors").select("*").eq("id", id).maybeSingle();
    assertNoError(error, "Unable to get contractor");
    return (data as ContractorRow | null) ?? null;
  }

  return (getDb().prepare("SELECT * FROM contractors WHERE id = ?").get(id) as ContractorRow | undefined) ?? null;
}

async function getContractorByName(name: string): Promise<ContractorRow | null> {
  if (shouldUseSupabaseContractorsDb()) {
    const { data, error } = await createSupabaseAdminClient().from("contractors").select("*").eq("name", name).maybeSingle();
    assertNoError(error, "Unable to get contractor by name");
    return (data as ContractorRow | null) ?? null;
  }

  return (getDb().prepare("SELECT * FROM contractors WHERE name = ?").get(name) as ContractorRow | undefined) ?? null;
}

async function createContractor(input: {
  name: string;
  primaryContactName?: string | null;
  primaryContactEmail?: string | null;
  primaryContactPhone?: string | null;
}): Promise<ContractorRow> {
  const id = randomUUID();
  const now = new Date().toISOString();

  if (shouldUseSupabaseContractorsDb()) {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("contractors")
      .insert({
        id,
        name: input.name,
        status: "ACTIVE",
        primary_contact_name: input.primaryContactName ?? null,
        primary_contact_email: input.primaryContactEmail ?? null,
        primary_contact_phone: input.primaryContactPhone ?? null,
        created_at: now,
        updated_at: now,
      })
      .select("*")
      .single();
    if (error?.code === "23505") {
      const existing = await getContractorByName(input.name);
      if (existing) return existing;
    }
    assertNoError(error, "Unable to create contractor");
    return data as ContractorRow;
  }

  getDb()
    .prepare(
      `INSERT INTO contractors
       (id, name, status, primary_contact_name, primary_contact_email, primary_contact_phone, created_at, updated_at)
       VALUES (?, ?, 'ACTIVE', ?, ?, ?, ?, ?)`,
    )
    .run(id, input.name, input.primaryContactName ?? null, input.primaryContactEmail ?? null, input.primaryContactPhone ?? null, now, now);
  return {
    id,
    name: input.name,
    status: "ACTIVE",
    primary_contact_name: input.primaryContactName ?? null,
    primary_contact_email: input.primaryContactEmail ?? null,
    primary_contact_phone: input.primaryContactPhone ?? null,
    created_at: now,
    updated_at: now,
  };
}

async function updateContractorContact(
  contractorId: string,
  input: { primaryContactName?: string | null; primaryContactEmail?: string | null; primaryContactPhone?: string | null },
) {
  if (input.primaryContactName === undefined && input.primaryContactEmail === undefined && input.primaryContactPhone === undefined) return;
  const now = new Date().toISOString();

  if (shouldUseSupabaseContractorsDb()) {
    const { error } = await createSupabaseAdminClient()
      .from("contractors")
      .update({
        primary_contact_name: input.primaryContactName ?? null,
        primary_contact_email: input.primaryContactEmail ?? null,
        primary_contact_phone: input.primaryContactPhone ?? null,
        updated_at: now,
      })
      .eq("id", contractorId);
    assertNoError(error, "Unable to update contractor contact");
    return;
  }

  getDb()
    .prepare(
      `UPDATE contractors
       SET primary_contact_name = ?, primary_contact_email = ?, primary_contact_phone = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(input.primaryContactName ?? null, input.primaryContactEmail ?? null, input.primaryContactPhone ?? null, now, contractorId);
}

function normaliseSiteStatus(value: string | null | undefined) {
  return value === "INACTIVE" || value === "ARCHIVED" ? value : "ACTIVE";
}

async function ensureSiteContractorLink(siteId: string, projectId: string | null, contractorId: string, trade?: string | null, siteStatus?: string | null) {
  const id = randomUUID();
  const now = new Date().toISOString();
  const status = siteStatus ?? "ACTIVE";

  if (shouldUseSupabaseContractorsDb()) {
    const supabase = createSupabaseAdminClient();
    const { data: existing, error: existingError } = await supabase
      .from("site_contractors")
      .select("id")
      .eq("site_id", siteId)
      .eq("contractor_id", contractorId)
      .maybeSingle();
    assertNoError(existingError, "Unable to get site contractor link");

    if (existing) {
      const { error } = await supabase
        .from("site_contractors")
        .update({
          project_id: projectId,
          ...(trade !== undefined ? { trade } : {}),
          ...(siteStatus ? { status } : {}),
          updated_at: now,
        })
        .eq("id", String(existing.id));
      assertNoError(error, "Unable to update contractor site link");
      return;
    }

    const { error } = await supabase.from("site_contractors").insert({
      id,
      site_id: siteId,
      project_id: projectId,
      contractor_id: contractorId,
      trade: trade ?? null,
      status,
      created_at: now,
      updated_at: now,
    });
    assertNoError(error, "Unable to link contractor to site");
    return;
  }

  const existing = getDb().prepare("SELECT id FROM site_contractors WHERE site_id = ? AND contractor_id = ?").get(siteId, contractorId) as { id: string } | undefined;

  if (existing) {
    getDb()
      .prepare(
        `UPDATE site_contractors
         SET
           project_id = COALESCE(?, project_id),
           trade = COALESCE(?, trade),
           status = COALESCE(?, status),
           updated_at = ?
         WHERE id = ?`,
      )
      .run(projectId, trade ?? null, siteStatus ?? null, now, existing.id);
    return;
  }

  getDb()
    .prepare(
      `INSERT INTO site_contractors (id, site_id, project_id, contractor_id, trade, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, siteId, projectId, contractorId, trade ?? null, status, now, now);
}
