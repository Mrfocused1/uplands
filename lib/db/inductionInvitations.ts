import { createHash, randomBytes, randomUUID } from "node:crypto";

import { getDb } from "@/lib/db";
import { recordSiteActivity } from "@/lib/db/activity";
import { env, isSupabaseAdminConfigured } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const MISSING_INVITATION_SCHEMA_CODES = new Set(["42P01", "42703", "PGRST204", "PGRST205"]);
const INVITE_DAYS = 14;

export class InductionInvitationDatabaseSetupError extends Error {
  constructor(action: string, message: string) {
    super(`${action}: ${message}`);
    this.name = "InductionInvitationDatabaseSetupError";
  }
}

export function isInductionInvitationDatabaseSetupError(error: unknown): error is InductionInvitationDatabaseSetupError {
  return error instanceof InductionInvitationDatabaseSetupError;
}

export type InductionInvitationStatus = "INVITED" | "SUBMITTED" | "REVOKED" | "EXPIRED";

export type InductionInvitationRow = {
  id: string;
  token_hash: string;
  site_id: string;
  project_id: string | null;
  contractor_id: string;
  operative_id: string | null;
  submission_id: string | null;
  invited_full_name: string | null;
  invited_email: string | null;
  invited_phone: string | null;
  role: string | null;
  status: InductionInvitationStatus;
  expires_at: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  used_at: string | null;
  revoked_at: string | null;
};

export type PublicInductionInvitation = {
  token: string;
  siteId: string;
  siteName: string;
  contractorId: string;
  contractorName: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
  expiresAt: string;
};

export type CreateInductionInvitationInput = {
  siteId: string;
  projectId?: string | null;
  contractorId: string;
  invitedFullName?: string | null;
  invitedEmail?: string | null;
  invitedPhone?: string | null;
  role?: string | null;
  expiresAt?: string | null;
  createdBy?: string | null;
};

function shouldUseSupabaseInvitationsDb() {
  const provider = env(
    "INDUCTION_INVITATIONS_DATABASE_PROVIDER",
    env(
      "OPERATIVES_DATABASE_PROVIDER",
      env(
        "CONTRACTORS_DATABASE_PROVIDER",
        env("UPLANDS_DATABASE_PROVIDER", env("SUBMISSIONS_DATABASE_PROVIDER", process.env.VERCEL && isSupabaseAdminConfigured() ? "supabase" : "sqlite")),
      ),
    ),
  );
  if (provider === "supabase" && !isSupabaseAdminConfigured()) {
    throw new Error("INDUCTION_INVITATIONS_DATABASE_PROVIDER is set to supabase, but Supabase admin environment variables are missing.");
  }
  return provider === "supabase";
}

