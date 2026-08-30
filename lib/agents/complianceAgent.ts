import { isAttendanceDatabaseSetupError, listAttendanceBySite } from "@/lib/db/attendance";
import { isContractorDatabaseSetupError, listSiteContractors } from "@/lib/db/contractors";
import { isPermitDatabaseSetupError, listPermitsBySite, type PermitRow } from "@/lib/db/permits";
import { listRamsDocuments } from "@/lib/db/rams";
import { attendanceHref, contractorHref, isExpiredPermit, isOpenPermit, isOperationalPermit, permitsHref, ramsHref, signedIn, statusForCount, type AgentStatus } from "@/lib/agents/agentUtils";

export type ComplianceSeverity = "HIGH" | "MEDIUM" | "LOW";

export type ComplianceIssue = {
  id: string;
  type: "PERMIT_EXPIRED" | "PERMIT_MISSING_RAMS" | "ATTENDANCE_INDUCTION" | "RAMS_NOT_READY" | "CONTRACTOR_CONTACT";
  severity: ComplianceSeverity;
  title: string;
  detail: string;
  href: string;
};

export type ComplianceAgentSnapshot = {
  status: AgentStatus;
  openIssues: number;
  highIssues: number;
  missingLinkedRams: number;
  unapprovedSignedIn: number;
  ramsNotReady: number;
  issues: ComplianceIssue[];
  href: string;
  note: string;
};

export async function runComplianceAgent(siteId: string): Promise<ComplianceAgentSnapshot> {
  const [permits, attendance, rams, contractors] = await Promise.all([
    listPermitsBySite(siteId).catch((error) => {
      if (isPermitDatabaseSetupError(error)) return [];
      throw error;
    }),
    listAttendanceBySite(siteId, 120).catch((error) => {
      if (isAttendanceDatabaseSetupError(error)) return [];
      throw error;
    }),
    listRamsDocuments({ siteId }),
    listSiteContractors(siteId).catch((error) => {
      if (isContractorDatabaseSetupError(error)) return [];
      throw error;
    }),
  ]);

  const issues: ComplianceIssue[] = [
    ...permitIssues(siteId, permits),
    ...signedIn(attendance)
      .filter((record) => record.induction_status !== "APPROVED")
      .map((record): ComplianceIssue => ({
        id: `attendance-induction:${record.id}`,
        type: "ATTENDANCE_INDUCTION",
        severity: "HIGH",
        title: "Signed in without approved induction",
        detail: `${record.full_name ?? "Unknown operative"} · ${record.contractor_name ?? "Unknown contractor"}`,
        href: attendanceHref(siteId),
      })),
    ...rams
      .filter((document) => document.processing_status !== "READY")
      .map((document): ComplianceIssue => ({
        id: `rams-not-ready:${document.id}`,
        type: "RAMS_NOT_READY",
        severity: document.processing_status === "FAILED" ? "HIGH" : "LOW",
        title: "RAMS not ready",
        detail: `${document.title} · ${document.contractor}`,
        href: `${ramsHref(siteId)}?documentId=${encodeURIComponent(document.id)}`,
      })),
    ...contractors
      .filter((contractor) => contractor.site_status === "ACTIVE" && !contractor.primary_contact_email && !contractor.primary_contact_phone)
      .map((contractor): ComplianceIssue => ({
        id: `contractor-contact:${contractor.contractor_id}`,
        type: "CONTRACTOR_CONTACT",
        severity: "LOW",
        title: "Contractor contact missing",
        detail: contractor.name,
        href: contractorHref(siteId, contractor.contractor_id),
      })),
  ];

  const highIssues = issues.filter((issue) => issue.severity === "HIGH").length;

  return {
    status: highIssues > 0 ? "ACTION" : statusForCount(issues.length),
    openIssues: issues.length,
    highIssues,
    missingLinkedRams: issues.filter((issue) => issue.type === "PERMIT_MISSING_RAMS").length,
    unapprovedSignedIn: issues.filter((issue) => issue.type === "ATTENDANCE_INDUCTION").length,
    ramsNotReady: issues.filter((issue) => issue.type === "RAMS_NOT_READY").length,
    issues: issues.slice(0, 10),
    href: `/admin/sites/${encodeURIComponent(siteId)}`,
    note: issues.length > 0 ? `${issues.length} compliance checks need review` : "No open compliance warnings",
  };
}

function permitIssues(siteId: string, permits: PermitRow[]): ComplianceIssue[] {
  return permits.flatMap((permit) => {
    const issues: ComplianceIssue[] = [];
    if (isOperationalPermit(permit) && isExpiredPermit(permit)) {
      issues.push({
        id: `permit-expired:${permit.id}`,
        type: "PERMIT_EXPIRED",
        severity: "HIGH",
        title: "Permit has passed expiry",
        detail: `${permit.permit_number} · ${permit.contractor}`,
        href: `${permitsHref(siteId)}?permitId=${encodeURIComponent(permit.id)}`,
      });
    }
    if (isOpenPermit(permit) && !permit.rams_document_id) {
      issues.push({
        id: `permit-missing-rams:${permit.id}`,
        type: "PERMIT_MISSING_RAMS",
        severity: "MEDIUM",
        title: "Permit missing linked RAMS",
        detail: `${permit.permit_number} · ${permit.contractor}`,
        href: `${permitsHref(siteId)}?permitId=${encodeURIComponent(permit.id)}`,
      });
    }
    return issues;
  });
}
