INSERT INTO public.permit_templates (id, code, title, description, register_code, version, status, sort_order)
VALUES (
  'cherry-picker-star-10',
  'UHSF21.05',
  'Cherry Picker / Star 10 Permit',
  'Structured digital permit for cherry picker and Star 10 plant use, rescue planning and completion control.',
  'UHSF21.0',
  '1',
  'ACTIVE',
  40
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
    'cherry-picker-star-10:planning-competence',
    'cherry-picker-star-10',
    'Planning / Competence Checks',
    'Confirm RAMS, briefing, IPAF competence, rescue planning and supervision are in place before plant use.',
    10
  ),
  (
    'cherry-picker-star-10:plant-records',
    'cherry-picker-star-10',
    'Plant / Harness Records',
    'Confirm statutory plant records and harness inspections are current and filed before work starts.',
    20
  ),
  (
    'cherry-picker-star-10:site-controls',
    'cherry-picker-star-10',
    'Site Controls / Conditions',
    'Confirm the exclusion zone, weather, ground and lighting conditions are suitable for MEWP work.',
    30
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;

INSERT INTO public.permit_template_questions (id, template_id, section_id, question_key, prompt, help_text, answer_type, requires_comment_on, sort_order)
VALUES
  (
    'cherry-picker-star-10:rams_prepared_approved',
    'cherry-picker-star-10',
    'cherry-picker-star-10:planning-competence',
    'rams_prepared_approved',
    'Has a Risk Assessment and Method Statement been prepared and approved?',
    NULL,
    'YES_NO_NA',
    'NO',
    1
  ),
  (
    'cherry-picker-star-10:rams_briefing_understood',
    'cherry-picker-star-10',
    'cherry-picker-star-10:planning-competence',
    'rams_briefing_understood',
    'Have all personnel been briefed on the contents of the RAMS and do they understand the task being carried out?',
    NULL,
    'YES_NO_NA',
    'NO',
    2
  ),
  (
    'cherry-picker-star-10:ipaf_card_produced',
    'cherry-picker-star-10',
    'cherry-picker-star-10:planning-competence',
    'ipaf_card_produced',
    'Have the operatives produced the relevant IPAF card for using this plant?',
    NULL,
    'YES_NO_NA',
    'NO',
    3
  ),
  (
    'cherry-picker-star-10:rescue_plan_in_place',
    'cherry-picker-star-10',
    'cherry-picker-star-10:planning-competence',
    'rescue_plan_in_place',
    'Is a rescue plan in place?',
    'Use the comment field to name the person responsible for executing the plan.',
    'YES_NO_NA',
    'NO',
    4
  ),
  (
    'cherry-picker-star-10:rescue_plan_briefed',
    'cherry-picker-star-10',
    'cherry-picker-star-10:planning-competence',
    'rescue_plan_briefed',
    'Have all operatives been briefed on the rescue plan and how to execute it?',
    NULL,
    'YES_NO_NA',
    'NO',
    5
  ),
  (
    'cherry-picker-star-10:competent_supervisor',
    'cherry-picker-star-10',
    'cherry-picker-star-10:planning-competence',
    'competent_supervisor',
    'Has a competent appointed supervisor been identified?',
    'Use the comment field to record who has been appointed.',
    'YES_NO_NA',
    'NO',
    6
  ),
  (
    'cherry-picker-star-10:thorough_examination_certificate',
    'cherry-picker-star-10',
    'cherry-picker-star-10:plant-records',
    'thorough_examination_certificate',
    'Is an up-to-date Thorough Examination Certificate filed in Folder 2?',
    NULL,
    'YES_NO_NA',
    'NO',
    1
  ),
  (
    'cherry-picker-star-10:harness_inspection_records',
    'cherry-picker-star-10',
    'cherry-picker-star-10:plant-records',
    'harness_inspection_records',
    'Have Harness Inspection Records been provided and filed in Folder 2?',
    NULL,
    'YES_NO_NA',
    'NO',
    2
  ),
  (
    'cherry-picker-star-10:exclusion_zone_below',
    'cherry-picker-star-10',
    'cherry-picker-star-10:site-controls',
    'exclusion_zone_below',
    'Have signs and barriers been erected to form a suitable and sufficient exclusion zone beneath the area of work?',
    NULL,
    'YES_NO_NA',
    'NO',
    1
  ),
  (
    'cherry-picker-star-10:adverse_weather_present',
    'cherry-picker-star-10',
    'cherry-picker-star-10:site-controls',
    'adverse_weather_present',
    'Are adverse weather conditions present or forecast?',
    NULL,
    'YES_NO_NA',
    'YES',
    2
  ),
  (
    'cherry-picker-star-10:ground_conditions_suitable',
    'cherry-picker-star-10',
    'cherry-picker-star-10:site-controls',
    'ground_conditions_suitable',
    'Are ground conditions suitable?',
    NULL,
    'YES_NO_NA',
    'NO',
    3
  ),
  (
    'cherry-picker-star-10:lighting_conditions_suitable',
    'cherry-picker-star-10',
    'cherry-picker-star-10:site-controls',
    'lighting_conditions_suitable',
    'Are lighting conditions suitable?',
    NULL,
    'YES_NO_NA',
    'NO',
    4
  ),
  (
    'cherry-picker-star-10:one_shift_validity',
    'cherry-picker-star-10',
    'cherry-picker-star-10:site-controls',
    'one_shift_validity',
    'Is this permit limited to one shift, with a new permit issued and controls rechecked if work continues onto another shift?',
    NULL,
    'YES_NO_NA',
    'NO',
    5
  )
ON CONFLICT (template_id, question_key) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  prompt = EXCLUDED.prompt,
  help_text = EXCLUDED.help_text,
  answer_type = EXCLUDED.answer_type,
  requires_comment_on = EXCLUDED.requires_comment_on,
  sort_order = EXCLUDED.sort_order;
