import { randomUUID } from "node:crypto";

import { getDb } from "@/lib/db";
import { env, isSupabaseAdminConfigured } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type SiteActivityEventType =
  | "contractor_added"
  | "contractor_updated"
  | "permit_created"
  | "permit_updated"
  | "permit_submitted"
  | "permit_authorised"
  | "permit_activated"
  | "permit_work_completed"
  | "permit_closed"
  | "permit_rejected"
  | "permit_expired"
  | "permit_cancelled"
  | "permit_signature_recorded";

export type SiteActivityEventRow = {
  id: string;
  site_id: string;
  project_id: string | null;
  entity_type: string;
  entity_id: string;
  event_type: SiteActivityEventType;
  title: string;
  detail: string;
  actor: string | null;
  occurred_at: string;
  metadata_json: string | null;
};

export type RecordSiteActivityInput = {
  siteId: string;
  projectId?: string | null;
  entityType: string;
  entityId: string;
  eventType: SiteActivityEventType;
  title: string;
  detail: string;
  actor?: string | null;
  occurredAt?: string;
  metadata?: Record<string, unknown> | null;
};

function shouldUseSupabaseActivityDb() {
  const provider = env("ACTIVITY_DATABASE_PROVIDER", env("UPLANDS_DATABASE_PROVIDER", process.env.VERCEL && isSupabaseAdminConfigured() ? "supabase" : "sqlite"));
  if (provider === "supabase" && !isSupabaseAdminConfigured()) {
    throw new Error("ACTIVITY_DATABASE_PROVIDER is set to supabase, but Supabase admin environment variables are missing.");
  }
  return provider === "supabase";
}

function assertNoError(error: { message: string } | null, action: string) {
  if (error) throw new Error(`${action}: ${error.message}`);
}

export async function recordSiteActivity(input: RecordSiteActivityInput) {
  const event: SiteActivityEventRow = {
    id: randomUUID(),
    site_id: input.siteId,
    project_id: input.projectId ?? null,
    entity_type: input.entityType,
    entity_id: input.entityId,
    event_type: input.eventType,
    title: input.title,
    detail: input.detail,
    actor: input.actor ?? null,
    occurred_at: input.occurredAt ?? new Date().toISOString(),
    metadata_json: input.metadata ? JSON.stringify(input.metadata) : null,
  };

  if (shouldUseSupabaseActivityDb()) {
    const { error } = await createSupabaseAdminClient()
      .from("site_activity_events")
      .insert({ ...event, metadata_json: input.metadata ?? null });
    assertNoError(error, "Unable to record site activity");
    return event.id;
  }

  getDb()
    .prepare(
      `INSERT INTO site_activity_events
       (id, site_id, project_id, entity_type, entity_id, event_type, title, detail, actor, occurred_at, metadata_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(event.id, event.site_id, event.project_id, event.entity_type, event.entity_id, event.event_type, event.title, event.detail, event.actor, event.occurred_at, event.metadata_json);

  return event.id;
}

export async function listSiteActivityEvents(siteId: string, limit = 20) {
  if (shouldUseSupabaseActivityDb()) {
    const { data, error } = await createSupabaseAdminClient()
      .from("site_activity_events")
      .select("*")
      .eq("site_id", siteId)
      .order("occurred_at", { ascending: false })
      .limit(limit);
    assertNoError(error, "Unable to list site activity");
    return (data ?? []) as SiteActivityEventRow[];
  }

  return getDb()
    .prepare(
      `SELECT *
       FROM site_activity_events
       WHERE site_id = ?
       ORDER BY occurred_at DESC
       LIMIT ?`,
    )
    .all(siteId, limit) as SiteActivityEventRow[];
}

export async function listEntityActivityEvents(entityType: string, entityId: string, limit = 50) {
  if (shouldUseSupabaseActivityDb()) {
    const { data, error } = await createSupabaseAdminClient()
      .from("site_activity_events")
      .select("*")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("occurred_at", { ascending: false })
      .limit(limit);
    assertNoError(error, "Unable to list entity activity");
    return (data ?? []) as SiteActivityEventRow[];
  }

  return getDb()
    .prepare(
      `SELECT *
       FROM site_activity_events
       WHERE entity_type = ? AND entity_id = ?
       ORDER BY occurred_at DESC
       LIMIT ?`,
    )
    .all(entityType, entityId, limit) as SiteActivityEventRow[];
}
