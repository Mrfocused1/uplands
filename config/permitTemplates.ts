export type PermitAnswer = "YES" | "NO" | "NA";
export type PermitStatus = "DRAFT" | "AWAITING_REVIEW" | "AUTHORISED" | "ACTIVE" | "WORK_COMPLETED" | "CLOSED" | "REJECTED" | "EXPIRED" | "CANCELLED";
export type PermitSignatureKey = "manager_authorisation" | "contractor_acceptance" | "contractor_completion" | "manager_completion_acceptance";

export type PermitTemplateQuestion = {
  key: string;
  prompt: string;
  helpText?: string;
  requiresCommentOn?: PermitAnswer[];
};

export type PermitTemplateSection = {
  id: string;
  title: string;
  description?: string;
  sortOrder: number;
  questions: PermitTemplateQuestion[];
};

export type PermitTemplateSignature = {
  key: PermitSignatureKey;
  title: string;
  role: string;
  action: string;
  sortOrder: number;
};

export type PermitTemplate = {
  id: string;
  code: string;
  title: string;
  description: string;
  registerCode: string;
  version: string;
  sortOrder: number;
  sections: PermitTemplateSection[];
  signatures: PermitTemplateSignature[];
};

export const PERMIT_TEMPLATES: PermitTemplate[] = [
  {
    id: "step-ladders",
    code: "UHSF21.09",
    title: "Step Ladders / Ladders Permit",
    description: "Structured digital permit for short-duration ladder and step ladder work.",
    registerCode: "UHSF21.0",
    version: "1",
    sortOrder: 10,
    sections: [
      {
        id: "rams-competence",
        title: "RAMS / Competence Checks",
        description: "Confirm the task has been planned, briefed and supervised before ladder work starts.",
        sortOrder: 10,
        questions: [
          { key: "safer_access_considered", prompt: "Has a safer means of access been considered and ruled out?" },
          { key: "task_specific_rams", prompt: "Has a task-specific risk assessment and method statement been prepared and approved?" },
          { key: "rams_briefing", prompt: "Have operatives been briefed on the RAMS and ladder permit requirements?" },
          { key: "competent_supervisor", prompt: "Has a competent supervisor been appointed for the works?" },
        ],
      },
      {
        id: "ladder-condition",
        title: "Ladder Suitability",
        description: "Confirm the selected ladder or step ladder is suitable for the location, task and duration.",
        sortOrder: 20,
        questions: [
          { key: "suitable_length", prompt: "Is the ladder the correct and suitable length for the work?" },
          { key: "bs_en_131", prompt: "Does the ladder comply with BS EN 131 or equivalent industrial standard?" },
          { key: "pre_use_inspection", prompt: "Has the ladder been inspected before use and found free from defects?" },
          { key: "correct_angle_stability", prompt: "Can the ladder be positioned at the correct angle and on stable ground?" },
        ],
      },
      {
        id: "work-controls",
        title: "Work Controls",
        description: "Confirm controls that keep the operative stable and prevent falls or unauthorised access.",
        sortOrder: 30,
        questions: [
          { key: "three_contact_points", prompt: "Can three points of contact be maintained while working?" },
          { key: "top_or_foot_tied", prompt: "Can the ladder be tied, footed or otherwise secured against movement?" },
          { key: "safe_head_height", prompt: "Will the operative avoid standing above the safe head-height limit?" },
          { key: "exclusion_zone", prompt: "Is the work area controlled to protect others below or nearby?" },
        ],
      },
    ],
    signatures: [
      {
        key: "manager_authorisation",
        title: "Uplands Site Manager Authorisation",
        role: "Uplands Site Manager",
        action: "Authorised permit issue",
        sortOrder: 10,
      },
      {
        key: "contractor_acceptance",
        title: "Contractor / Operative Acceptance",
        role: "Contractor / Operative",
        action: "Accepted permit controls",
        sortOrder: 20,
      },
      {
        key: "contractor_completion",
        title: "Contractor / Operative Completion",
        role: "Contractor / Operative",
        action: "Confirmed work completed",
        sortOrder: 30,
      },
      {
        key: "manager_completion_acceptance",
        title: "Uplands Site Manager Acceptance of Completion",
        role: "Uplands Site Manager",
        action: "Accepted completion and closed permit",
        sortOrder: 40,
      },
    ],
  },
];
