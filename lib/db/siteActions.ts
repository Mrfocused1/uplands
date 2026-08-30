import { randomUUID } from "node:crypto";

import { getDb } from "@/lib/db";
import { recordSiteActivity } from "@/lib/db/activity";
import { env, isSupabaseAdminConfigured } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const MISSING_SITE_ACTION_SCHEMA_CODES = new Set(["42P01", "42703", "PGRST204", "PGRST205"]);

export class SiteActionDatabaseSetupError extends Error {
  constructor(action: string, message: string) {
    super(`${action}: ${message}`);
    this.name = "SiteActionDatabaseSetupError";
  }
}

export function isSiteActionDatabaseSetupError(error: unknown): error is SiteActionDatabaseSetupError {
  return error instanceof SiteActionDatabaseSetupError;
}

export type SiteActionStatus = "OPEN" | "IN_PROGRESS" | "BLOCKED" | "CLOSED" | "CANCELLED";
export type SiteActionPriority = "LOW" | "MEDIUM" | "HIGH";
export type SiteActionSourceType = "handover" | "permit" | "rams" | "attendance" | "contractor" | "manager_note";

export type SiteActionRow = {
  id: string;
  site_id: string;
  project_id: string | null;
  source_type: SiteActionSourceType;
  source_id: string | null;
  source_label: string | null;
  title: string;
  description: string | null;
  owner_name: string | null;
  owner_company: string | null;
  status: SiteActionStatus;
  priority: SiteActionPriority;
  due_date: string | null;
  closed_at: string | null;
  closed_by: string | null;
  closed_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type UpsertSiteActionInput = {
  projectId?: string | null;
  sourceType?: SiteActionSourceType | string | null;
  sourceId?: string | null;
  sourceLabel?: string | null;
  title: string;
  description?: string | null;
  ownerName?: string | null;
  ownerCompany?: string | null;
  status?: SiteActionStatus | string | null;
  priority?: SiteActionPriority | string | null;
  dueDate?: string | null;
  closedNotes?: string | null;
  actor?: string | null;
};

export type SiteActionsDashboardSummary = {
  open: number;
  overdue: number;
  dueSoon: number;
  blocked: number;
  items: SiteActionRow[];
};

function shouldUseSupabaseSiteActionsDb() {
  const provider = env("ACTIONS_DATABASE_PROVIDER", env("UPLANDS_DATABASE_PROVIDER", process.env.VERCEL && isSupabaseAdminConfigured() ? "supabase" : "sqlite"));
  if (provider === "supabase" && !isSupabaseAdminConfigured()) {
    throw new Error("ACTIONS_DATABASE_PROVIDER is set to supabase, but Supabase admin environment variables are missing.");
  }
  return provider === "supabase";
}

function assertNoError(error: { code?: string; message: string } | null, action: string) {
  if (!error) return;
  if (error.code && MISSING_SITE_ACTION_SCHEMA_CODES.has(error.code)) {
    throw new SiteActionDatabaseSetupError(action, "Site action database tables are not installed in Supabase. Apply the site actions migration.");
  }
  throw new Error(`${action}: ${error.message}`);
}

function normaliseStatus(value: string | null | undefined): SiteActionStatus {
  if (value === "IN_PROGRESS" || value === "BLOCKED" || value === "CLOSED" || value === "CANCELLED") return value;
  return "OPEN";
}

function normalisePriority(value: string | null | undefined): SiteActionPriority {
  if (value === "LOW" || value === "HIGH") return value;
  return "MEDIUM";
}

function normaliseSourceType(value: string | null | undefined): SiteActionSourceType {
  if (value === "handover" || value === "permit" || value === "rams" || value === "attendance" || value === "contractor") return value;
  return "manager_note";
}

function cleanText(value: string | null | undefined) {
  const clean = value?.trim() ?? "";
  return clean || null;
}

function normaliseDueDate(value: string | null | undefined) {
  const clean = value?.trim() ?? "";
  return /^\d{4}-\d{2}-\d{2}$/.test(clean) ? clean : null;
}

function payload(siteId: string, input: UpsertSiteActionInput, now: string) {
  const title = input.title.trim();
  if (!title) throw new Error("Action title is required.");

  const status = normaliseStatus(input.status);
  const closedAt = status === "CLOSED" ? now : null;

  return {
    site_id: siteId,
    project_id: cleanText(input.projectId),
    source_type: normaliseSourceType(input.sourceType),
    source_id: cleanText(input.sourceId),
    source_label: cleanText(input.sourceLabel),
    title,
    description: cleanText(input.description),
    owner_name: cleanText(input.ownerName),
    owner_company: cleanText(input.ownerCompany),
    status,
    priority: normalisePriority(input.priority),
    due_date: normaliseDueDate(input.dueDate),
    closed_at: closedAt,
    closed_by: closedAt ? cleanText(input.actor) : null,
    closed_notes: cleanText(input.closedNotes),
    created_by: cleanText(input.actor),
    updated_at: now,
  };
}

export async function listSiteActions(siteId: string, limit = 80, statuses?: SiteActionStatus[]): Promise<SiteActionRow[]> {
  if (shouldUseSupabaseSiteActionsDb()) {
    let query = createSupabaseAdminClient()
      .from("site_actions")
      .select("*")
      .eq("site_id", siteId)
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (statuses?.length) query = query.in("status", statuses);

    const { data, error } = await query;
    assertNoError(error, "Unable to list site actions");
    return (data ?? []) as SiteActionRow[];
  }

  const statusFilter = statuses?.length ? `AND status IN (${statuses.map(() => "?").join(", ")})` : "";
  return getDb()
    .prepare(
      `SELECT *
       FROM site_actions
       WHERE site_id = ? ${statusFilter}
       ORDER BY due_date IS NULL ASC, due_date ASC, created_at DESC
       LIMIT ?`,
    )
    .all(siteId, ...(statuses ?? []), limit) as SiteActionRow[];
}

export async function listOpenSiteActions(siteId: string, limit = 6) {
  return listSiteActions(siteId, limit, ["OPEN", "IN_PROGRESS", "BLOCKED"]);
}

export async function getSiteActionsDashboardSummary(siteId: string): Promise<SiteActionsDashboardSummary> {
  const rows = await listOpenSiteActions(siteId, 100);
  const today = new Date().toISOString().slice(0, 10);
  const soon = new Date();
  soon.setDate(soon.getDate() + 2);
  const soonValue = soon.toISOString().slice(0, 10);

  return {
    open: rows.length,
    overdue: rows.filter((row) => Boolean(row.due_date && row.due_date < today)).length,
    dueSoon: rows.filter((row) => Boolean(row.due_date && row.due_date >= today && row.due_date <= soonValue)).length,
    blocked: rows.filter((row) => row.status === "BLOCKED").length,
    items: rows.slice(0, 6),
  };
}

export async function createSiteAction(siteId: string, input: UpsertSiteActionInput) {
  const now = new Date().toISOString();
  const data = payload(siteId, input, now);
  const existingId = await getExistingOpenSourceAction(siteId, data.source_type, data.source_id, data.title);
  if (existingId) return existingId;

  const id = randomUUID();

  if (shouldUseSupabaseSiteActionsDb()) {
    const { error } = await createSupabaseAdminClient().from("site_actions").insert({
      id,
      ...data,
      created_at: now,
    });
    assertNoError(error, "Unable to create site action");
  } else {
    getDb()
      .prepare(
        `INSERT INTO site_actions
         (id, site_id, project_id, source_type, source_id, source_label, title, description, owner_name, owner_company,
          status, priority, due_date, closed_at, closed_by, closed_notes, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        data.site_id,
        data.project_id,
        data.source_type,
        data.source_id,
        data.source_label,
        data.title,
        data.description,
        data.owner_name,
        data.owner_company,
        data.status,
        data.priority,
        data.due_date,
        data.closed_at,
        data.closed_by,
        data.closed_notes,
        data.created_by,
        now,
        data.updated_at,
      );
  }

  await recordSiteActionActivity(siteId, data.project_id, id, "site_action_created", "Action created", data.title, input);
  return id;
}

async function getExistingOpenSourceAction(siteId: string, sourceType: SiteActionSourceType, sourceId: string | null, title: string) {
  if (!sourceId) return null;

  if (shouldUseSupabaseSiteActionsDb()) {
    const { data, error } = await createSupabaseAdminClient()
      .from("site_actions")
      .select("id")
      .eq("site_id", siteId)
      .eq("source_type", sourceType)
      .eq("source_id", sourceId)
      .eq("title", title)
      .in("status", ["OPEN", "IN_PROGRESS", "BLOCKED"])
      .maybeSingle();
    assertNoError(error, "Unable to check existing site action");
    return (data as { id: string } | null)?.id ?? null;
  }

  const row = getDb()
    .prepare(
      `SELECT id
       FROM site_actions
       WHERE site_id = ? AND source_type = ? AND source_id = ? AND title = ? AND status IN ('OPEN', 'IN_PROGRESS', 'BLOCKED')
       LIMIT 1`,
    )
    .get(siteId, sourceType, sourceId, title) as { id: string } | undefined;
  return row?.id ?? null;
}

export async function updateSiteAction(siteId: string, actionId: string, input: UpsertSiteActionInput) {
  const existing = await getSiteAction(siteId, actionId);
  if (!existing) throw new Error("Site action not found.");

  const now = new Date().toISOString();
  const data = payload(siteId, input, now);
  const closedAt = data.status === "CLOSED" ? existing.closed_at ?? now : null;
  const closedBy = data.status === "CLOSED" ? existing.closed_by ?? cleanText(input.actor) : null;

  if (shouldUseSupabaseSiteActionsDb()) {
    const { error } = await createSupabaseAdminClient()
      .from("site_actions")
      .update({ ...data, closed_at: closedAt, closed_by: closedBy })
      .eq("site_id", siteId)
      .eq("id", actionId);
    assertNoError(error, "Unable to update site action");
  } else {
    getDb()
      .prepare(
        `UPDATE site_actions
         SET project_id = ?, source_type = ?, source_id = ?, source_label = ?, title = ?, description = ?,
             owner_name = ?, owner_company = ?, status = ?, priority = ?, due_date = ?, closed_at = ?,
             closed_by = ?, closed_notes = ?, updated_at = ?
         WHERE site_id = ? AND id = ?`,
      )
      .run(
        data.project_id,
        data.source_type,
        data.source_id,
        data.source_label,
        data.title,
        data.description,
        data.owner_name,
        data.owner_company,
        data.status,
        data.priority,
        data.due_date,
        closedAt,
        closedBy,
        data.closed_notes,
        data.updated_at,
        siteId,
        actionId,
      );
  }

  await recordSiteActionActivity(
    siteId,
    data.project_id,
    actionId,
    data.status === "CLOSED" && existing.status !== "CLOSED" ? "site_action_closed" : "site_action_updated",
    data.status === "CLOSED" && existing.status !== "CLOSED" ? "Action closed" : "Action updated",
    data.title,
    input,
  );
}

export async function getSiteAction(siteId: string, actionId: string) {
  if (shouldUseSupabaseSiteActionsDb()) {
    const { data, error } = await createSupabaseAdminClient().from("site_actions").select("*").eq("site_id", siteId).eq("id", actionId).maybeSingle();
    assertNoError(error, "Unable to get site action");
    return (data as SiteActionRow | null) ?? null;
  }

  return (getDb().prepare("SELECT * FROM site_actions WHERE site_id = ? AND id = ?").get(siteId, actionId) as SiteActionRow | undefined) ?? null;
}

async function recordSiteActionActivity(
  siteId: string,
  projectId: string | null,
  actionId: string,
  eventType: "site_action_created" | "site_action_updated" | "site_action_closed",
  title: string,
  detail: string,
  input: UpsertSiteActionInput,
) {
  await recordSiteActivity({
    siteId,
    projectId,
    entityType: "site_action",
    entityId: actionId,
    eventType,
    title,
    detail,
    actor: input.actor ?? null,
    metadata: {
      actionId,
      sourceType: normaliseSourceType(input.sourceType),
      sourceId: cleanText(input.sourceId),
      status: normaliseStatus(input.status),
      priority: normalisePriority(input.priority),
    },
  });
}
