import type { PermitStatus } from "@/config/permitTemplates";
import type { AttendanceRecordRow } from "@/lib/db/attendance";
import type { PermitRow } from "@/lib/db/permits";

export type AgentStatus = "CLEAR" | "WATCH" | "ACTION";

export function statusForCount(count: number): AgentStatus {
  if (count <= 0) return "CLEAR";
  if (count <= 2) return "WATCH";
  return "ACTION";
}

export function sitePermitHref(siteId: string, permitId: string) {
  return `/admin/sites/${encodeURIComponent(siteId)}/permits?permitId=${encodeURIComponent(permitId)}`;
}

export function contractorHref(siteId: string, contractorId: string) {
  return `/admin/sites/${encodeURIComponent(siteId)}/contractors/${encodeURIComponent(contractorId)}`;
}

export function attendanceHref(siteId: string) {
  return `/admin/sites/${encodeURIComponent(siteId)}/attendance`;
}

export function permitsHref(siteId: string) {
  return `/admin/sites/${encodeURIComponent(siteId)}/permits`;
}

export function ramsHref(siteId: string) {
  return `/admin/sites/${encodeURIComponent(siteId)}/rams`;
}

export const OPEN_PERMIT_STATUSES = new Set<PermitStatus>(["DRAFT", "AWAITING_REVIEW", "AUTHORISED", "ACTIVE", "WORK_COMPLETED"]);

export function isOpenPermit(row: PermitRow) {
  return OPEN_PERMIT_STATUSES.has(row.status);
}

export function isOperationalPermit(row: PermitRow) {
  return row.status === "ACTIVE" || row.status === "AUTHORISED" || row.status === "WORK_COMPLETED";
}

export function permitExpiry(row: PermitRow) {
  const expiry = new Date(`${row.valid_to_date}T${row.valid_to_time || "00:00"}:00`);
  return Number.isNaN(expiry.getTime()) ? null : expiry;
}

export function isExpiredPermit(row: PermitRow, now = new Date()) {
  const expiry = permitExpiry(row);
  return Boolean(expiry && expiry.getTime() < now.getTime() && (row.status === "ACTIVE" || row.status === "AUTHORISED"));
}

export function isExpiringSoonPermit(row: PermitRow, now = new Date()) {
  const expiry = permitExpiry(row);
  if (!expiry || expiry.getTime() < now.getTime()) return false;
  return expiry.getTime() - now.getTime() <= 2 * 60 * 60 * 1000;
}

export function uniqueCount<T>(items: T[], key: (item: T) => string | null | undefined) {
  const values = new Set<string>();
  for (const item of items) {
    const value = key(item);
    if (value) values.add(value);
  }
  return values.size;
}

export function signedIn(records: AttendanceRecordRow[]) {
  return records.filter((record) => record.status === "SIGNED_IN");
}

export function normaliseStatusLabel(value: string) {
  return value.replaceAll("_", " ");
}
