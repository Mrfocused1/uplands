import { listContractorActivityEvents, type SiteActivityEventRow } from "@/lib/db/activity";
import { listAttendanceByContractor, type AttendanceRecordRow } from "@/lib/db/attendance";
import { listSiteContractors, type SiteContractorSummaryRow } from "@/lib/db/contractors";
import { listInductionInvitations, type InductionInvitationRow } from "@/lib/db/inductionInvitations";
import { listSiteOperatives, type SiteOperativeRow } from "@/lib/db/operatives";
import { listPermitsByContractor, type PermitRow } from "@/lib/db/permits";
import { listRamsDocuments, type RamsDocumentWithCounts } from "@/lib/db/rams";

const OPEN_PERMIT_STATUSES = new Set(["DRAFT", "AWAITING_REVIEW", "AUTHORISED", "ACTIVE", "WORK_COMPLETED"]);

export type ContractorWorkspaceMetrics = {
  currentlyOnSite: number;
  activeInvites: number;
  activePermits: number;
  permitsMissingRams: number;
  permitsWithRams: number;
};

export type ContractorWorkspace = {
  contractor: SiteContractorSummaryRow;
  operatives: SiteOperativeRow[];
  invitations: InductionInvitationRow[];
  activity: SiteActivityEventRow[];
  permits: PermitRow[];
  rams: RamsDocumentWithCounts[];
  attendance: AttendanceRecordRow[];
  metrics: ContractorWorkspaceMetrics;
};

export async function getContractorWorkspace(siteId: string, contractorId: string): Promise<ContractorWorkspace | null> {
  const contractors = await listSiteContractors(siteId);
  const contractor = contractors.find((row) => row.contractor_id === contractorId);
  if (!contractor) return null;

  const [operatives, invitations, activity, permits, rams, attendance] = await Promise.all([
    listSiteOperatives(siteId, contractor.contractor_id),
    listInductionInvitations(siteId, contractor.contractor_id),
    listContractorActivityEvents(siteId, contractor.contractor_id),
    listPermitsByContractor(siteId, contractor.contractor_id, contractor.name),
    listRamsDocuments({ siteId, contractorId: contractor.contractor_id, contractorName: contractor.name }),
    listAttendanceByContractor(siteId, contractor.contractor_id),
  ]);

  return {
    contractor,
    operatives,
    invitations,
    activity,
    permits,
    rams,
    attendance,
    metrics: {
      currentlyOnSite: attendance.filter((record) => record.status === "SIGNED_IN").length,
      activeInvites: invitations.filter((invite) => invite.status === "INVITED").length,
      activePermits: permits.filter((permit) => permit.status === "ACTIVE" || permit.status === "AUTHORISED").length,
      permitsMissingRams: permits.filter((permit) => OPEN_PERMIT_STATUSES.has(permit.status) && !permit.rams_document_id).length,
      permitsWithRams: permits.filter((permit) => permit.rams_document_id).length,
    },
  };
}
