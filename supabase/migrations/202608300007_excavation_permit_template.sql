INSERT INTO public.permit_templates (id, code, title, description, register_code, version, status, sort_order)
VALUES (
  'excavation',
  'UHSF21.01',
  'Excavation Permit',
  'Structured digital permit for excavation work, service checks, ground controls, atmosphere checks and site protection.',
  'UHSF21.0',
  '1',
  'ACTIVE',
  50
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
    'excavation:planning-competence',
    'excavation',
    'Planning / Competence Checks',
    'Confirm RAMS, briefing, emergency arrangements, supervision and operative competence before excavation starts.',
    10
  ),
  (
    'excavation:services-drawings-materials',
    'excavation',
    'Services / Drawings / Materials',
    'Confirm buried services, drawings and excavation support/access materials are ready.',
    20
  ),
  (
    'excavation:excavation-stability',
    'excavation',
    'Excavation Stability / Edge Protection',
    'Confirm the excavation, adjacent structures and ground conditions can be kept stable and protected.',
    30
  ),
  (
    'excavation:atmosphere-rescue',
    'excavation',
    'Atmosphere / Rescue Arrangements',
    'Confirm ventilation, gas/fume testing and rescue equipment for excavation work.',
    40
  ),
  (
    'excavation:plant-site-protection',
    'excavation',
    'Plant / Site Protection',
    'Confirm plant suitability, lighting and protection of other persons on site.',
    50
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;

INSERT INTO public.permit_template_questions (id, template_id, section_id, question_key, prompt, help_text, answer_type, requires_comment_on, sort_order)
VALUES
  (
    'excavation:rams_prepared_approved',
    'excavation',
    'excavation:planning-competence',
    'rams_prepared_approved',
    'Has a Risk Assessment and Method Statement been prepared and approved?',
    NULL,
    'YES_NO_NA',
    'NO',
    1
  ),
  (
    'excavation:rams_briefing_understood',
    'excavation',
    'excavation:planning-competence',
    'rams_briefing_understood',
    'Have all personnel been briefed on the contents of the RAMS and do they understand the task being carried out?',
    NULL,
    'YES_NO_NA',
    'NO',
    2
  ),
  (
    'excavation:emergency_procedures_prepared',
    'excavation',
    'excavation:planning-competence',
    'emergency_procedures_prepared',
    'Have emergency procedures been prepared and posted?',
    NULL,
    'YES_NO_NA',
    'NO',
    3
  ),
  (
    'excavation:emergency_procedures_training',
    'excavation',
    'excavation:planning-competence',
    'emergency_procedures_training',
    'Have all personnel involved been trained in the requirements of the emergency procedures?',
    NULL,
    'YES_NO_NA',
    'NO',
    4
  ),
  (
    'excavation:competent_supervisor',
    'excavation',
    'excavation:planning-competence',
    'competent_supervisor',
    'Has a competent supervisor been appointed?',
    'Use the comment field to record who has been appointed.',
    'YES_NO_NA',
    'NO',
    5
  ),
  (
    'excavation:operatives_trained',
    'excavation',
    'excavation:planning-competence',
    'operatives_trained',
    'Are operatives suitably trained?',
    NULL,
    'YES_NO_NA',
    'NO',
    6
  ),
  (
    'excavation:services_located_verified',
    'excavation',
    'excavation:services-drawings-materials',
    'services_located_verified',
    'Have all services been located and their positions verified?',
    'Record drawing references, scan references or known service locations where needed.',
    'YES_NO_NA',
    'NO',
    1
  ),
  (
    'excavation:drawings_available',
    'excavation',
    'excavation:services-drawings-materials',
    'drawings_available',
    'Are necessary drawings available?',
    NULL,
    'YES_NO_NA',
    'NO',
    2
  ),
  (
    'excavation:access_materials_ready',
    'excavation',
    'excavation:services-drawings-materials',
    'access_materials_ready',
    'Are access materials ready to place?',
    NULL,
    'YES_NO_NA',
    'NO',
    3
  ),
  (
    'excavation:support_materials_ready',
    'excavation',
    'excavation:services-drawings-materials',
    'support_materials_ready',
    'Are support materials ready to place?',
    NULL,
    'YES_NO_NA',
    'NO',
    4
  ),
  (
    'excavation:edge_protection_ready',
    'excavation',
    'excavation:excavation-stability',
    'edge_protection_ready',
    'Is edge protection for personnel and vehicles ready to place?',
    NULL,
    'YES_NO_NA',
    'NO',
    1
  ),
  (
    'excavation:soil_conditions_considered',
    'excavation',
    'excavation:excavation-stability',
    'soil_conditions_considered',
    'Have soil conditions been taken into account?',
    NULL,
    'YES_NO_NA',
    'NO',
    2
  ),
  (
    'excavation:no_danger_of_flooding',
    'excavation',
    'excavation:excavation-stability',
    'no_danger_of_flooding',
    'Are you satisfied that there is no danger of flooding?',
    NULL,
    'YES_NO_NA',
    'NO',
    3
  ),
  (
    'excavation:adjacent_structures_safe',
    'excavation',
    'excavation:excavation-stability',
    'adjacent_structures_safe',
    'Will adjacent structures be safe?',
    NULL,
    'YES_NO_NA',
    'NO',
    4
  ),
  (
    'excavation:ventilation_adequate',
    'excavation',
    'excavation:atmosphere-rescue',
    'ventilation_adequate',
    'Is ventilation adequate?',
    NULL,
    'YES_NO_NA',
    'NO',
    1
  ),
  (
    'excavation:regular_gas_fume_tests',
    'excavation',
    'excavation:atmosphere-rescue',
    'regular_gas_fume_tests',
    'Will regular tests for gases and fumes be carried out?',
    NULL,
    'YES_NO_NA',
    'NO',
    2
  ),
  (
    'excavation:respiratory_equipment_provided',
    'excavation',
    'excavation:atmosphere-rescue',
    'respiratory_equipment_provided',
    'Has the necessary respiratory equipment been provided?',
    NULL,
    'YES_NO_NA',
    'NO',
    3
  ),
  (
    'excavation:resuscitation_equipment_available',
    'excavation',
    'excavation:atmosphere-rescue',
    'resuscitation_equipment_available',
    'Is resuscitation equipment readily available?',
    NULL,
    'YES_NO_NA',
    'NO',
    4
  ),
  (
    'excavation:excavator_suitable',
    'excavation',
    'excavation:plant-site-protection',
    'excavator_suitable',
    'Is the excavator physically and legally suitable for the job?',
    NULL,
    'YES_NO_NA',
    'NO',
    1
  ),
  (
    'excavation:lighting_ready_if_required',
    'excavation',
    'excavation:plant-site-protection',
    'lighting_ready_if_required',
    'If required, is lighting on site ready to use?',
    NULL,
    'YES_NO_NA',
    'NO',
    2
  ),
  (
    'excavation:other_persons_protected',
    'excavation',
    'excavation:plant-site-protection',
    'other_persons_protected',
    'Will other persons on site be adequately protected?',
    NULL,
    'YES_NO_NA',
    'NO',
    3
  )
ON CONFLICT (template_id, question_key) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  prompt = EXCLUDED.prompt,
  help_text = EXCLUDED.help_text,
  answer_type = EXCLUDED.answer_type,
  requires_comment_on = EXCLUDED.requires_comment_on,
  sort_order = EXCLUDED.sort_order;
