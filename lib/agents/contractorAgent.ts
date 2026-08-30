import { type SiteContractorSummaryRow, isContractorDatabaseSetupError, listSiteContractors } from "@/lib/db/contractors";
import { isPermitDatabaseSetupError, listPermitsBySite } from "@/lib/db/permits";
import { listRamsDocuments } from "@/lib/db/rams";
import { isAttendanceDatabaseSetupError, listAttendanceBySite } from "@/lib/db/attendance";
import { contractorHref, isOpenPermit, signedIn, statusForCount, type AgentStatus } from "@/lib/agents/agentUtils";

export type ContractorAgentCard = {
  contractorId: string;
  name: string;
  trade: string | null;
  siteStatus: string;
  operativeCount: number;
  currentAttendance: number;
  permitCount: number;
  openPermitCount: number;
  missingLinkedRamsCount: number;
  ramsCount: number;
  readyRamsCount: number;
  inductionCount: number;
  missingContact: boolean;
  href: string;
};

export type ContractorAgentSnapshot = {
  status: AgentStatus;
  totalContractors: number;
  activeContractors: number;
  contractorsOnSite: number;
  missingContactCount: number;
  missingLinkedRamsCount: number;
  cards: ContractorAgentCard[];
  href: string;
  note: string;
};

export async function runContractorAgent(siteId: string): Promise<ContractorAgentSnapshot> {
  try {
    const [contractors, permits, rams, attendance] = await Promise.all([
      listSiteContractors(siteId),
      listPermitsBySite(siteId).catch((error) => {
        if (isPermitDatabaseSetupError(error)) return [];
        throw error;
      }),
      listRamsDocuments({ siteId }),
      listAttendanceBySite(siteId, 120).catch((error) => {
        if (isAttendanceDatabaseSetupError(error)) return [];
        throw error;
      }),
    ]);

    const current = signedIn(attendance);
    const cards = contractors.map((contractor) => {
      const contractorPermits = permits.filter((permit) => permit.contractor_id === contractor.contractor_id || permit.contractor === contractor.name);
      const contractorRams = rams.filter((document) => document.contractor_id === contractor.contractor_id || document.contractor === contractor.name);
      return toCard(siteId, contractor, {
        currentAttendance: current.filter((record) => record.contractor_id === contractor.contractor_id || record.contractor_name === contractor.name).length,
        openPermitCount: contractorPermits.filter(isOpenPermit).length,
        missingLinkedRamsCount: contractorPermits.filter((permit) => isOpenPermit(permit) && !permit.rams_document_id).length,
        readyRamsCount: contractorRams.filter((document) => document.processing_status === "READY").length,
      });
    });

    const issueCount = cards.filter((card) => card.missingContact).length + cards.reduce((sum, card) => sum + card.missingLinkedRamsCount, 0);

    return {
      status: statusForCount(issueCount),
      totalContractors: cards.length,
      activeContractors: cards.filter((card) => card.siteStatus === "ACTIVE").length,
      contractorsOnSite: cards.filter((card) => card.currentAttendance > 0).length,
      missingContactCount: cards.filter((card) => card.missingContact).length,
      missingLinkedRamsCount: cards.reduce((sum, card) => sum + card.missingLinkedRamsCount, 0),
      cards: cards.slice(0, 8),
      href: `/admin/sites/${encodeURIComponent(siteId)}/contractors`,
      note: issueCount > 0 ? `${issueCount} contractor items need attention` : `${cards.length} contractors connected`,
    };
  } catch (error) {
    if (isContractorDatabaseSetupError(error)) return emptyContractors(siteId, "Contractor tables need migration.");
    throw error;
  }
}

function toCard(
  siteId: string,
  contractor: SiteContractorSummaryRow,
  counts: {
    currentAttendance: number;
    openPermitCount: number;
    missingLinkedRamsCount: number;
    readyRamsCount: number;
  },
): ContractorAgentCard {
  const missingContact = !contractor.primary_contact_email && !contractor.primary_contact_phone;
  return {
    contractorId: contractor.contractor_id,
    name: contractor.name,
    trade: contractor.trade,
    siteStatus: contractor.site_status,
    operativeCount: contractor.operative_count,
    currentAttendance: counts.currentAttendance,
    permitCount: contractor.permit_count,
    openPermitCount: counts.openPermitCount,
    missingLinkedRamsCount: counts.missingLinkedRamsCount,
    ramsCount: contractor.rams_count,
    readyRamsCount: counts.readyRamsCount,
    inductionCount: contractor.induction_count,
    missingContact,
    href: contractorHref(siteId, contractor.contractor_id),
  };
}

function emptyContractors(siteId: string, note: string): ContractorAgentSnapshot {
  return {
    status: "WATCH",
    totalContractors: 0,
    activeContractors: 0,
    contractorsOnSite: 0,
    missingContactCount: 0,
    missingLinkedRamsCount: 0,
    cards: [],
    href: `/admin/sites/${encodeURIComponent(siteId)}/contractors`,
    note,
  };
}
