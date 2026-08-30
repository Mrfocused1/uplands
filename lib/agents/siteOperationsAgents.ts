import { runAttendanceAgent, type AttendanceAgentSnapshot } from "@/lib/agents/attendanceAgent";
import { runComplianceAgent, type ComplianceAgentSnapshot } from "@/lib/agents/complianceAgent";
import { runContractorAgent, type ContractorAgentSnapshot } from "@/lib/agents/contractorAgent";
import { runHandoverAgent, type HandoverAgentSnapshot } from "@/lib/agents/handoverAgent";
import { runTimelineAgent, type TimelineAgentSnapshot } from "@/lib/agents/timelineAgent";

export type SiteOperationsAgentSnapshot = {
  generatedAt: string;
  attendance: AttendanceAgentSnapshot;
  contractors: ContractorAgentSnapshot;
  handover: HandoverAgentSnapshot;
  timeline: TimelineAgentSnapshot;
  compliance: ComplianceAgentSnapshot;
};

export async function runSiteOperationsAgents(siteId: string): Promise<SiteOperationsAgentSnapshot> {
  const compliancePromise = runComplianceAgent(siteId);
  const [attendance, contractors, handover, timeline, compliance] = await Promise.all([
    runAttendanceAgent(siteId),
    runContractorAgent(siteId),
    runHandoverAgent(siteId, compliancePromise),
    runTimelineAgent(siteId),
    compliancePromise,
  ]);

  return {
    generatedAt: new Date().toISOString(),
    attendance,
    contractors,
    handover,
    timeline,
    compliance,
  };
}
