import { randomUUID } from "node:crypto";

import { getDb } from "@/lib/db";
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
  const provider = env("CONTRACTORS_DATABASE_PROVIDER", env("UPLANDS_DATABASE_PROVIDER", process.env.VERCEL && isSupabaseAdminConfigured() ? "supabase" : "sqlite"));
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

export async function listSiteContractors(siteId: string): Promise<SiteContractorRow[]> {
  if (shouldUseSupabaseContractorsDb()) {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.from("contractors_by_site").select("*").eq("site_id", siteId).order("name");
    assertNoError(error, "Unable to list site contractors");
    return (data ?? []) as SiteContractorRow[];
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
         sc.updated_at
       FROM site_contractors sc
       JOIN contractors c ON c.id = sc.contractor_id
       WHERE sc.site_id = ?
       ORDER BY c.name COLLATE NOCASE`,
    )
    .all(siteId) as SiteContractorRow[];
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

  return ensureSiteContractor({
    siteId: input.siteId,
    projectId: input.projectId ?? null,
    name: input.contractorName,
  });
}

async function ensureSiteContractor(input: { siteId: string; projectId?: string | null; name: string }) {
  const name = input.name.trim();
  if (!name) throw new Error("Contractor is required.");

  const existing = await getContractorByName(name);
  const contractor = existing ?? (await createContractor(name));
  await ensureSiteContractorLink(input.siteId, input.projectId ?? null, contractor.id);
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

async function createContractor(name: string): Promise<ContractorRow> {
  const id = randomUUID();
  const now = new Date().toISOString();

  if (shouldUseSupabaseContractorsDb()) {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("contractors")
      .insert({ id, name, status: "ACTIVE", created_at: now, updated_at: now })
      .select("*")
      .single();
    if (error?.code === "23505") {
      const existing = await getContractorByName(name);
      if (existing) return existing;
    }
    assertNoError(error, "Unable to create contractor");
    return data as ContractorRow;
  }

  getDb()
    .prepare("INSERT INTO contractors (id, name, status, created_at, updated_at) VALUES (?, ?, 'ACTIVE', ?, ?)")
    .run(id, name, now, now);
  return {
    id,
    name,
    status: "ACTIVE",
    primary_contact_name: null,
    primary_contact_email: null,
    primary_contact_phone: null,
    created_at: now,
    updated_at: now,
  };
}

async function ensureSiteContractorLink(siteId: string, projectId: string | null, contractorId: string) {
  const id = randomUUID();
  const now = new Date().toISOString();

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
        .update({ project_id: projectId, status: "ACTIVE", updated_at: now })
        .eq("id", String(existing.id));
      assertNoError(error, "Unable to update contractor site link");
      return;
    }

    const { error } = await supabase.from("site_contractors").insert({
      id,
      site_id: siteId,
      project_id: projectId,
      contractor_id: contractorId,
      status: "ACTIVE",
      created_at: now,
      updated_at: now,
    });
    assertNoError(error, "Unable to link contractor to site");
    return;
  }

  getDb()
    .prepare(
      `INSERT INTO site_contractors (id, site_id, project_id, contractor_id, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?)
       ON CONFLICT(site_id, contractor_id) DO UPDATE SET
         project_id = COALESCE(excluded.project_id, site_contractors.project_id),
         status = 'ACTIVE',
         updated_at = excluded.updated_at`,
    )
    .run(id, siteId, projectId, contractorId, now, now);
}