function assertNoError(error: { code?: string; message: string } | null, action: string) {
  if (!error) return;
  if (error.code && MISSING_INVITATION_SCHEMA_CODES.has(error.code)) {
    throw new InductionInvitationDatabaseSetupError(action, "Induction invitation tables are not installed in Supabase. Apply the latest migration.");
  }
  throw new Error(`${action}: ${error.message}`);
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function trimText(value: string | null | undefined) {
  return value?.trim() || null;
}

function defaultExpiry() {
  const date = new Date();
  date.setDate(date.getDate() + INVITE_DAYS);
  return date.toISOString();
}

function normaliseStatus(row: InductionInvitationRow): InductionInvitationRow {
  if (row.status !== "INVITED") return row;
  if (Date.parse(row.expires_at) >= Date.now()) return row;
  return { ...row, status: "EXPIRED" };
}

export function invitationPath(token: string) {
  return `/form/invite/${encodeURIComponent(token)}`;
}

export function invitationUrl(origin: string, token: string) {
  return new URL(invitationPath(token), origin).toString();
}

export async function listInductionInvitations(siteId: string, contractorId: string): Promise<InductionInvitationRow[]> {
  if (shouldUseSupabaseInvitationsDb()) {
    const { data, error } = await createSupabaseAdminClient()
      .from("induction_invitations")
      .select("*")
      .eq("site_id", siteId)
      .eq("contractor_id", contractorId)
      .order("created_at", { ascending: false });
    assertNoError(error, "Unable to list induction invitations");
    return ((data ?? []) as InductionInvitationRow[]).map(normaliseStatus);
  }

  return (getDb()
    .prepare(
      `SELECT *
       FROM induction_invitations
       WHERE site_id = ? AND contractor_id = ?
       ORDER BY created_at DESC`,
    )
    .all(siteId, contractorId) as InductionInvitationRow[]).map(normaliseStatus);
}

export async function createInductionInvitation(input: CreateInductionInvitationInput) {
  const token = randomBytes(32).toString("base64url");
  const now = new Date().toISOString();
  const row: InductionInvitationRow = {
    id: randomUUID(),
    token_hash: hashToken(token),
    site_id: input.siteId,
    project_id: input.projectId ?? null,
    contractor_id: input.contractorId,
    operative_id: null,
    submission_id: null,
    invited_full_name: trimText(input.invitedFullName),
    invited_email: trimText(input.invitedEmail),
    invited_phone: trimText(input.invitedPhone),
    role: trimText(input.role),
    status: "INVITED",
    expires_at: input.expiresAt || defaultExpiry(),
    created_by: input.createdBy ?? null,
    created_at: now,
    updated_at: now,
    used_at: null,
    revoked_at: null,
  };

  if (shouldUseSupabaseInvitationsDb()) {
    const { error } = await createSupabaseAdminClient().from("induction_invitations").insert(row);
    assertNoError(error, "Unable to create induction invitation");
  } else {
    getDb()
      .prepare(
        `INSERT INTO induction_invitations
         (id, token_hash, site_id, project_id, contractor_id, operative_id, submission_id, invited_full_name, invited_email, invited_phone,
          role, status, expires_at, created_by, created_at, updated_at, used_at, revoked_at)
         VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?, 'INVITED', ?, ?, ?, ?, NULL, NULL)`,
      )
      .run(
        row.id,
        row.token_hash,
        row.site_id,
        row.project_id,
        row.contractor_id,
        row.invited_full_name,
        row.invited_email,
        row.invited_phone,
        row.role,
        row.expires_at,
        row.created_by,
        row.created_at,
        row.updated_at,
      );
  }

  await recordSiteActivity({
    siteId: row.site_id,
    projectId: row.project_id,
    entityType: "induction_invitation",
    entityId: row.id,
    eventType: "induction_invite_created",
    title: "Induction invite created",
    detail: row.invited_full_name || row.invited_email || "Open operative invitation",
    actor: row.created_by,
    metadata: { contractorId: row.contractor_id },
  });

  return { invitation: row, token };
}

export async function revokeInductionInvitation(input: { siteId: string; contractorId: string; invitationId: string; actor?: string | null }) {
  const now = new Date().toISOString();

  if (shouldUseSupabaseInvitationsDb()) {
    const { data: existing, error: existingError } = await createSupabaseAdminClient()
      .from("induction_invitations")
      .select("*")
      .eq("id", input.invitationId)
      .eq("site_id", input.siteId)
      .eq("contractor_id", input.contractorId)
      .maybeSingle();
    assertNoError(existingError, "Unable to get induction invitation");
    if (!existing) return false;
    const row = existing as InductionInvitationRow;
    if (row.status !== "INVITED") return false;

    const { error } = await createSupabaseAdminClient()
      .from("induction_invitations")
      .update({ status: "REVOKED", revoked_at: now, updated_at: now })
      .eq("id", input.invitationId);
    assertNoError(error, "Unable to revoke induction invitation");
  } else {
    const existing = getDb()
      .prepare("SELECT * FROM induction_invitations WHERE id = ? AND site_id = ? AND contractor_id = ?")
      .get(input.invitationId, input.siteId, input.contractorId) as InductionInvitationRow | undefined;
    if (!existing || existing.status !== "INVITED") return false;
    getDb()
      .prepare("UPDATE induction_invitations SET status = 'REVOKED', revoked_at = ?, updated_at = ? WHERE id = ?")
      .run(now, now, input.invitationId);
  }

  await recordSiteActivity({
    siteId: input.siteId,
    entityType: "induction_invitation",
    entityId: input.invitationId,
    eventType: "induction_invite_revoked",
    title: "Induction invite revoked",
    detail: "Invite link revoked",
    actor: input.actor ?? null,
    metadata: { contractorId: input.contractorId },
  });

  return true;
}

async function getInvitationByToken(token: string): Promise<InductionInvitationRow | null> {
  const tokenHash = hashToken(token);
  if (shouldUseSupabaseInvitationsDb()) {
    const { data, error } = await createSupabaseAdminClient()
      .from("induction_invitations")
      .select("*")
      .eq("token_hash", tokenHash)
      .maybeSingle();
    assertNoError(error, "Unable to get induction invitation");
    return data ? normaliseStatus(data as InductionInvitationRow) : null;
  }

  const row = getDb()
    .prepare("SELECT * FROM induction_invitations WHERE token_hash = ?")
    .get(tokenHash) as InductionInvitationRow | undefined;
  return row ? normaliseStatus(row) : null;
}

async function expireInvitation(id: string) {
  const now = new Date().toISOString();
  if (shouldUseSupabaseInvitationsDb()) {
    const { error } = await createSupabaseAdminClient()
      .from("induction_invitations")
      .update({ status: "EXPIRED", updated_at: now })
      .eq("id", id)
      .eq("status", "INVITED");
    assertNoError(error, "Unable to expire induction invitation");
    return;
  }

  getDb()
    .prepare("UPDATE induction_invitations SET status = 'EXPIRED', updated_at = ? WHERE id = ? AND status = 'INVITED'")
    .run(now, id);
}

export async function getPublicInductionInvitation(token: string): Promise<PublicInductionInvitation | null> {
  const row = await getInvitationByToken(token);
  if (!row) return null;
  if (row.status === "EXPIRED") {
    await expireInvitation(row.id);
    return null;
  }
  if (row.status !== "INVITED") return null;

  if (shouldUseSupabaseInvitationsDb()) {
    const supabase = createSupabaseAdminClient();
    const [{ data: site, error: siteError }, { data: contractor, error: contractorError }] = await Promise.all([
      supabase.from("sites").select("location").eq("id", row.site_id).maybeSingle(),
      supabase.from("contractors").select("name").eq("id", row.contractor_id).maybeSingle(),
    ]);
    assertNoError(siteError, "Unable to get invitation site");
    assertNoError(contractorError, "Unable to get invitation contractor");
    if (!site || !contractor) return null;
    return {
      token,
      siteId: row.site_id,
      siteName: String(site.location),
      contractorId: row.contractor_id,
      contractorName: String(contractor.name),
      fullName: row.invited_full_name,
      email: row.invited_email,
      phone: row.invited_phone,
      role: row.role,
      expiresAt: row.expires_at,
    };
  }

  const details = getDb()
    .prepare(
      `SELECT s.location AS site_name, c.name AS contractor_name
       FROM induction_invitations i
       JOIN sites s ON s.id = i.site_id
       JOIN contractors c ON c.id = i.contractor_id
       WHERE i.id = ?`,
    )
    .get(row.id) as { site_name: string; contractor_name: string } | undefined;
  if (!details) return null;

  return {
    token,
    siteId: row.site_id,
    siteName: details.site_name,
    contractorId: row.contractor_id,
    contractorName: details.contractor_name,
    fullName: row.invited_full_name,
    email: row.invited_email,
    phone: row.invited_phone,
    role: row.role,
    expiresAt: row.expires_at,
  };
}

export async function markInductionInvitationSubmitted(token: string, submissionId: string, operativeId?: string | null) {
  const row = await getInvitationByToken(token);
  if (!row || row.status !== "INVITED") return null;
  if (Date.parse(row.expires_at) < Date.now()) {
    await expireInvitation(row.id);
    return null;
  }

  const now = new Date().toISOString();
  if (shouldUseSupabaseInvitationsDb()) {
    const { error } = await createSupabaseAdminClient()
      .from("induction_invitations")
      .update({ status: "SUBMITTED", submission_id: submissionId, operative_id: operativeId ?? null, used_at: now, updated_at: now })
      .eq("id", row.id)
      .eq("status", "INVITED");
    assertNoError(error, "Unable to mark induction invitation submitted");
  } else {
    getDb()
      .prepare("UPDATE induction_invitations SET status = 'SUBMITTED', submission_id = ?, operative_id = ?, used_at = ?, updated_at = ? WHERE id = ? AND status = 'INVITED'")
      .run(submissionId, operativeId ?? null, now, now, row.id);
  }

  await recordSiteActivity({
    siteId: row.site_id,
    projectId: row.project_id,
    entityType: "induction_invitation",
    entityId: row.id,
    eventType: "induction_invite_submitted",
    title: "Induction invite submitted",
    detail: row.invited_full_name || "Invite completed",
    actor: "Induction",
    metadata: { contractorId: row.contractor_id, submissionId, operativeId: operativeId ?? null },
  });

  return row.id;
}
