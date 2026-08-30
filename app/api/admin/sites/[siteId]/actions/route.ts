import { NextResponse } from "next/server";

import { requireAdmin, UnauthorizedError } from "@/lib/auth/admin";
import {
  createSiteAction,
  isSiteActionDatabaseSetupError,
  listSiteActions,
  updateSiteAction,
  type SiteActionPriority,
  type SiteActionRow,
  type SiteActionSourceType,
  type SiteActionStatus,
  type UpsertSiteActionInput,
} from "@/lib/db/siteActions";

export const runtime = "nodejs";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function status(value: unknown): SiteActionStatus {
  const clean = text(value);
  if (clean === "IN_PROGRESS" || clean === "BLOCKED" || clean === "CLOSED" || clean === "CANCELLED") return clean;
  return "OPEN";
}

function priority(value: unknown): SiteActionPriority {
  const clean = text(value);
  if (clean === "LOW" || clean === "HIGH") return clean;
  return "MEDIUM";
}

function sourceType(value: unknown): SiteActionSourceType {
  const clean = text(value);
  if (clean === "handover" || clean === "permit" || clean === "rams" || clean === "attendance" || clean === "contractor") return clean;
  return "manager_note";
}

function dueDate(value: unknown) {
  const clean = text(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(clean) ? clean : null;
}

function serialize(row: SiteActionRow) {
  return {
    id: row.id,
    siteId: row.site_id,
    projectId: row.project_id,
    sourceType: row.source_type,
    sourceId: row.source_id,
    sourceLabel: row.source_label,
    title: row.title,
    description: row.description,
    ownerName: row.owner_name,
    ownerCompany: row.owner_company,
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date,
    closedAt: row.closed_at,
    closedBy: row.closed_by,
    closedNotes: row.closed_notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function inputFromBody(body: Record<string, unknown>, actor: string): UpsertSiteActionInput {
  return {
    projectId: text(body.projectId) || null,
    sourceType: sourceType(body.sourceType),
    sourceId: text(body.sourceId) || null,
    sourceLabel: text(body.sourceLabel) || null,
    title: text(body.title),
    description: text(body.description) || null,
    ownerName: text(body.ownerName) || null,
    ownerCompany: text(body.ownerCompany) || null,
    status: status(body.status),
    priority: priority(body.priority),
    dueDate: dueDate(body.dueDate),
    closedNotes: text(body.closedNotes) || null,
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
    const actions = await listSiteActions(siteId);
    return NextResponse.json({ actions: actions.map(serialize) });
  } catch (error) {
    if (isSiteActionDatabaseSetupError(error)) return NextResponse.json({ error: "Site actions database setup required." }, { status: 503 });
    throw error;
  }
}

export async function POST(request: Request, context: { params: Promise<{ siteId: string }> }) {
  const admin = await adminOrUnauthorized();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { siteId } = await context.params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid action payload." }, { status: 400 });

  try {
    const id = await createSiteAction(siteId, inputFromBody(body, admin.displayName));
    const actions = await listSiteActions(siteId);
    return NextResponse.json({ id, actions: actions.map(serialize) }, { status: 201 });
  } catch (error) {
    if (isSiteActionDatabaseSetupError(error)) return NextResponse.json({ error: "Site actions database setup required." }, { status: 503 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save action." }, { status: 400 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ siteId: string }> }) {
  const admin = await adminOrUnauthorized();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { siteId } = await context.params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid action payload." }, { status: 400 });

  const actionId = text(body.actionId);
  if (!actionId) return NextResponse.json({ error: "actionId is required." }, { status: 400 });

  try {
    await updateSiteAction(siteId, actionId, inputFromBody(body, admin.displayName));
    const actions = await listSiteActions(siteId);
    return NextResponse.json({ ok: true, actions: actions.map(serialize) });
  } catch (error) {
    if (isSiteActionDatabaseSetupError(error)) return NextResponse.json({ error: "Site actions database setup required." }, { status: 503 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update action." }, { status: 400 });
  }
}
