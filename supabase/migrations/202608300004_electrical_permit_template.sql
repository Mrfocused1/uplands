INSERT INTO public.permit_templates (id, code, title, description, register_code, version, status, sort_order)
VALUES (
  'electrical',
  'UHSF21.06',
  'Electrical Permit',
  'Structured digital permit for controlled electrical works, isolation declarations and completion acceptance.',
  'UHSF21.0',
  '1',
  'ACTIVE',
  20
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
    'electrical:precautions',
    'electrical',
    'Precautions',
    'Confirm RAMS, supervision, training and access controls are in place before electrical work starts.',
    10
  ),
  (
    'electrical:uplands-electrician-declaration',
    'electrical',
    'Uplands Site Electrician Declaration',
    'Record the safe-isolation declaration before the permit is authorised.',
    20
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;

INSERT INTO public.permit_template_questions (id, template_id, section_id, question_key, prompt, help_text, answer_type, requires_comment_on, sort_order)
VALUES
  (
    'electrical:rams_prepared_approved',
    'electrical',
    'electrical:precautions',
    'rams_prepared_approved',
    'Has a Risk Assessment and Method Statement been prepared and approved?',
    NULL,
    'YES_NO_NA',
    'NO',
    1
  ),
  (
    'electrical:rams_briefing_understood',
    'electrical',
    'electrical:precautions',
    'rams_briefing_understood',
    'Have all personnel been briefed on the contents of the RAMS and do they understand the task being carried out?',
    NULL,
    'YES_NO_NA',
    'NO',
    2
  ),
  (
    'electrical:emergency_procedures_prepared',
    'electrical',
    'electrical:precautions',
    'emergency_procedures_prepared',
    'Have emergency procedures been prepared and posted?',
    NULL,
    'YES_NO_NA',
    'NO',
    3
  ),
  (
    'electrical:emergency_procedures_training',
    'electrical',
    'electrical:precautions',
    'emergency_procedures_training',
    'Have all personnel involved been trained in the requirements of the emergency procedures?',
    NULL,
    'YES_NO_NA',
    'NO',
    4
  ),
  (
    'electrical:competent_supervisor',
    'electrical',
    'electrical:precautions',
    'competent_supervisor',
    'Has a competent supervisor been appointed?',
    'Use the comment field to record who has been appointed.',
    'YES_NO_NA',
    'NO',
    5
  ),
  (
    'electrical:operatives_trained',
    'electrical',
    'electrical:precautions',
    'operatives_trained',
    'Are operatives suitably trained?',
    NULL,
    'YES_NO_NA',
    'NO',
    6
  ),
  (
    'electrical:prevent_unauthorised_access',
    'electrical',
    'electrical:precautions',
    'prevent_unauthorised_access',
    'Are arrangements in place to prevent unauthorised access?',
    NULL,
    'YES_NO_NA',
    'NO',
    7
  ),
  (
    'electrical:control_panels_locked_off',
    'electrical',
    'electrical:precautions',
    'control_panels_locked_off',
    'Are control panels locked off?',
    NULL,
    'YES_NO_NA',
    'NO',
    8
  ),
  (
    'electrical:work_to_be_carried_out_recorded',
    'electrical',
    'electrical:uplands-electrician-declaration',
    'work_to_be_carried_out_recorded',
    'Has the electrical work to be carried out been recorded?',
    'Use the comment field for the apparatus or work details where needed.',
    'YES_NO_NA',
    'NO',
    1
  ),
  (
    'electrical:apparatus_safe_to_work_on',
    'electrical',
    'electrical:uplands-electrician-declaration',
    'apparatus_safe_to_work_on',
    'Is it safe to work on the apparatus required for the work detailed above?',
    'Use the comment field to identify the apparatus.',
    'YES_NO_NA',
    'NO',
    2
  ),
  (
    'electrical:other_apparatus_dangerous',
    'electrical',
    'electrical:uplands-electrician-declaration',
    'other_apparatus_dangerous',
    'Have all other apparatus been regarded as dangerous?',
    NULL,
    'YES_NO_NA',
    'NO',
    3
  ),
  (
    'electrical:apparatus_dead_and_isolated',
    'electrical',
    'electrical:uplands-electrician-declaration',
    'apparatus_dead_and_isolated',
    'Is the apparatus dead and isolated from supply, with live conductors isolated at the required points?',
    'Use the comment field to record isolation points.',
    'YES_NO_NA',
    'NO',
    4
  ),
  (
    'electrical:circuit_main_earths_applied',
    'electrical',
    'electrical:uplands-electrician-declaration',
    'circuit_main_earths_applied',
    'Have circuit main earths been applied to the apparatus where required?',
    'Use the comment field to record earthing points.',
    'YES_NO_NA',
    'NO',
    5
  ),
  (
    'electrical:danger_notices_posted',
    'electrical',
    'electrical:uplands-electrician-declaration',
    'danger_notices_posted',
    'Have danger notices been posted at the required locations?',
    'Use the comment field to record where notices are posted.',
    'YES_NO_NA',
    'NO',
    6
  )
ON CONFLICT (template_id, question_key) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  prompt = EXCLUDED.prompt,
  help_text = EXCLUDED.help_text,
  answer_type = EXCLUDED.answer_type,
  requires_comment_on = EXCLUDED.requires_comment_on,
  sort_order = EXCLUDED.sort_order;
