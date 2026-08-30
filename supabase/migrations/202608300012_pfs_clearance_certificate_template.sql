INSERT INTO public.permit_templates (id, code, title, description, register_code, version, status, sort_order)
VALUES (
  'pfs-clearance-certificate',
  'UHSF21.11',
  'PFS Clearance Certificate',
  'Structured digital clearance certificate for PFS task risk level, RAMS checks, operative briefing, hazards and daily clearance control.',
  'UHSF21.0',
  '1',
  'ACTIVE',
  100
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
    'pfs-clearance-certificate:task-scope',
    'pfs-clearance-certificate',
    'Task Scope / Risk Level',
    'Record the task risk level, description and number of workers involved before clearance is approved.',
    10
  ),
  (
    'pfs-clearance-certificate:rams-emergency-competence',
    'pfs-clearance-certificate',
    'RAMS / Emergency / Competence',
    'Confirm RAMS, emergency procedures, supervision and operative competence before work starts.',
    20
  ),
  (
    'pfs-clearance-certificate:additional-hazards',
    'pfs-clearance-certificate',
    'Additional Hazards / Precautions',
    'Record additional hazards and confirm a new clearance certificate will be raised if conditions change.',
    30
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;

INSERT INTO public.permit_template_questions (id, template_id, section_id, question_key, prompt, help_text, answer_type, requires_comment_on, sort_order)
VALUES
  (
    'pfs-clearance-certificate:task_risk_level_recorded',
    'pfs-clearance-certificate',
    'pfs-clearance-certificate:task-scope',
    'task_risk_level_recorded',
    'Has the task risk level been recorded?',
    'Record Low, Medium or High in the comment field.',
    'YES_NO_NA',
    'YES',
    1
  ),
  (
    'pfs-clearance-certificate:task_description_sufficient',
    'pfs-clearance-certificate',
    'pfs-clearance-certificate:task-scope',
    'task_description_sufficient',
    'Has the task description been recorded in enough detail for today''s work?',
    'Use the permit description field for the task description.',
    'YES_NO_NA',
    'NO',
    2
  ),
  (
    'pfs-clearance-certificate:number_workers_recorded',
    'pfs-clearance-certificate',
    'pfs-clearance-certificate:task-scope',
    'number_workers_recorded',
    'Has the number of workers involved been recorded?',
    'Record the number of workers in the comment field.',
    'YES_NO_NA',
    'YES',
    3
  ),
  (
    'pfs-clearance-certificate:rams_prepared_approved',
    'pfs-clearance-certificate',
    'pfs-clearance-certificate:rams-emergency-competence',
    'rams_prepared_approved',
    'Has a Risk Assessment and Method Statement been prepared and approved?',
    NULL,
    'YES_NO_NA',
    'NO',
    1
  ),
  (
    'pfs-clearance-certificate:rams_briefing_understood',
    'pfs-clearance-certificate',
    'pfs-clearance-certificate:rams-emergency-competence',
    'rams_briefing_understood',
    'Have all personnel been briefed on the contents of the RAMS and do they understand the task they are carrying out?',
    NULL,
    'YES_NO_NA',
    'NO',
    2
  ),
  (
    'pfs-clearance-certificate:emergency_procedures_prepared_posted',
    'pfs-clearance-certificate',
    'pfs-clearance-certificate:rams-emergency-competence',
    'emergency_procedures_prepared_posted',
    'Have emergency procedures been prepared and posted?',
    NULL,
    'YES_NO_NA',
    'NO',
    3
  ),
  (
    'pfs-clearance-certificate:emergency_procedures_training',
    'pfs-clearance-certificate',
    'pfs-clearance-certificate:rams-emergency-competence',
    'emergency_procedures_training',
    'Have all personnel involved been trained in the requirements of the emergency procedures?',
    NULL,
    'YES_NO_NA',
    'NO',
    4
  ),
  (
    'pfs-clearance-certificate:competent_supervisor',
    'pfs-clearance-certificate',
    'pfs-clearance-certificate:rams-emergency-competence',
    'competent_supervisor',
    'Has a competent supervisor been appointed?',
    'Use the comment field to record who has been appointed.',
    'YES_NO_NA',
    'NO',
    5
  ),
  (
    'pfs-clearance-certificate:operatives_suitably_trained',
    'pfs-clearance-certificate',
    'pfs-clearance-certificate:rams-emergency-competence',
    'operatives_suitably_trained',
    'Are operatives suitably trained?',
    NULL,
    'YES_NO_NA',
    'NO',
    6
  ),
  (
    'pfs-clearance-certificate:protective_clothing_equipment',
    'pfs-clearance-certificate',
    'pfs-clearance-certificate:rams-emergency-competence',
    'protective_clothing_equipment',
    'Has the appropriate protective clothing and equipment been identified and provided?',
    NULL,
    'YES_NO_NA',
    'NO',
    7
  ),
  (
    'pfs-clearance-certificate:additional_hazards_identified',
    'pfs-clearance-certificate',
    'pfs-clearance-certificate:additional-hazards',
    'additional_hazards_identified',
    'Have any additional hazards beyond those in the RAMS been identified today?',
    'List additional hazards in the comment field where applicable.',
    'YES_NO_NA',
    'YES',
    1
  ),
  (
    'pfs-clearance-certificate:additional_precautions_recorded',
    'pfs-clearance-certificate',
    'pfs-clearance-certificate:additional-hazards',
    'additional_precautions_recorded',
    'Have precautions for any additional hazards been recorded and briefed?',
    NULL,
    'YES_NO_NA',
    'NO',
    2
  ),
  (
    'pfs-clearance-certificate:new_certificate_if_hazards_change',
    'pfs-clearance-certificate',
    'pfs-clearance-certificate:additional-hazards',
    'new_certificate_if_hazards_change',
    'Has the team been briefed that a new clearance certificate is required if additional hazards emerge during today''s work?',
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
