import {
  isAttendanceDatabaseSetupError,
  listAttendanceBySite,
  listAttendanceOperatives,
  type AttendanceRecordRow,
} from "@/lib/db/attendance";
import { attendanceHref, signedIn, statusForCount, uniqueCount, type AgentStatus } from "@/lib/agents/agentUtils";

export type AttendanceAgentOperative = {
  id: string;
  name: string;
  contractor: string;
  contractorId: string;
  inductionStatus: string;
  shift: string;
  signedInAt: string;
};

export type AttendanceAgentSnapshot = {
  status: AgentStatus;
  currentlyOnSite: number;
  availableToSignIn: number;
  contractorsOnSite: number;
  unapprovedSignedIn: number;
  currentOperatives: AttendanceAgentOperative[];
  href: string;
  note: string;
};

export async function runAttendanceAgent(siteId: string): Promise<AttendanceAgentSnapshot> {
  try {
    const [records, operatives] = await Promise.all([listAttendanceBySite(siteId, 120), listAttendanceOperatives(siteId)]);
    const current = signedIn(records);
    const currentKey = new Set(current.map((record) => `${record.contractor_id}:${record.operative_id}`));
    const unapprovedSignedIn = current.filter((record) => record.induction_status !== "APPROVED").length;

    return {
      status: statusForCount(unapprovedSignedIn),
      currentlyOnSite: current.length,
      availableToSignIn: operatives.filter((operative) => !currentKey.has(`${operative.contractor_id}:${operative.operative_id}`)).length,
      contractorsOnSite: uniqueCount(current, (record) => record.contractor_id),
      unapprovedSignedIn,
      currentOperatives: current.slice(0, 8).map(toOperative),
      href: attendanceHref(siteId),
      note: unapprovedSignedIn > 0 ? `${unapprovedSignedIn} signed in without approved induction` : `${current.length} currently signed in`,
    };
  } catch (error) {
    if (isAttendanceDatabaseSetupError(error)) return emptyAttendance(siteId, "Attendance tables need migration.");
    throw error;
  }
}

function toOperative(record: AttendanceRecordRow): AttendanceAgentOperative {
  return {
    id: record.operative_id,
    name: record.full_name ?? "Unknown operative",
    contractor: record.contractor_name ?? "Unknown contractor",
    contractorId: record.contractor_id,
    inductionStatus: record.induction_status,
    shift: record.shift,
    signedInAt: record.signed_in_at,
  };
}

function emptyAttendance(siteId: string, note: string): AttendanceAgentSnapshot {
  return {
    status: "WATCH",
    currentlyOnSite: 0,
    availableToSignIn: 0,
    contractorsOnSite: 0,
    unapprovedSignedIn: 0,
    currentOperatives: [],
    href: attendanceHref(siteId),
    note,
  };
}
