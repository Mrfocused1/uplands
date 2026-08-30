INSERT INTO public.permit_templates (id, code, title, description, register_code, version, status, sort_order)
VALUES (
  'permit-to-dig-break-ground',
  'UHSF21.03',
  'Permit to Dig / Break Ground',
  'Structured digital permit for breaking ground, utility-plan checks, CAT scanning, service exposure and briefing controls.',
  'UHSF21.0',
  '1',
  'ACTIVE',
  60
)
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  register_code = EXCLUDED.register_code,
  version = EXCLUDED.version,
  status = EXCLUDED.status,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

INSERT INTO public.permit_template_sections (id, template_id, title, description, sort_order)
VALUES
  (
    'permit-to-dig-break-ground:plans-scanning',
    'permit-to-dig-break-ground',
    'Plans / CAT Scanning',
    'Confirm utility information, scanning records and service-location controls before breaking ground.',
    10
  ),
  (
    'permit-to-dig-break-ground:services-ground-controls',
    'permit-to-dig-break-ground',
    'Services / Ground Controls',
    'Confirm known services are traced, marked and controlled before mechanical work starts.',
    20
  ),
  (
    'permit-to-dig-break-ground:rams-competence',
    'permit-to-dig-break-ground',
    'RAMS / Competence',
    'Confirm the task has suitable RAMS, briefing and competent personnel before work starts.',
    30
  ),
  (
    'permit-to-dig-break-ground:permit-conditions',
    'permit-to-dig-break-ground',
    'Permit Conditions',
    'Confirm the permit-specific stop-work rules have been communicated to the work party.',
    40
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;

INSERT INTO public.permit_template_questions (id, template_id, section_id, question_key, prompt, help_text, answer_type, requires_comment_on, sort_order)
VALUES
  (
    'permit-to-dig-break-ground:utility_plans_provided',
    'permit-to-dig-break-ground',
    'permit-to-dig-break-ground:plans-scanning',
    'utility_plans_provided',
    'Have all utility and third-party plans / drawings been provided?',
    NULL,
    'YES_NO_NA',
    'NO',
    1
  ),
  (
    'permit-to-dig-break-ground:cat_scan_completed_recorded',
    'permit-to-dig-break-ground',
    'permit-to-dig-break-ground:plans-scanning',
    'cat_scan_completed_recorded',
    'Has a CAT scan of the area taken place and been recorded?',
    'Record scan date, area covered and reference details where needed.',
    'YES_NO_NA',
    'NO',
    2
  ),
  (
    'permit-to-dig-break-ground:cat_scans_every_300mm',
    'permit-to-dig-break-ground',
    'permit-to-dig-break-ground:plans-scanning',
    'cat_scans_every_300mm',
    'If excavation work is being carried out, will CAT scans be repeated at least every 300mm of depth?',
    NULL,
    'YES_NO_NA',
    'NO',
    3
  ),
  (
    'permit-to-dig-break-ground:cat_genny_calibrated',
    'permit-to-dig-break-ground',
    'permit-to-dig-break-ground:plans-scanning',
    'cat_genny_calibrated',
    'Has the CAT and Genny equipment been calibrated in the last 12 months?',
    'A copy of the calibration certificate is required for inspection and all pre-user checks must be carried out.',
    'YES_NO_NA',
    'NO',
    4
  ),
  (
    'permit-to-dig-break-ground:known_services_traced_marked',
    'permit-to-dig-break-ground',
    'permit-to-dig-break-ground:services-ground-controls',
    'known_services_traced_marked',
    'Have all known services been traced and marked out on the ground?',
    'If this is No, do not proceed.',
    'YES_NO_NA',
    'NO',
    1
  ),
  (
    'permit-to-dig-break-ground:gas_electric_within_500mm',
    'permit-to-dig-break-ground',
    'permit-to-dig-break-ground:services-ground-controls',
    'gas_electric_within_500mm',
    'Have electricity or gas services been identified as present within 500mm of the dig in any direction?',
    'If Yes, services must be fully exposed by hand dig before machinery starts. No breakers or mechanical equipment are to be used.',
    'YES_NO_NA',
    'YES',
    2
  ),
  (
    'permit-to-dig-break-ground:hand_dig_rule_briefed',
    'permit-to-dig-break-ground',
    'permit-to-dig-break-ground:services-ground-controls',
    'hand_dig_rule_briefed',
    'Where services are within 500mm, has the hand-dig and no-breaker restriction been briefed and accepted?',
    NULL,
    'YES_NO_NA',
    'NO',
    3
  ),
  (
    'permit-to-dig-break-ground:suitable_sufficient_rams',
    'permit-to-dig-break-ground',
    'permit-to-dig-break-ground:rams-competence',
    'suitable_sufficient_rams',
    'Are there suitable and sufficient RAMS in place for this operation?',
    NULL,
    'YES_NO_NA',
    'NO',
    1
  ),
  (
    'permit-to-dig-break-ground:personnel_plant_operator_briefed',
    'permit-to-dig-break-ground',
    'permit-to-dig-break-ground:rams-competence',
    'personnel_plant_operator_briefed',
    'Have all personnel, including the plant operator, been briefed on the RAMS?',
    NULL,
    'YES_NO_NA',
    'NO',
    2
  ),
  (
    'permit-to-dig-break-ground:personnel_competent',
    'permit-to-dig-break-ground',
    'permit-to-dig-break-ground:rams-competence',
    'personnel_competent',
    'Are all personnel competent?',
    NULL,
    'YES_NO_NA',
    'NO',
    3
  ),
  (
    'permit-to-dig-break-ground:emergency_first_aid_in_place',
    'permit-to-dig-break-ground',
    'permit-to-dig-break-ground:rams-competence',
    'emergency_first_aid_in_place',
    'Are emergency procedures and first aid provisions in place?',
    NULL,
    'YES_NO_NA',
    'NO',
    4
  ),
  (
    'permit-to-dig-break-ground:permit_conditions_briefed',
    'permit-to-dig-break-ground',
    'permit-to-dig-break-ground:permit-conditions',
    'permit_conditions_briefed',
    'Have all conditions and control measures of this permit been briefed to all operatives?',
    NULL,
    'YES_NO_NA',
    'NO',
    1
  ),
  (
    'permit-to-dig-break-ground:stop_if_services_encased',
    'permit-to-dig-break-ground',
    'permit-to-dig-break-ground:permit-conditions',
    'stop_if_services_encased',
    'Has the team been instructed to stop work immediately if gas or electricity services are found encased in concrete, with the service provider and Uplands site manager informed?',
    NULL,
    'YES_NO_NA',
    'NO',
    2
  ),
  (
    'permit-to-dig-break-ground:stop_if_foundations_encased',
    'permit-to-dig-break-ground',
    'permit-to-dig-break-ground:permit-conditions',
    'stop_if_foundations_encased',
    'Has the team been instructed to stop work immediately if foundations are found encased in concrete or isolated until the Uplands site manager confirms conditions are adhered to?',
    NULL,
    'YES_NO_NA',
    'NO',
    3
  )
ON CONFLICT (id) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_key = EXCLUDED.question_key,
  prompt = EXCLUDED.prompt,
  help_text = EXCLUDED.help_text,
  answer_type = EXCLUDED.answer_type,
  requires_comment_on = EXCLUDED.requires_comment_on,
  sort_order = EXCLUDED.sort_order;
