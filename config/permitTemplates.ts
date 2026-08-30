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
  {
    id: "electrical",
    code: "UHSF21.06",
    title: "Electrical Permit",
    description: "Structured digital permit for controlled electrical works, isolation declarations and completion acceptance.",
    registerCode: "UHSF21.0",
    version: "1",
    sortOrder: 20,
    sections: [
      {
        id: "precautions",
        title: "Precautions",
        description: "Confirm RAMS, supervision, training and access controls are in place before electrical work starts.",
        sortOrder: 10,
        questions: [
          { key: "rams_prepared_approved", prompt: "Has a Risk Assessment and Method Statement been prepared and approved?" },
          { key: "rams_briefing_understood", prompt: "Have all personnel been briefed on the contents of the RAMS and do they understand the task being carried out?" },
          { key: "emergency_procedures_prepared", prompt: "Have emergency procedures been prepared and posted?" },
          { key: "emergency_procedures_training", prompt: "Have all personnel involved been trained in the requirements of the emergency procedures?" },
          { key: "competent_supervisor", prompt: "Has a competent supervisor been appointed?", helpText: "Use the comment field to record who has been appointed." },
          { key: "operatives_trained", prompt: "Are operatives suitably trained?" },
          { key: "prevent_unauthorised_access", prompt: "Are arrangements in place to prevent unauthorised access?" },
          { key: "control_panels_locked_off", prompt: "Are control panels locked off?" },
        ],
      },
      {
        id: "uplands-electrician-declaration",
        title: "Uplands Site Electrician Declaration",
        description: "Record the safe-isolation declaration before the permit is authorised.",
        sortOrder: 20,
        questions: [
          {
            key: "work_to_be_carried_out_recorded",
            prompt: "Has the electrical work to be carried out been recorded?",
            helpText: "Use the comment field for the apparatus or work details where needed.",
          },
          {
            key: "apparatus_safe_to_work_on",
            prompt: "Is it safe to work on the apparatus required for the work detailed above?",
            helpText: "Use the comment field to identify the apparatus.",
          },
          { key: "other_apparatus_dangerous", prompt: "Have all other apparatus been regarded as dangerous?" },
          {
            key: "apparatus_dead_and_isolated",
            prompt: "Is the apparatus dead and isolated from supply, with live conductors isolated at the required points?",
            helpText: "Use the comment field to record isolation points.",
          },
          {
            key: "circuit_main_earths_applied",
            prompt: "Have circuit main earths been applied to the apparatus where required?",
            helpText: "Use the comment field to record earthing points.",
          },
          {
            key: "danger_notices_posted",
            prompt: "Have danger notices been posted at the required locations?",
            helpText: "Use the comment field to record where notices are posted.",
          },
        ],
      },
    ],
    signatures: [
      {
        key: "manager_authorisation",
        title: "Uplands Site Manager Authorisation",
        role: "Uplands Site Manager",
        action: "Authorised electrical permit issue",
        sortOrder: 10,
      },
      {
        key: "contractor_acceptance",
        title: "Contractor / Operative Acceptance",
        role: "Contractor / Operative",
        action: "Accepted electrical permit controls",
        sortOrder: 20,
      },
      {
        key: "contractor_completion",
        title: "Contractor / Operative Completion",
        role: "Contractor / Operative",
        action: "Confirmed electrical work completed",
        sortOrder: 30,
      },
      {
        key: "manager_completion_acceptance",
        title: "Uplands Site Manager Acceptance of Completion",
        role: "Uplands Site Manager",
        action: "Accepted completion and closed electrical permit",
        sortOrder: 40,
      },
    ],
  },
];
