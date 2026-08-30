INSERT INTO public.permit_templates (id, code, title, description, register_code, version, status, sort_order)
VALUES (
  'demolition',
  'UHSF21.07',
  'Demolition Permit',
  'Structured digital permit for demolition planning, service isolation, surveys, temporary works, protection and completion control.',
  'UHSF21.0',
  '1',
  'ACTIVE',
  80
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
    'demolition:planning-competence',
    'demolition',
    'Planning / Competence Checks',
    'Confirm RAMS, emergency arrangements, supervision and demolition competence before work starts.',
    10
  ),
  (
    'demolition:services-surveys',
    'demolition',
    'Services / Surveys / Drawings',
    'Confirm services, drawings and demolition survey findings have been checked before demolition starts.',
    20
  ),
  (
    'demolition:site-protection-communication',
    'demolition',
    'Site Protection / Communication',
    'Confirm barriers, signage, third-party communication and PPE/RPE controls are in place.',
    30
  ),
  (
    'demolition:temporary-works-waste',
    'demolition',
    'Temporary Works / Waste Controls',
    'Confirm temporary works requirements, design approval and waste-removal arrangements.',
    40
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;

INSERT INTO public.permit_template_questions (id, template_id, section_id, question_key, prompt, help_text, answer_type, requires_comment_on, sort_order)
VALUES
  (
    'demolition:rams_prepared_approved',
    'demolition',
    'demolition:planning-competence',
    'rams_prepared_approved',
    'Has a Risk Assessment and Method Statement been prepared and approved?',
    NULL,
    'YES_NO_NA',
    'NO',
    1
  ),
  (
    'demolition:rams_briefing_understood',
    'demolition',
    'demolition:planning-competence',
    'rams_briefing_understood',
    'Have all personnel been briefed on the contents of the RAMS and do they understand the task they are carrying out?',
    NULL,
    'YES_NO_NA',
    'NO',
    2
  ),
  (
    'demolition:emergency_procedures_prepared',
    'demolition',
    'demolition:planning-competence',
    'emergency_procedures_prepared',
    'Have emergency procedures been prepared and posted?',
    NULL,
    'YES_NO_NA',
    'NO',
    3
  ),
  (
    'demolition:emergency_procedures_training',
    'demolition',
    'demolition:planning-competence',
    'emergency_procedures_training',
    'Have all personnel involved been trained in the requirements of the emergency procedures?',
    NULL,
    'YES_NO_NA',
    'NO',
    4
  ),
  (
    'demolition:competent_supervisor',
    'demolition',
    'demolition:planning-competence',
    'competent_supervisor',
    'Has a competent supervisor been appointed?',
    'Record the temporary works supervisor or demolition supervisor where applicable.',
    'YES_NO_NA',
    'NO',
    5
  ),
  (
    'demolition:operatives_trained_ccdo',
    'demolition',
    'demolition:planning-competence',
    'operatives_trained_ccdo',
    'Are operatives suitably trained, including CCDO cards where required?',
    NULL,
    'YES_NO_NA',
    'NO',
    6
  ),
  (
    'demolition:services_located_verified',
    'demolition',
    'demolition:services-surveys',
    'services_located_verified',
    'Have all services been located and their positions verified?',
    'Record isolation or verification references where needed.',
    'YES_NO_NA',
    'NO',
    1
  ),
  (
    'demolition:drawings_available',
    'demolition',
    'demolition:services-surveys',
    'drawings_available',
    'Are necessary drawings available?',
    NULL,
    'YES_NO_NA',
    'NO',
    2
  ),
  (
    'demolition:demolition_survey_completed',
    'demolition',
    'demolition:services-surveys',
    'demolition_survey_completed',
    'Has a detailed demolition survey been carried out?',
    NULL,
    'YES_NO_NA',
    'NO',
    3
  ),
  (
    'demolition:survey_hazards_identified',
    'demolition',
    'demolition:services-surveys',
    'survey_hazards_identified',
    'Has the survey identified possible hazards, including adjacent structures, confined spaces, voids, services, asbestos, dust, noise and vibration?',
    NULL,
    'YES_NO_NA',
    'YES',
    4
  ),
  (
    'demolition:suitable_protection_in_place',
    'demolition',
    'demolition:site-protection-communication',
    'suitable_protection_in_place',
    'Is suitable protection in place, such as fencing?',
    NULL,
    'YES_NO_NA',
    'NO',
    1
  ),
  (
    'demolition:suitable_signs_in_place',
    'demolition',
    'demolition:site-protection-communication',
    'suitable_signs_in_place',
    'Are suitable signs in place?',
    NULL,
    'YES_NO_NA',
    'NO',
    2
  ),
  (
    'demolition:third_parties_informed',
    'demolition',
    'demolition:site-protection-communication',
    'third_parties_informed',
    'Have third parties been informed?',
    NULL,
    'YES_NO_NA',
    'NO',
    3
  ),
  (
    'demolition:adequate_ppe_rpe',
    'demolition',
    'demolition:site-protection-communication',
    'adequate_ppe_rpe',
    'Have personnel been provided with adequate and suitable PPE / RPE?',
    NULL,
    'YES_NO_NA',
    'NO',
    4
  ),
  (
    'demolition:temporary_work_required',
    'demolition',
    'demolition:temporary-works-waste',
    'temporary_work_required',
    'Is temporary work required?',
    NULL,
    'YES_NO_NA',
    'YES',
    1
  ),
  (
    'demolition:temporary_works_design_approved',
    'demolition',
    'demolition:temporary-works-waste',
    'temporary_works_design_approved',
    'Has a design been completed and approved?',
    NULL,
    'YES_NO_NA',
    'NO',
    2
  ),
  (
    'demolition:waste_materials_removal',
    'demolition',
    'demolition:temporary-works-waste',
    'waste_materials_removal',
    'Has suitable provision been made to remove waste materials?',
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
