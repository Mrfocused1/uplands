INSERT INTO public.permit_templates (id, code, title, description, register_code, version, status, sort_order)
VALUES (
  'mobile-tower-scaffold',
  'UHSF21.12',
  'Mobile Tower Scaffold Permit',
  'Structured digital permit for mobile tower scaffold erection, checking, use and closure.',
  'UHSF21.0',
  '1',
  'ACTIVE',
  30
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
    'mobile-tower-scaffold:planning-competence',
    'mobile-tower-scaffold',
    'Planning / Competence Checks',
    'Confirm RAMS, briefing, PASMA competence and supervision are in place before tower use.',
    10
  ),
  (
    'mobile-tower-scaffold:tower-system',
    'mobile-tower-scaffold',
    'Tower System / Components',
    'Confirm the tower system, components and warning arrangements meet Uplands requirements.',
    20
  ),
  (
    'mobile-tower-scaffold:site-conditions',
    'mobile-tower-scaffold',
    'Site Conditions',
    'Confirm weather, ground and lighting conditions are suitable for mobile tower work.',
    30
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;

INSERT INTO public.permit_template_questions (id, template_id, section_id, question_key, prompt, help_text, answer_type, requires_comment_on, sort_order)
VALUES
  (
    'mobile-tower-scaffold:rams_prepared_approved',
    'mobile-tower-scaffold',
    'mobile-tower-scaffold:planning-competence',
    'rams_prepared_approved',
    'Has a Risk Assessment and Method Statement been prepared and approved?',
    NULL,
    'YES_NO_NA',
    'NO',
    1
  ),
  (
    'mobile-tower-scaffold:rams_briefing_understood',
    'mobile-tower-scaffold',
    'mobile-tower-scaffold:planning-competence',
    'rams_briefing_understood',
    'Have all personnel been briefed on the contents of the RAMS and do they understand the task being carried out?',
    NULL,
    'YES_NO_NA',
    'NO',
    2
  ),
  (
    'mobile-tower-scaffold:pasma_card_produced',
    'mobile-tower-scaffold',
    'mobile-tower-scaffold:planning-competence',
    'pasma_card_produced',
    'Has the operative produced the relevant PASMA card for erecting or checking this mobile tower?',
    NULL,
    'YES_NO_NA',
    'NO',
    3
  ),
  (
    'mobile-tower-scaffold:competent_supervisor',
    'mobile-tower-scaffold',
    'mobile-tower-scaffold:planning-competence',
    'competent_supervisor',
    'Has a competent supervisor been appointed?',
    'Use the comment field to record who has been appointed.',
    'YES_NO_NA',
    'NO',
    4
  ),
  (
    'mobile-tower-scaffold:advanced_guard_rail_system',
    'mobile-tower-scaffold',
    'mobile-tower-scaffold:tower-system',
    'advanced_guard_rail_system',
    'Is the mobile tower an Advanced Guard Rail (AGR) system in line with Uplands policy?',
    NULL,
    'YES_NO_NA',
    'NO',
    1
  ),
  (
    'mobile-tower-scaffold:non_agr_reason_recorded',
    'mobile-tower-scaffold',
    'mobile-tower-scaffold:tower-system',
    'non_agr_reason_recorded',
    'If the mobile tower is not an AGR system, has the reason been recorded?',
    'Record if AGR is not required due to insufficient height, unavailable from hire centre, or another reason.',
    'YES_NO_NA',
    'NO',
    2
  ),
  (
    'mobile-tower-scaffold:components_present_assembled',
    'mobile-tower-scaffold',
    'mobile-tower-scaffold:tower-system',
    'components_present_assembled',
    'Are all components present and assembled, including guard rails, toe boards, bracing, rakers and wheels?',
    NULL,
    'YES_NO_NA',
    'NO',
    3
  ),
  (
    'mobile-tower-scaffold:signs_barriers_below',
    'mobile-tower-scaffold',
    'mobile-tower-scaffold:tower-system',
    'signs_barriers_below',
    'Have signs and barriers been erected to warn persons below?',
    NULL,
    'YES_NO_NA',
    'NO',
    4
  ),
  (
    'mobile-tower-scaffold:adverse_weather_absent',
    'mobile-tower-scaffold',
    'mobile-tower-scaffold:site-conditions',
    'adverse_weather_absent',
    'Are adverse weather conditions absent and not forecast during the permit period?',
    NULL,
    'YES_NO_NA',
    'NO',
    1
  ),
  (
    'mobile-tower-scaffold:ground_conditions_suitable',
    'mobile-tower-scaffold',
    'mobile-tower-scaffold:site-conditions',
    'ground_conditions_suitable',
    'Are ground conditions suitable?',
    NULL,
    'YES_NO_NA',
    'NO',
    2
  ),
  (
    'mobile-tower-scaffold:lighting_conditions_suitable',
    'mobile-tower-scaffold',
    'mobile-tower-scaffold:site-conditions',
    'lighting_conditions_suitable',
    'Are lighting conditions suitable?',
    NULL,
    'YES_NO_NA',
    'NO',
    3
  ),
  (
    'mobile-tower-scaffold:shift_or_scafftag_control',
    'mobile-tower-scaffold',
    'mobile-tower-scaffold:site-conditions',
    'shift_or_scafftag_control',
    'Is this permit limited to one shift unless a daily updated scaff tag system is in place?',
    'Close the permit when the mobile tower is taken out of use.',
    'YES_NO_NA',
    'NO',
    4
  )
ON CONFLICT (template_id, question_key) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  prompt = EXCLUDED.prompt,
  help_text = EXCLUDED.help_text,
  answer_type = EXCLUDED.answer_type,
  requires_comment_on = EXCLUDED.requires_comment_on,
  sort_order = EXCLUDED.sort_order;
