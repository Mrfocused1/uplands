import { isAttendanceDatabaseSetupError, listAttendanceBySite } from "@/lib/db/attendance";
import { listSiteActivityEvents } from "@/lib/db/activity";
import { isPermitDatabaseSetupError, listPriorityPermitsBySite } from "@/lib/db/permits";
import { attendanceHref, isExpiringSoonPermit, permitsHref, signedIn, statusForCount, type AgentStatus } from "@/lib/agents/agentUtils";
import { runComplianceAgent, type ComplianceAgentSnapshot, type ComplianceIssue } from "@/lib/agents/complianceAgent";

export type HandoverAgentSnapshot = {
  status: AgentStatus;
  shift: "DAY" | "NIGHT";
  currentlyOnSite: number;
  activeOrPendingPermits: number;
  expiringSoonPermits: number;
  outstandingActions: number;
  briefItems: string[];
  actions: Array<{ title: string; detail: string; href: string }>;
  note: string;
};

export async function runHandoverAgent(siteId: string, complianceInput?: Promise<ComplianceAgentSnapshot>): Promise<HandoverAgentSnapshot> {
  const [attendance, permits, activity, compliance] = await Promise.all([
    listAttendanceBySite(siteId, 120).catch((error) => {
      if (isAttendanceDatabaseSetupError(error)) return [];
      throw error;
    }),
    listPriorityPermitsBySite(siteId, 12).catch((error) => {
      if (isPermitDatabaseSetupError(error)) return [];
      throw error;
    }),
    listSiteActivityEvents(siteId, 8),
    complianceInput ?? runComplianceAgent(siteId),
  ]);

  const current = signedIn(attendance);
  const expiringSoon = permits.filter((permit) => isExpiringSoonPermit(permit)).length;
  const topIssues = compliance.issues.slice(0, 4);
  const briefItems = [
    `${current.length} people currently signed in`,
    `${permits.length} open or pending permits in the watch list`,
    `${expiringSoon} permits expiring within two hours`,
    `${activity.length} recent events available for shift review`,
  ];

  return {
    status: statusForCount(topIssues.length + expiringSoon),
    shift: currentShift(),
    currentlyOnSite: current.length,
    activeOrPendingPermits: permits.length,
    expiringSoonPermits: expiringSoon,
    outstandingActions: topIssues.length,
    briefItems,
    actions: [
      ...topIssues.map(toAction),
      ...(expiringSoon > 0
        ? [
            {
              title: "Permits expiring soon",
              detail: `${expiringSoon} open permits expire within two hours`,
              href: permitsHref(siteId),
            },
          ]
        : []),
      {
        title: "Attendance handover",
        detail: `${current.length} people signed in at shift change`,
        href: attendanceHref(siteId),
      },
    ].slice(0, 6),
    note: topIssues.length > 0 ? `${topIssues.length} actions ready for handover` : "Handover brief ready",
  };
}

function currentShift(): "DAY" | "NIGHT" {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 18 ? "DAY" : "NIGHT";
}

function toAction(issue: ComplianceIssue) {
  return {
    title: issue.title,
    detail: issue.detail,
    href: issue.href,
  };
}
