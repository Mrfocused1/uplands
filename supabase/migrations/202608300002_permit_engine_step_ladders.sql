CREATE TABLE IF NOT EXISTS public.permit_templates (
  id text PRIMARY KEY,
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL,
  register_code text NOT NULL,
  version text NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED')),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.permit_template_sections (
  id text PRIMARY KEY,
  template_id text NOT NULL REFERENCES public.permit_templates(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  sort_order integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.permit_template_questions (
  id text PRIMARY KEY,
  template_id text NOT NULL REFERENCES public.permit_templates(id) ON DELETE CASCADE,
  section_id text NOT NULL REFERENCES public.permit_template_sections(id) ON DELETE CASCADE,
  question_key text NOT NULL,
  prompt text NOT NULL,
  help_text text,
  answer_type text NOT NULL DEFAULT 'YES_NO_NA',
  requires_comment_on text,
  sort_order integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(template_id, question_key)
);

CREATE TABLE IF NOT EXISTS public.permits (
  id text PRIMARY KEY,
  permit_number text NOT NULL UNIQUE,
  template_id text NOT NULL REFERENCES public.permit_templates(id),
  site_id text NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  project_id text REFERENCES public.projects(id) ON DELETE SET NULL,
  contractor text NOT NULL,
  location_of_work text NOT NULL,
  description_of_work text NOT NULL,
  valid_from_date date NOT NULL,
  valid_to_date date NOT NULL,
  valid_from_time time NOT NULL,
  valid_to_time time NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'AWAITING_REVIEW', 'AUTHORISED', 'ACTIVE', 'WORK_COMPLETED', 'CLOSED', 'REJECTED', 'EXPIRED', 'CANCELLED')),
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.permit_answers (
  id text PRIMARY KEY,
  permit_id text NOT NULL REFERENCES public.permits(id) ON DELETE CASCADE,
  question_key text NOT NULL,
  answer text NOT NULL CHECK (answer IN ('YES', 'NO', 'NA')),
  comment text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(permit_id, question_key)
);

CREATE TABLE IF NOT EXISTS public.permit_signatures (
  id text PRIMARY KEY,
  permit_id text NOT NULL REFERENCES public.permits(id) ON DELETE CASCADE,
  signature_key text NOT NULL,
  role text NOT NULL,
  name text NOT NULL,
  company text,
  position text,
  signed_at timestamptz NOT NULL,
  signature_data_url text,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(permit_id, signature_key)
);

CREATE INDEX IF NOT EXISTS idx_permit_template_sections_template ON public.permit_template_sections(template_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_permit_template_questions_template ON public.permit_template_questions(template_id, section_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_permits_site ON public.permits(site_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_permit_answers_permit ON public.permit_answers(permit_id);
CREATE INDEX IF NOT EXISTS idx_permit_signatures_permit ON public.permit_signatures(permit_id);

INSERT INTO public.permit_templates (id, code, title, description, register_code, version, status, sort_order)
VALUES ('step-ladders', 'UHSF21.09', 'Step Ladders / Ladders Permit', 'Structured digital permit for short-duration ladder and step ladder work.', 'UHSF21.0', '1', 'ACTIVE', 10)
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
  ('step-ladders:rams-competence', 'step-ladders', 'RAMS / Competence Checks', 'Confirm the task has been planned, briefed and supervised before ladder work starts.', 10),
  ('step-ladders:ladder-condition', 'step-ladders', 'Ladder Suitability', 'Confirm the selected ladder or step ladder is suitable for the location, task and duration.', 20),
  ('step-ladders:work-controls', 'step-ladders', 'Work Controls', 'Confirm controls that keep the operative stable and prevent falls or unauthorised access.', 30)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;

INSERT INTO public.permit_template_questions (id, template_id, section_id, question_key, prompt, help_text, answer_type, requires_comment_on, sort_order)
VALUES
  ('step-ladders:safer_access_considered', 'step-ladders', 'step-ladders:rams-competence', 'safer_access_considered', 'Has a safer means of access been considered and ruled out?', NULL, 'YES_NO_NA', 'NO', 1),
  ('step-ladders:task_specific_rams', 'step-ladders', 'step-ladders:rams-competence', 'task_specific_rams', 'Has a task-specific risk assessment and method statement been prepared and approved?', NULL, 'YES_NO_NA', 'NO', 2),
  ('step-ladders:rams_briefing', 'step-ladders', 'step-ladders:rams-competence', 'rams_briefing', 'Have operatives been briefed on the RAMS and ladder permit requirements?', NULL, 'YES_NO_NA', 'NO', 3),
  ('step-ladders:competent_supervisor', 'step-ladders', 'step-ladders:rams-competence', 'competent_supervisor', 'Has a competent supervisor been appointed for the works?', NULL, 'YES_NO_NA', 'NO', 4),
  ('step-ladders:suitable_length', 'step-ladders', 'step-ladders:ladder-condition', 'suitable_length', 'Is the ladder the correct and suitable length for the work?', NULL, 'YES_NO_NA', 'NO', 1),
  ('step-ladders:bs_en_131', 'step-ladders', 'step-ladders:ladder-condition', 'bs_en_131', 'Does the ladder comply with BS EN 131 or equivalent industrial standard?', NULL, 'YES_NO_NA', 'NO', 2),
  ('step-ladders:pre_use_inspection', 'step-ladders', 'step-ladders:ladder-condition', 'pre_use_inspection', 'Has the ladder been inspected before use and found free from defects?', NULL, 'YES_NO_NA', 'NO', 3),
  ('step-ladders:correct_angle_stability', 'step-ladders', 'step-ladders:ladder-condition', 'correct_angle_stability', 'Can the ladder be positioned at the correct angle and on stable ground?', NULL, 'YES_NO_NA', 'NO', 4),
  ('step-ladders:three_contact_points', 'step-ladders', 'step-ladders:work-controls', 'three_contact_points', 'Can three points of contact be maintained while working?', NULL, 'YES_NO_NA', 'NO', 1),
  ('step-ladders:top_or_foot_tied', 'step-ladders', 'step-ladders:work-controls', 'top_or_foot_tied', 'Can the ladder be tied, footed or otherwise secured against movement?', NULL, 'YES_NO_NA', 'NO', 2),
  ('step-ladders:safe_head_height', 'step-ladders', 'step-ladders:work-controls', 'safe_head_height', 'Will the operative avoid standing above the safe head-height limit?', NULL, 'YES_NO_NA', 'NO', 3),
  ('step-ladders:exclusion_zone', 'step-ladders', 'step-ladders:work-controls', 'exclusion_zone', 'Is the work area controlled to protect others below or nearby?', NULL, 'YES_NO_NA', 'NO', 4)
ON CONFLICT (template_id, question_key) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  prompt = EXCLUDED.prompt,
  help_text = EXCLUDED.help_text,
  answer_type = EXCLUDED.answer_type,
  requires_comment_on = EXCLUDED.requires_comment_on,
  sort_order = EXCLUDED.sort_order;

CREATE OR REPLACE VIEW public.permits_with_template AS
SELECT
  p.*,
  t.code AS template_code,
  t.title AS template_title,
  s.location AS site_location,
  pr.name AS project_name
FROM public.permits p
JOIN public.permit_templates t ON t.id = p.template_id
JOIN public.sites s ON s.id = p.site_id
LEFT JOIN public.projects pr ON pr.id = p.project_id;

ALTER TABLE public.permit_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permit_template_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permit_template_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permit_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permit_signatures ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "No public permit template access" ON public.permit_templates FOR ALL USING (false) WITH CHECK (false);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "No public permit template section access" ON public.permit_template_sections FOR ALL USING (false) WITH CHECK (false);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "No public permit template question access" ON public.permit_template_questions FOR ALL USING (false) WITH CHECK (false);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "No public permit access" ON public.permits FOR ALL USING (false) WITH CHECK (false);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "No public permit answer access" ON public.permit_answers FOR ALL USING (false) WITH CHECK (false);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "No public permit signature access" ON public.permit_signatures FOR ALL USING (false) WITH CHECK (false);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
