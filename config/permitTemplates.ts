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
  {
    id: "mobile-tower-scaffold",
    code: "UHSF21.12",
    title: "Mobile Tower Scaffold Permit",
    description: "Structured digital permit for mobile tower scaffold erection, checking, use and closure.",
    registerCode: "UHSF21.0",
    version: "1",
    sortOrder: 30,
    sections: [
      {
        id: "planning-competence",
        title: "Planning / Competence Checks",
        description: "Confirm RAMS, briefing, PASMA competence and supervision are in place before tower use.",
        sortOrder: 10,
        questions: [
          { key: "rams_prepared_approved", prompt: "Has a Risk Assessment and Method Statement been prepared and approved?" },
          {
            key: "rams_briefing_understood",
            prompt: "Have all personnel been briefed on the contents of the RAMS and do they understand the task being carried out?",
          },
          { key: "pasma_card_produced", prompt: "Has the operative produced the relevant PASMA card for erecting or checking this mobile tower?" },
          {
            key: "competent_supervisor",
            prompt: "Has a competent supervisor been appointed?",
            helpText: "Use the comment field to record who has been appointed.",
          },
        ],
      },
      {
        id: "tower-system",
        title: "Tower System / Components",
        description: "Confirm the tower system, components and warning arrangements meet Uplands requirements.",
        sortOrder: 20,
        questions: [
          { key: "advanced_guard_rail_system", prompt: "Is the mobile tower an Advanced Guard Rail (AGR) system in line with Uplands policy?" },
          {
            key: "non_agr_reason_recorded",
            prompt: "If the mobile tower is not an AGR system, has the reason been recorded?",
            helpText: "Record if AGR is not required due to insufficient height, unavailable from hire centre, or another reason.",
          },
          {
            key: "components_present_assembled",
            prompt: "Are all components present and assembled, including guard rails, toe boards, bracing, rakers and wheels?",
          },
          { key: "signs_barriers_below", prompt: "Have signs and barriers been erected to warn persons below?" },
        ],
      },
      {
        id: "site-conditions",
        title: "Site Conditions",
        description: "Confirm weather, ground and lighting conditions are suitable for mobile tower work.",
        sortOrder: 30,
        questions: [
          { key: "adverse_weather_absent", prompt: "Are adverse weather conditions absent and not forecast during the permit period?" },
          { key: "ground_conditions_suitable", prompt: "Are ground conditions suitable?" },
          { key: "lighting_conditions_suitable", prompt: "Are lighting conditions suitable?" },
          {
            key: "shift_or_scafftag_control",
            prompt: "Is this permit limited to one shift unless a daily updated scaff tag system is in place?",
            helpText: "Close the permit when the mobile tower is taken out of use.",
          },
        ],
      },
    ],
    signatures: [
      {
        key: "manager_authorisation",
        title: "Uplands Site Manager Authorisation",
        role: "Uplands Site Manager",
        action: "Authorised mobile tower scaffold permit issue",
        sortOrder: 10,
      },
      {
        key: "contractor_acceptance",
        title: "Contractor / Operative Acceptance",
        role: "Contractor / Operative",
        action: "Accepted mobile tower scaffold permit controls",
        sortOrder: 20,
      },
      {
        key: "contractor_completion",
        title: "Contractor / Operative Completion",
        role: "Contractor / Operative",
        action: "Confirmed mobile tower scaffold work completed",
        sortOrder: 30,
      },
      {
        key: "manager_completion_acceptance",
        title: "Uplands Site Manager Acceptance of Completion",
        role: "Uplands Site Manager",
        action: "Accepted completion and closed mobile tower scaffold permit",
        sortOrder: 40,
      },
    ],
  },
  {
    id: "cherry-picker-star-10",
    code: "UHSF21.05",
    title: "Cherry Picker / Star 10 Permit",
    description: "Structured digital permit for cherry picker and Star 10 plant use, rescue planning and completion control.",
    registerCode: "UHSF21.0",
    version: "1",
    sortOrder: 40,
    sections: [
      {
        id: "planning-competence",
        title: "Planning / Competence Checks",
        description: "Confirm RAMS, briefing, IPAF competence, rescue planning and supervision are in place before plant use.",
        sortOrder: 10,
        questions: [
          { key: "rams_prepared_approved", prompt: "Has a Risk Assessment and Method Statement been prepared and approved?" },
          {
            key: "rams_briefing_understood",
            prompt: "Have all personnel been briefed on the contents of the RAMS and do they understand the task being carried out?",
          },
          { key: "ipaf_card_produced", prompt: "Have the operatives produced the relevant IPAF card for using this plant?" },
          {
            key: "rescue_plan_in_place",
            prompt: "Is a rescue plan in place?",
            helpText: "Use the comment field to name the person responsible for executing the plan.",
          },
          { key: "rescue_plan_briefed", prompt: "Have all operatives been briefed on the rescue plan and how to execute it?" },
          {
            key: "competent_supervisor",
            prompt: "Has a competent appointed supervisor been identified?",
            helpText: "Use the comment field to record who has been appointed.",
          },
        ],
      },
      {
        id: "plant-records",
        title: "Plant / Harness Records",
        description: "Confirm statutory plant records and harness inspections are current and filed before work starts.",
        sortOrder: 20,
        questions: [
          { key: "thorough_examination_certificate", prompt: "Is an up-to-date Thorough Examination Certificate filed in Folder 2?" },
          { key: "harness_inspection_records", prompt: "Have Harness Inspection Records been provided and filed in Folder 2?" },
        ],
      },
      {
        id: "site-controls",
        title: "Site Controls / Conditions",
        description: "Confirm the exclusion zone, weather, ground and lighting conditions are suitable for MEWP work.",
        sortOrder: 30,
        questions: [
          {
            key: "exclusion_zone_below",
            prompt: "Have signs and barriers been erected to form a suitable and sufficient exclusion zone beneath the area of work?",
          },
          { key: "adverse_weather_present", prompt: "Are adverse weather conditions present or forecast?", requiresCommentOn: ["YES"] },
          { key: "ground_conditions_suitable", prompt: "Are ground conditions suitable?" },
          { key: "lighting_conditions_suitable", prompt: "Are lighting conditions suitable?" },
          {
            key: "one_shift_validity",
            prompt: "Is this permit limited to one shift, with a new permit issued and controls rechecked if work continues onto another shift?",
          },
        ],
      },
    ],
    signatures: [
      {
        key: "manager_authorisation",
        title: "Uplands Site Manager Authorisation",
        role: "Uplands Site Manager",
        action: "Authorised cherry picker / Star 10 permit issue",
        sortOrder: 10,
      },
      {
        key: "contractor_acceptance",
        title: "Contractor / Operative Acceptance",
        role: "Contractor / Operative",
        action: "Accepted cherry picker / Star 10 permit controls",
        sortOrder: 20,
      },
      {
        key: "contractor_completion",
        title: "Contractor / Operative Completion",
        role: "Contractor / Operative",
        action: "Confirmed cherry picker / Star 10 work completed",
        sortOrder: 30,
      },
      {
        key: "manager_completion_acceptance",
        title: "Uplands Site Manager Acceptance of Completion",
        role: "Uplands Site Manager",
        action: "Accepted completion and closed cherry picker / Star 10 permit",
        sortOrder: 40,
      },
    ],
  },
  {
    id: "excavation",
    code: "UHSF21.01",
    title: "Excavation Permit",
    description: "Structured digital permit for excavation work, service checks, ground controls, atmosphere checks and site protection.",
    registerCode: "UHSF21.0",
    version: "1",
    sortOrder: 50,
    sections: [
      {
        id: "planning-competence",
        title: "Planning / Competence Checks",
        description: "Confirm RAMS, briefing, emergency arrangements, supervision and operative competence before excavation starts.",
        sortOrder: 10,
        questions: [
          { key: "rams_prepared_approved", prompt: "Has a Risk Assessment and Method Statement been prepared and approved?" },
          {
            key: "rams_briefing_understood",
            prompt: "Have all personnel been briefed on the contents of the RAMS and do they understand the task being carried out?",
          },
          { key: "emergency_procedures_prepared", prompt: "Have emergency procedures been prepared and posted?" },
          { key: "emergency_procedures_training", prompt: "Have all personnel involved been trained in the requirements of the emergency procedures?" },
          {
            key: "competent_supervisor",
            prompt: "Has a competent supervisor been appointed?",
            helpText: "Use the comment field to record who has been appointed.",
          },
          { key: "operatives_trained", prompt: "Are operatives suitably trained?" },
        ],
      },
      {
        id: "services-drawings-materials",
        title: "Services / Drawings / Materials",
        description: "Confirm buried services, drawings and excavation support/access materials are ready.",
        sortOrder: 20,
        questions: [
          {
            key: "services_located_verified",
            prompt: "Have all services been located and their positions verified?",
            helpText: "Record drawing references, scan references or known service locations where needed.",
          },
          { key: "drawings_available", prompt: "Are necessary drawings available?" },
          { key: "access_materials_ready", prompt: "Are access materials ready to place?" },
          { key: "support_materials_ready", prompt: "Are support materials ready to place?" },
        ],
      },
      {
        id: "excavation-stability",
        title: "Excavation Stability / Edge Protection",
        description: "Confirm the excavation, adjacent structures and ground conditions can be kept stable and protected.",
        sortOrder: 30,
        questions: [
          { key: "edge_protection_ready", prompt: "Is edge protection for personnel and vehicles ready to place?" },
          { key: "soil_conditions_considered", prompt: "Have soil conditions been taken into account?" },
          { key: "no_danger_of_flooding", prompt: "Are you satisfied that there is no danger of flooding?" },
          { key: "adjacent_structures_safe", prompt: "Will adjacent structures be safe?" },
        ],
      },
      {
        id: "atmosphere-rescue",
        title: "Atmosphere / Rescue Arrangements",
        description: "Confirm ventilation, gas/fume testing and rescue equipment for excavation work.",
        sortOrder: 40,
        questions: [
          { key: "ventilation_adequate", prompt: "Is ventilation adequate?" },
          { key: "regular_gas_fume_tests", prompt: "Will regular tests for gases and fumes be carried out?" },
          { key: "respiratory_equipment_provided", prompt: "Has the necessary respiratory equipment been provided?" },
          { key: "resuscitation_equipment_available", prompt: "Is resuscitation equipment readily available?" },
        ],
      },
      {
        id: "plant-site-protection",
        title: "Plant / Site Protection",
        description: "Confirm plant suitability, lighting and protection of other persons on site.",
        sortOrder: 50,
        questions: [
          { key: "excavator_suitable", prompt: "Is the excavator physically and legally suitable for the job?" },
          { key: "lighting_ready_if_required", prompt: "If required, is lighting on site ready to use?" },
          { key: "other_persons_protected", prompt: "Will other persons on site be adequately protected?" },
        ],
      },
    ],
    signatures: [
      {
        key: "manager_authorisation",
        title: "Uplands Site Manager Authorisation",
        role: "Uplands Site Manager",
        action: "Authorised excavation permit issue",
        sortOrder: 10,
      },
      {
        key: "contractor_acceptance",
        title: "Contractor / Operative Acceptance",
        role: "Contractor / Operative",
        action: "Accepted excavation permit controls",
        sortOrder: 20,
      },
      {
        key: "contractor_completion",
        title: "Contractor / Operative Completion",
        role: "Contractor / Operative",
        action: "Confirmed excavation work completed",
        sortOrder: 30,
      },
      {
        key: "manager_completion_acceptance",
        title: "Uplands Site Manager Acceptance of Completion",
        role: "Uplands Site Manager",
        action: "Accepted completion and closed excavation permit",
        sortOrder: 40,
      },
    ],
  },
  {
    id: "permit-to-dig-break-ground",
    code: "UHSF21.03",
    title: "Permit to Dig / Break Ground",
    description: "Structured digital permit for breaking ground, utility-plan checks, CAT scanning, service exposure and briefing controls.",
    registerCode: "UHSF21.0",
    version: "1",
    sortOrder: 60,
    sections: [
      {
        id: "plans-scanning",
        title: "Plans / CAT Scanning",
        description: "Confirm utility information, scanning records and service-location controls before breaking ground.",
        sortOrder: 10,
        questions: [
          { key: "utility_plans_provided", prompt: "Have all utility and third-party plans / drawings been provided?" },
          {
            key: "cat_scan_completed_recorded",
            prompt: "Has a CAT scan of the area taken place and been recorded?",
            helpText: "Record scan date, area covered and reference details where needed.",
          },
          {
            key: "cat_scans_every_300mm",
            prompt: "If excavation work is being carried out, will CAT scans be repeated at least every 300mm of depth?",
          },
          {
            key: "cat_genny_calibrated",
            prompt: "Has the CAT and Genny equipment been calibrated in the last 12 months?",
            helpText: "A copy of the calibration certificate is required for inspection and all pre-user checks must be carried out.",
          },
        ],
      },
      {
        id: "services-ground-controls",
        title: "Services / Ground Controls",
        description: "Confirm known services are traced, marked and controlled before mechanical work starts.",
        sortOrder: 20,
        questions: [
          {
            key: "known_services_traced_marked",
            prompt: "Have all known services been traced and marked out on the ground?",
            helpText: "If this is No, do not proceed.",
            requiresCommentOn: ["NO"],
          },
          {
            key: "gas_electric_within_500mm",
            prompt: "Have electricity or gas services been identified as present within 500mm of the dig in any direction?",
            helpText: "If Yes, services must be fully exposed by hand dig before machinery starts. No breakers or mechanical equipment are to be used.",
            requiresCommentOn: ["YES"],
          },
          {
            key: "hand_dig_rule_briefed",
            prompt: "Where services are within 500mm, has the hand-dig and no-breaker restriction been briefed and accepted?",
          },
        ],
      },
      {
        id: "rams-competence",
        title: "RAMS / Competence",
        description: "Confirm the task has suitable RAMS, briefing and competent personnel before work starts.",
        sortOrder: 30,
        questions: [
          { key: "suitable_sufficient_rams", prompt: "Are there suitable and sufficient RAMS in place for this operation?" },
          { key: "personnel_plant_operator_briefed", prompt: "Have all personnel, including the plant operator, been briefed on the RAMS?" },
          { key: "personnel_competent", prompt: "Are all personnel competent?" },
          { key: "emergency_first_aid_in_place", prompt: "Are emergency procedures and first aid provisions in place?" },
        ],
      },
      {
        id: "permit-conditions",
        title: "Permit Conditions",
        description: "Confirm the permit-specific stop-work rules have been communicated to the work party.",
        sortOrder: 40,
        questions: [
          {
            key: "permit_conditions_briefed",
            prompt: "Have all conditions and control measures of this permit been briefed to all operatives?",
          },
          {
            key: "stop_if_services_encased",
            prompt:
              "Has the team been instructed to stop work immediately if gas or electricity services are found encased in concrete, with the service provider and Uplands site manager informed?",
          },
          {
            key: "stop_if_foundations_encased",
            prompt:
              "Has the team been instructed to stop work immediately if foundations are found encased in concrete or isolated until the Uplands site manager confirms conditions are adhered to?",
          },
        ],
      },
    ],
    signatures: [
      {
        key: "manager_authorisation",
        title: "Uplands Site Manager Authorisation",
        role: "Uplands Site Manager",
        action: "Authorised permit to dig / break ground issue",
        sortOrder: 10,
      },
      {
        key: "contractor_acceptance",
        title: "Supervisor Acceptance",
        role: "Supervisor",
        action: "Accepted permit to dig / break ground controls",
        sortOrder: 20,
      },
      {
        key: "contractor_completion",
        title: "Contractor / Operative Completion",
        role: "Contractor / Operative",
        action: "Confirmed permit to dig / break ground work completed",
        sortOrder: 30,
      },
      {
        key: "manager_completion_acceptance",
        title: "Uplands Site Manager Acceptance of Completion",
        role: "Uplands Site Manager",
        action: "Accepted completion and closed permit to dig / break ground",
        sortOrder: 40,
      },
    ],
  },
  {
    id: "confined-space",
    code: "UHSF21.04",
    title: "Confined Space Permit",
    description: "Structured digital permit for confined-space entry, rescue planning, atmosphere controls, supervision and closure.",
    registerCode: "UHSF21.0",
    version: "1",
    sortOrder: 70,
    sections: [
      {
        id: "planning-competence",
        title: "Planning / Competence Checks",
        description: "Confirm RAMS, briefing, competent supervision and confined-space certification before entry.",
        sortOrder: 10,
        questions: [
          { key: "rams_prepared_approved", prompt: "Has a Risk Assessment and Method Statement been prepared and approved?" },
          {
            key: "rams_briefing_understood",
            prompt: "Have all personnel been briefed on the contents of the RAMS and do they understand the task being carried out?",
          },
          { key: "emergency_procedures_rescue_plan", prompt: "Have emergency procedures been prepared and posted, including a rescue plan?" },
          { key: "emergency_procedures_training", prompt: "Have all personnel involved been trained in the requirements of the emergency procedures?" },
          {
            key: "competent_supervisor",
            prompt: "Has a competent supervisor been appointed?",
            helpText: "Use the comment field to record who has been appointed.",
          },
          {
            key: "confined_space_certification",
            prompt: "Are operatives suitably trained and competent, including holding confined-space entry certification?",
          },
        ],
      },
      {
        id: "atmosphere-ventilation",
        title: "Atmosphere / Ventilation Controls",
        description: "Confirm ventilation, oxygen or gas testing, communications and access arrangements are suitable.",
        sortOrder: 20,
        questions: [
          {
            key: "emergency_services_contact_required",
            prompt: "Do emergency services need to be contacted?",
            requiresCommentOn: ["YES"],
          },
          {
            key: "ventilation_adequate",
            prompt: "Is ventilation adequate?",
            helpText: "If not, record whether ventilation calculations have been carried out and what suitable system is provided.",
            requiresCommentOn: ["NO"],
          },
          {
            key: "oxygen_gas_tests_required",
            prompt: "Are oxygen or gas tests needed?",
            helpText: "Record the test arrangement, frequency and responsible person where required.",
            requiresCommentOn: ["YES"],
          },
          { key: "suitable_access_egress", prompt: "Is there suitable access and egress?" },
          { key: "prevent_unauthorised_access", prompt: "Are arrangements in place to prevent unauthorised access?" },
          {
            key: "adequate_communications",
            prompt: "Are adequate communications provided to ensure the continued safety of persons in the confined space?",
          },
        ],
      },
      {
        id: "rescue-emergency",
        title: "Rescue / Emergency Readiness",
        description: "Confirm external observation, rescue arrangements, first aid and escape equipment before entry.",
        sortOrder: 30,
        questions: [
          { key: "observer_outside_space", prompt: "Is there an observer outside the confined space?" },
          { key: "rescue_provisions_available", prompt: "Are there provisions for rescue?" },
          { key: "employees_trained_in_rescue", prompt: "Are employees trained in rescue?" },
          { key: "first_aider_standby", prompt: "Is a first aider on standby?" },
          { key: "ten_minute_escape_set", prompt: "Is a ten minute escape set available?" },
          {
            key: "suitable_ppe_rescue_kits",
            prompt: "Have personnel been provided with adequate and suitable PPE, including rescue kits?",
          },
        ],
      },
      {
        id: "site-conditions",
        title: "Site Conditions / Additional Controls",
        description: "Confirm infection, lighting and ingress controls are suitable for the confined-space task.",
        sortOrder: 40,
        questions: [
          { key: "infection_precautions_investigated", prompt: "Have precautions to prevent infection been investigated?" },
          { key: "adequate_lighting", prompt: "Is there adequate lighting?" },
          { key: "prevent_ingress_water_fumes", prompt: "Are suitable arrangements in place to prevent the ingress of water, fumes etc.?" },
        ],
      },
    ],
    signatures: [
      {
        key: "manager_authorisation",
        title: "Uplands Site Manager Authorisation",
        role: "Uplands Site Manager",
        action: "Authorised confined space permit issue",
        sortOrder: 10,
      },
      {
        key: "contractor_acceptance",
        title: "Contractor / Operative Acceptance",
        role: "Contractor / Operative",
        action: "Accepted confined space permit controls",
        sortOrder: 20,
      },
      {
        key: "contractor_completion",
        title: "Contractor / Operative Completion",
        role: "Contractor / Operative",
        action: "Confirmed confined space work completed and personnel withdrawn",
        sortOrder: 30,
      },
      {
        key: "manager_completion_acceptance",
        title: "Uplands Site Manager Acceptance of Completion",
        role: "Uplands Site Manager",
        action: "Accepted completion and closed confined space permit",
        sortOrder: 40,
      },
    ],
  },
  {
    id: "demolition",
    code: "UHSF21.07",
    title: "Demolition Permit",
    description: "Structured digital permit for demolition planning, service isolation, surveys, temporary works, protection and completion control.",
    registerCode: "UHSF21.0",
    version: "1",
    sortOrder: 80,
    sections: [
      {
        id: "planning-competence",
        title: "Planning / Competence Checks",
        description: "Confirm RAMS, emergency arrangements, supervision and demolition competence before work starts.",
        sortOrder: 10,
        questions: [
          { key: "rams_prepared_approved", prompt: "Has a Risk Assessment and Method Statement been prepared and approved?" },
          {
            key: "rams_briefing_understood",
            prompt: "Have all personnel been briefed on the contents of the RAMS and do they understand the task they are carrying out?",
          },
          { key: "emergency_procedures_prepared", prompt: "Have emergency procedures been prepared and posted?" },
          { key: "emergency_procedures_training", prompt: "Have all personnel involved been trained in the requirements of the emergency procedures?" },
          {
            key: "competent_supervisor",
            prompt: "Has a competent supervisor been appointed?",
            helpText: "Record the temporary works supervisor or demolition supervisor where applicable.",
          },
          {
            key: "operatives_trained_ccdo",
            prompt: "Are operatives suitably trained, including CCDO cards where required?",
          },
        ],
      },
      {
        id: "services-surveys",
        title: "Services / Surveys / Drawings",
        description: "Confirm services, drawings and demolition survey findings have been checked before demolition starts.",
        sortOrder: 20,
        questions: [
          {
            key: "services_located_verified",
            prompt: "Have all services been located and their positions verified?",
            helpText: "Record isolation or verification references where needed.",
          },
          { key: "drawings_available", prompt: "Are necessary drawings available?" },
          { key: "demolition_survey_completed", prompt: "Has a detailed demolition survey been carried out?" },
          {
            key: "survey_hazards_identified",
            prompt:
              "Has the survey identified possible hazards, including adjacent structures, confined spaces, voids, services, asbestos, dust, noise and vibration?",
            requiresCommentOn: ["YES"],
          },
        ],
      },
      {
        id: "site-protection-communication",
        title: "Site Protection / Communication",
        description: "Confirm barriers, signage, third-party communication and PPE/RPE controls are in place.",
        sortOrder: 30,
        questions: [
          { key: "suitable_protection_in_place", prompt: "Is suitable protection in place, such as fencing?" },
          { key: "suitable_signs_in_place", prompt: "Are suitable signs in place?" },
          { key: "third_parties_informed", prompt: "Have third parties been informed?" },
          { key: "adequate_ppe_rpe", prompt: "Have personnel been provided with adequate and suitable PPE / RPE?" },
        ],
      },
      {
        id: "temporary-works-waste",
        title: "Temporary Works / Waste Controls",
        description: "Confirm temporary works requirements, design approval and waste-removal arrangements.",
        sortOrder: 40,
        questions: [
          {
            key: "temporary_work_required",
            prompt: "Is temporary work required?",
            requiresCommentOn: ["YES"],
          },
          {
            key: "temporary_works_design_approved",
            prompt: "Has a design been completed and approved?",
          },
          { key: "waste_materials_removal", prompt: "Has suitable provision been made to remove waste materials?" },
        ],
      },
    ],
    signatures: [
      {
        key: "manager_authorisation",
        title: "Uplands Site Manager Authorisation",
        role: "Uplands Site Manager",
        action: "Authorised demolition permit issue",
        sortOrder: 10,
      },
      {
        key: "contractor_acceptance",
        title: "Contractor / Operative Acceptance",
        role: "Contractor / Operative",
        action: "Accepted demolition permit controls",
        sortOrder: 20,
      },
      {
        key: "contractor_completion",
        title: "Contractor / Operative Completion",
        role: "Contractor / Operative",
        action: "Confirmed demolition work completed",
        sortOrder: 30,
      },
      {
        key: "manager_completion_acceptance",
        title: "Uplands Site Manager Acceptance of Completion",
        role: "Uplands Site Manager",
        action: "Accepted completion and closed demolition permit",
        sortOrder: 40,
      },
    ],
  },
  {
    id: "temporary-works-load-strike",
    code: "UHSF23.7",
    title: "Temporary Works Permit to Load / Strike",
    description: "Structured digital permit for temporary works erection checks, TWC/TWS authorisation, loading controls and strike closure.",
    registerCode: "UHSF21.0",
    version: "1",
    sortOrder: 90,
    sections: [
      {
        id: "temporary-works-team",
        title: "Temporary Works Team",
        description: "Identify the temporary works coordinator, responsible site manager and competent subcontractor supervisor.",
        sortOrder: 10,
        questions: [
          {
            key: "authorising_temporary_works_coordinator",
            prompt: "Has the authorising temporary works coordinator been identified?",
            helpText: "Use the comment field to record the TWC/TWS name.",
          },
          {
            key: "site_manager_responsible",
            prompt: "Has the site manager responsible for temporary works erection been identified?",
            helpText: "Use the comment field to record the responsible site manager.",
          },
          {
            key: "competent_subcontractor_supervisor",
            prompt: "Has the competent subcontractor supervisor been identified?",
            helpText: "Use the comment field to record the supervisor name.",
          },
          {
            key: "operatives_suitably_trained",
            prompt: "Are operatives suitably trained?",
            helpText: "Record relevant cards or competency evidence where required.",
          },
        ],
      },
      {
        id: "drawings-method",
        title: "Drawings / Method Statement",
        description: "Confirm drawings, deviations, method statement and risk-assessment briefings are controlled.",
        sortOrder: 20,
        questions: [
          { key: "drawings_issued_to_supervisor", prompt: "Have the drawings been issued to the site supervisor?" },
          {
            key: "drawing_deviations_identified",
            prompt: "Are there any deviations from the drawings?",
            helpText: "If Yes, record what has changed.",
            requiresCommentOn: ["YES"],
          },
          { key: "method_statement_prepared", prompt: "Has a satisfactory method statement been prepared?" },
          {
            key: "risk_assessment_results_briefed",
            prompt: "Have personnel involved in, or likely to be affected by the work, been informed of the results of the risk assessments?",
          },
          {
            key: "method_statement_training",
            prompt: "Have all personnel involved in the work been trained in the requirements of the method statement?",
          },
        ],
      },
      {
        id: "emergency-site-controls",
        title: "Emergency / Site Controls",
        description: "Confirm emergency arrangements, service locations, protection, signage and third-party notifications.",
        sortOrder: 30,
        questions: [
          {
            key: "emergency_procedures_prepared_posted",
            prompt: "Have emergency procedures been prepared and posted?",
            helpText: "Record where the emergency procedures are posted.",
          },
          {
            key: "emergency_procedures_training",
            prompt: "Have all personnel involved been trained in the requirements of the emergency procedures?",
          },
          {
            key: "services_located_marked_protected",
            prompt: "Have all services been located and their positions verified, marked and protected?",
            helpText: "Record CAT scan, sub scan or existing drawing references where needed.",
          },
          { key: "suitable_protection_in_place", prompt: "Is suitable protection in place?", helpText: "For example fencing." },
          { key: "suitable_signs_in_place", prompt: "Are suitable signs in place?" },
          {
            key: "third_parties_informed",
            prompt: "Have third parties been informed?",
            helpText: "For example client awareness of risks such as noise.",
          },
        ],
      },
      {
        id: "load-strike-authorisation",
        title: "Load / Strike Authorisation",
        description: "Confirm temporary works are built to design and authorised before loading or striking.",
        sortOrder: 40,
        questions: [
          {
            key: "erected_to_design_final_inspection",
            prompt: "Has the temporary works been erected in accordance with the design and has a final inspection been carried out?",
          },
          {
            key: "twc_tws_checked_to_design",
            prompt: "Has the TWC / TWS checked that the temporary works are in accordance with the design details?",
          },
          {
            key: "loading_restraints_briefed",
            prompt: "Have restraints imposed on the loading of the temporary works been understood and passed to the site manager in charge?",
          },
          {
            key: "load_type_confirmed",
            prompt: "Has the authorised load type been confirmed?",
            helpText: "Record reinforcement, concrete, other or none in the comment field.",
          },
          {
            key: "strike_conditions_confirmed",
            prompt: "Have the conditions for striking or removing the temporary works been confirmed?",
          },
        ],
      },
    ],
    signatures: [
      {
        key: "manager_authorisation",
        title: "Uplands Site Manager Responsible for Temporary Works Erection Authorisation",
        role: "Uplands Site Manager",
        action: "Confirmed temporary works erection is ready for TWC/TWS checking",
        sortOrder: 10,
      },
      {
        key: "contractor_acceptance",
        title: "TWC / TWS Authorisation",
        role: "Temporary Works Coordinator / Supervisor",
        action: "Authorised temporary works loading controls",
        sortOrder: 20,
      },
      {
        key: "contractor_completion",
        title: "Contractor / Operative Completion",
        role: "Contractor / Operative",
        action: "Confirmed temporary works load / strike operation completed",
        sortOrder: 30,
      },
      {
        key: "manager_completion_acceptance",
        title: "Uplands Site Manager Acceptance of Completion",
        role: "Uplands Site Manager",
        action: "Accepted completion and closed temporary works permit",
        sortOrder: 40,
      },
    ],
  },
];
