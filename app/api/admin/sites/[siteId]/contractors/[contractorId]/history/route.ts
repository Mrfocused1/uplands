import { NextResponse } from "next/server";

import { requireAdmin, UnauthorizedError } from "@/lib/auth/admin";
import { listContractorActivityEvents } from "@/lib/db/activity";

export const runtime = "nodejs";

function serializeActivity(row: Awaited<ReturnType<typeof listContractorActivityEvents>>[number]) {
  return {
    id: row.id,
    siteId: row.site_id,
    projectId: row.project_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    eventType: row.event_type,
    title: row.title,
    detail: row.detail,
    actor: row.actor,
    occurredAt: row.occurred_at,
  };
}

export async function GET(_request: Request, context: { params: Promise<{ siteId: string; contractorId: string }> }) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw error;
  }

  const { siteId, contractorId } = await context.params;
  const activity = await listContractorActivityEvents(siteId, contractorId);
  return NextResponse.json({ activity: activity.map(serializeActivity) });
}
