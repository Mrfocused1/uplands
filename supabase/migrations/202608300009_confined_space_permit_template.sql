INSERT INTO public.permit_templates (id, code, title, description, register_code, version, status, sort_order)
VALUES (
  'confined-space',
  'UHSF21.04',
  'Confined Space Permit',
  'Structured digital permit for confined-space entry, rescue planning, atmosphere controls, supervision and closure.',
  'UHSF21.0',
  '1',
  'ACTIVE',
  70
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
    'confined-space:planning-competence',
    'confined-space',
    'Planning / Competence Checks',
    'Confirm RAMS, briefing, competent supervision and confined-space certification before entry.',
    10
  ),
  (
    'confined-space:atmosphere-ventilation',
    'confined-space',
    'Atmosphere / Ventilation Controls',
    'Confirm ventilation, oxygen or gas testing, communications and access arrangements are suitable.',
    20
  ),
  (
    'confined-space:rescue-emergency',
    'confined-space',
    'Rescue / Emergency Readiness',
    'Confirm external observation, rescue arrangements, first aid and escape equipment before entry.',
    30
  ),
  (
    'confined-space:site-conditions',
    'confined-space',
    'Site Conditions / Additional Controls',
    'Confirm infection, lighting and ingress controls are suitable for the confined-space task.',
    40
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;

INSERT INTO public.permit_template_questions (id, template_id, section_id, question_key, prompt, help_text, answer_type, requires_comment_on, sort_order)
VALUES
  (
    'confined-space:rams_prepared_approved',
    'confined-space',
    'confined-space:planning-competence',
    'rams_prepared_approved',
    'Has a Risk Assessment and Method Statement been prepared and approved?',
    NULL,
    'YES_NO_NA',
    'NO',
    1
  ),
  (
    'confined-space:rams_briefing_understood',
    'confined-space',
    'confined-space:planning-competence',
    'rams_briefing_understood',
    'Have all personnel been briefed on the contents of the RAMS and do they understand the task being carried out?',
    NULL,
    'YES_NO_NA',
    'NO',
    2
  ),
  (
    'confined-space:emergency_procedures_rescue_plan',
    'confined-space',
    'confined-space:planning-competence',
    'emergency_procedures_rescue_plan',
    'Have emergency procedures been prepared and posted, including a rescue plan?',
    NULL,
    'YES_NO_NA',
    'NO',
    3
  ),
  (
    'confined-space:emergency_procedures_training',
    'confined-space',
    'confined-space:planning-competence',
    'emergency_procedures_training',
    'Have all personnel involved been trained in the requirements of the emergency procedures?',
    NULL,
    'YES_NO_NA',
    'NO',
    4
  ),
  (
    'confined-space:competent_supervisor',
    'confined-space',
    'confined-space:planning-competence',
    'competent_supervisor',
    'Has a competent supervisor been appointed?',
    'Use the comment field to record who has been appointed.',
    'YES_NO_NA',
    'NO',
    5
  ),
  (
    'confined-space:confined_space_certification',
    'confined-space',
    'confined-space:planning-competence',
    'confined_space_certification',
    'Are operatives suitably trained and competent, including holding confined-space entry certification?',
    NULL,
    'YES_NO_NA',
    'NO',
    6
  ),
  (
    'confined-space:emergency_services_contact_required',
    'confined-space',
    'confined-space:atmosphere-ventilation',
    'emergency_services_contact_required',
    'Do emergency services need to be contacted?',
    NULL,
    'YES_NO_NA',
    'YES',
    1
  ),
  (
    'confined-space:ventilation_adequate',
    'confined-space',
    'confined-space:atmosphere-ventilation',
    'ventilation_adequate',
    'Is ventilation adequate?',
    'If not, record whether ventilation calculations have been carried out and what suitable system is provided.',
    'YES_NO_NA',
    'NO',
    2
  ),
  (
    'confined-space:oxygen_gas_tests_required',
    'confined-space',
    'confined-space:atmosphere-ventilation',
    'oxygen_gas_tests_required',
    'Are oxygen or gas tests needed?',
    'Record the test arrangement, frequency and responsible person where required.',
    'YES_NO_NA',
    'YES',
    3
  ),
  (
    'confined-space:suitable_access_egress',
    'confined-space',
    'confined-space:atmosphere-ventilation',
    'suitable_access_egress',
    'Is there suitable access and egress?',
    NULL,
    'YES_NO_NA',
    'NO',
    4
  ),
  (
    'confined-space:prevent_unauthorised_access',
    'confined-space',
    'confined-space:atmosphere-ventilation',
    'prevent_unauthorised_access',
    'Are arrangements in place to prevent unauthorised access?',
    NULL,
    'YES_NO_NA',
    'NO',
    5
  ),
  (
    'confined-space:adequate_communications',
    'confined-space',
    'confined-space:atmosphere-ventilation',
    'adequate_communications',
    'Are adequate communications provided to ensure the continued safety of persons in the confined space?',
    NULL,
    'YES_NO_NA',
    'NO',
    6
  ),
  (
    'confined-space:observer_outside_space',
    'confined-space',
    'confined-space:rescue-emergency',
    'observer_outside_space',
    'Is there an observer outside the confined space?',
    NULL,
    'YES_NO_NA',
    'NO',
    1
  ),
  (
    'confined-space:rescue_provisions_available',
    'confined-space',
    'confined-space:rescue-emergency',
    'rescue_provisions_available',
    'Are there provisions for rescue?',
    NULL,
    'YES_NO_NA',
    'NO',
    2
  ),
  (
    'confined-space:employees_trained_in_rescue',
    'confined-space',
    'confined-space:rescue-emergency',
    'employees_trained_in_rescue',
    'Are employees trained in rescue?',
    NULL,
    'YES_NO_NA',
    'NO',
    3
  ),
  (
    'confined-space:first_aider_standby',
    'confined-space',
    'confined-space:rescue-emergency',
    'first_aider_standby',
    'Is a first aider on standby?',
    NULL,
    'YES_NO_NA',
    'NO',
    4
  ),
  (
    'confined-space:ten_minute_escape_set',
    'confined-space',
    'confined-space:rescue-emergency',
    'ten_minute_escape_set',
    'Is a ten minute escape set available?',
    NULL,
    'YES_NO_NA',
    'NO',
    5
  ),
  (
    'confined-space:suitable_ppe_rescue_kits',
    'confined-space',
    'confined-space:rescue-emergency',
    'suitable_ppe_rescue_kits',
    'Have personnel been provided with adequate and suitable PPE, including rescue kits?',
    NULL,
    'YES_NO_NA',
    'NO',
    6
  ),
  (
    'confined-space:infection_precautions_investigated',
    'confined-space',
    'confined-space:site-conditions',
    'infection_precautions_investigated',
    'Have precautions to prevent infection been investigated?',
    NULL,
    'YES_NO_NA',
    'NO',
    1
  ),
  (
    'confined-space:adequate_lighting',
    'confined-space',
    'confined-space:site-conditions',
    'adequate_lighting',
    'Is there adequate lighting?',
    NULL,
    'YES_NO_NA',
    'NO',
    2
  ),
  (
    'confined-space:prevent_ingress_water_fumes',
    'confined-space',
    'confined-space:site-conditions',
    'prevent_ingress_water_fumes',
    'Are suitable arrangements in place to prevent the ingress of water, fumes etc.?',
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
