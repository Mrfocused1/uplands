INSERT INTO public.permit_templates (id, code, title, description, register_code, version, status, sort_order)
VALUES (
  'temporary-works-load-strike',
  'UHSF23.7',
  'Temporary Works Permit to Load / Strike',
  'Structured digital permit for temporary works erection checks, TWC/TWS authorisation, loading controls and strike closure.',
  'UHSF21.0',
  '1',
  'ACTIVE',
  90
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
    'temporary-works-load-strike:temporary-works-team',
    'temporary-works-load-strike',
    'Temporary Works Team',
    'Identify the temporary works coordinator, responsible site manager and competent subcontractor supervisor.',
    10
  ),
  (
    'temporary-works-load-strike:drawings-method',
    'temporary-works-load-strike',
    'Drawings / Method Statement',
    'Confirm drawings, deviations, method statement and risk-assessment briefings are controlled.',
    20
  ),
  (
    'temporary-works-load-strike:emergency-site-controls',
    'temporary-works-load-strike',
    'Emergency / Site Controls',
    'Confirm emergency arrangements, service locations, protection, signage and third-party notifications.',
    30
  ),
  (
    'temporary-works-load-strike:load-strike-authorisation',
    'temporary-works-load-strike',
    'Load / Strike Authorisation',
    'Confirm temporary works are built to design and authorised before loading or striking.',
    40
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;

INSERT INTO public.permit_template_questions (id, template_id, section_id, question_key, prompt, help_text, answer_type, requires_comment_on, sort_order)
VALUES
  (
    'temporary-works-load-strike:authorising_temporary_works_coordinator',
    'temporary-works-load-strike',
    'temporary-works-load-strike:temporary-works-team',
    'authorising_temporary_works_coordinator',
    'Has the authorising temporary works coordinator been identified?',
    'Use the comment field to record the TWC/TWS name.',
    'YES_NO_NA',
    'NO',
    1
  ),
  (
    'temporary-works-load-strike:site_manager_responsible',
    'temporary-works-load-strike',
    'temporary-works-load-strike:temporary-works-team',
    'site_manager_responsible',
    'Has the site manager responsible for temporary works erection been identified?',
    'Use the comment field to record the responsible site manager.',
    'YES_NO_NA',
    'NO',
    2
  ),
  (
    'temporary-works-load-strike:competent_subcontractor_supervisor',
    'temporary-works-load-strike',
    'temporary-works-load-strike:temporary-works-team',
    'competent_subcontractor_supervisor',
    'Has the competent subcontractor supervisor been identified?',
    'Use the comment field to record the supervisor name.',
    'YES_NO_NA',
    'NO',
    3
  ),
  (
    'temporary-works-load-strike:operatives_suitably_trained',
    'temporary-works-load-strike',
    'temporary-works-load-strike:temporary-works-team',
    'operatives_suitably_trained',
    'Are operatives suitably trained?',
    'Record relevant cards or competency evidence where required.',
    'YES_NO_NA',
    'NO',
    4
  ),
  (
    'temporary-works-load-strike:drawings_issued_to_supervisor',
    'temporary-works-load-strike',
    'temporary-works-load-strike:drawings-method',
    'drawings_issued_to_supervisor',
    'Have the drawings been issued to the site supervisor?',
    NULL,
    'YES_NO_NA',
    'NO',
    1
  ),
  (
    'temporary-works-load-strike:drawing_deviations_identified',
    'temporary-works-load-strike',
    'temporary-works-load-strike:drawings-method',
    'drawing_deviations_identified',
    'Are there any deviations from the drawings?',
    'If Yes, record what has changed.',
    'YES_NO_NA',
    'YES',
    2
  ),
  (
    'temporary-works-load-strike:method_statement_prepared',
    'temporary-works-load-strike',
    'temporary-works-load-strike:drawings-method',
    'method_statement_prepared',
    'Has a satisfactory method statement been prepared?',
    NULL,
    'YES_NO_NA',
    'NO',
    3
  ),
  (
    'temporary-works-load-strike:risk_assessment_results_briefed',
    'temporary-works-load-strike',
    'temporary-works-load-strike:drawings-method',
    'risk_assessment_results_briefed',
    'Have personnel involved in, or likely to be affected by the work, been informed of the results of the risk assessments?',
    NULL,
    'YES_NO_NA',
    'NO',
    4
  ),
  (
    'temporary-works-load-strike:method_statement_training',
    'temporary-works-load-strike',
    'temporary-works-load-strike:drawings-method',
    'method_statement_training',
    'Have all personnel involved in the work been trained in the requirements of the method statement?',
    NULL,
    'YES_NO_NA',
    'NO',
    5
  ),
  (
    'temporary-works-load-strike:emergency_procedures_prepared_posted',
    'temporary-works-load-strike',
    'temporary-works-load-strike:emergency-site-controls',
    'emergency_procedures_prepared_posted',
    'Have emergency procedures been prepared and posted?',
    'Record where the emergency procedures are posted.',
    'YES_NO_NA',
    'NO',
    1
  ),
  (
    'temporary-works-load-strike:emergency_procedures_training',
    'temporary-works-load-strike',
    'temporary-works-load-strike:emergency-site-controls',
    'emergency_procedures_training',
    'Have all personnel involved been trained in the requirements of the emergency procedures?',
    NULL,
    'YES_NO_NA',
    'NO',
    2
  ),
  (
    'temporary-works-load-strike:services_located_marked_protected',
    'temporary-works-load-strike',
    'temporary-works-load-strike:emergency-site-controls',
    'services_located_marked_protected',
    'Have all services been located and their positions verified, marked and protected?',
    'Record CAT scan, sub scan or existing drawing references where needed.',
    'YES_NO_NA',
    'NO',
    3
  ),
  (
    'temporary-works-load-strike:suitable_protection_in_place',
    'temporary-works-load-strike',
    'temporary-works-load-strike:emergency-site-controls',
    'suitable_protection_in_place',
    'Is suitable protection in place?',
    'For example fencing.',
    'YES_NO_NA',
    'NO',
    4
  ),
  (
    'temporary-works-load-strike:suitable_signs_in_place',
    'temporary-works-load-strike',
    'temporary-works-load-strike:emergency-site-controls',
    'suitable_signs_in_place',
    'Are suitable signs in place?',
    NULL,
    'YES_NO_NA',
    'NO',
    5
  ),
  (
    'temporary-works-load-strike:third_parties_informed',
    'temporary-works-load-strike',
    'temporary-works-load-strike:emergency-site-controls',
    'third_parties_informed',
    'Have third parties been informed?',
    'For example client awareness of risks such as noise.',
    'YES_NO_NA',
    'NO',
    6
  ),
  (
    'temporary-works-load-strike:erected_to_design_final_inspection',
    'temporary-works-load-strike',
    'temporary-works-load-strike:load-strike-authorisation',
    'erected_to_design_final_inspection',
    'Has the temporary works been erected in accordance with the design and has a final inspection been carried out?',
    NULL,
    'YES_NO_NA',
    'NO',
    1
  ),
  (
    'temporary-works-load-strike:twc_tws_checked_to_design',
    'temporary-works-load-strike',
    'temporary-works-load-strike:load-strike-authorisation',
    'twc_tws_checked_to_design',
    'Has the TWC / TWS checked that the temporary works are in accordance with the design details?',
    NULL,
    'YES_NO_NA',
    'NO',
    2
  ),
  (
    'temporary-works-load-strike:loading_restraints_briefed',
    'temporary-works-load-strike',
    'temporary-works-load-strike:load-strike-authorisation',
    'loading_restraints_briefed',
    'Have restraints imposed on the loading of the temporary works been understood and passed to the site manager in charge?',
    NULL,
    'YES_NO_NA',
    'NO',
    3
  ),
  (
    'temporary-works-load-strike:load_type_confirmed',
    'temporary-works-load-strike',
    'temporary-works-load-strike:load-strike-authorisation',
    'load_type_confirmed',
    'Has the authorised load type been confirmed?',
    'Record reinforcement, concrete, other or none in the comment field.',
    'YES_NO_NA',
    'NO',
    4
  ),
  (
    'temporary-works-load-strike:strike_conditions_confirmed',
    'temporary-works-load-strike',
    'temporary-works-load-strike:load-strike-authorisation',
    'strike_conditions_confirmed',
    'Have the conditions for striking or removing the temporary works been confirmed?',
    NULL,
    'YES_NO_NA',
    'NO',
    5
  )
ON CONFLICT (id) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_key = EXCLUDED.question_key,
  prompt = EXCLUDED.prompt,
  help_text = EXCLUDED.help_text,
  answer_type = EXCLUDED.answer_type,
  requires_comment_on = EXCLUDED.requires_comment_on,
  sort_order = EXCLUDED.sort_order;
