import { listSiteActivityEvents, type SiteActivityEventRow } from "@/lib/db/activity";
import { attendanceHref, contractorHref, permitsHref, ramsHref, type AgentStatus } from "@/lib/agents/agentUtils";

export type TimelineAgentEvent = {
  id: string;
  eventType: string;
  title: string;
  detail: string;
  occurredAt: string;
  href: string | null;
};

export type TimelineAgentSnapshot = {
  status: AgentStatus;
  eventCount: number;
  latestEventAt: string | null;
  events: TimelineAgentEvent[];
  href: string;
  note: string;
};

export async function runTimelineAgent(siteId: string): Promise<TimelineAgentSnapshot> {
  const rows = await listSiteActivityEvents(siteId, 40);
  const events = rows.map((row) => toEvent(siteId, row));
  return {
    status: events.length > 0 ? "CLEAR" : "WATCH",
    eventCount: events.length,
    latestEventAt: events[0]?.occurredAt ?? null,
    events: events.slice(0, 12),
    href: `/admin/sites/${encodeURIComponent(siteId)}`,
    note: events.length > 0 ? `${events.length} recent events indexed` : "No site events recorded yet",
  };
}

function toEvent(siteId: string, row: SiteActivityEventRow): TimelineAgentEvent {
  return {
    id: row.id,
    eventType: row.event_type,
    title: row.title,
    detail: row.detail,
    occurredAt: row.occurred_at,
    href: eventHref(siteId, row),
  };
}

function eventHref(siteId: string, row: SiteActivityEventRow) {
  if (row.entity_type === "permit") return `${permitsHref(siteId)}?permitId=${encodeURIComponent(row.entity_id)}`;
  if (row.entity_type === "rams") return `${ramsHref(siteId)}?documentId=${encodeURIComponent(row.entity_id)}`;
  if (row.entity_type === "attendance") return attendanceHref(siteId);
  if (row.entity_type === "contractor") return contractorHref(siteId, row.entity_id);
  return null;
}
