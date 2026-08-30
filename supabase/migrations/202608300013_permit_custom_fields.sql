CREATE TABLE IF NOT EXISTS public.permit_template_fields (
  id text PRIMARY KEY,
  template_id text NOT NULL REFERENCES public.permit_templates(id) ON DELETE CASCADE,
  field_key text NOT NULL,
  label text NOT NULL,
  help_text text,
  field_type text NOT NULL CHECK (field_type IN ('TEXT', 'TEXTAREA', 'NUMBER', 'DATE', 'TIME', 'SELECT')),
  required boolean NOT NULL DEFAULT false,
  options_json jsonb,
  placeholder text,
  sort_order integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(template_id, field_key)
);

CREATE TABLE IF NOT EXISTS public.permit_field_values (
  id text PRIMARY KEY,
  permit_id text NOT NULL REFERENCES public.permits(id) ON DELETE CASCADE,
  field_key text NOT NULL,
  value text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(permit_id, field_key)
);

CREATE INDEX IF NOT EXISTS idx_permit_template_fields_template ON public.permit_template_fields(template_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_permit_field_values_permit ON public.permit_field_values(permit_id);

ALTER TABLE public.permit_template_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permit_field_values ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "No public permit template field access" ON public.permit_template_fields FOR ALL USING (false) WITH CHECK (false);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "No public permit field value access" ON public.permit_field_values FOR ALL USING (false) WITH CHECK (false);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO public.permit_template_fields (id, template_id, field_key, label, help_text, field_type, required, options_json, placeholder, sort_order)
VALUES
  ('pfs-clearance-certificate:task_risk_level', 'pfs-clearance-certificate', 'task_risk_level', 'Task Risk Level', NULL, 'SELECT', true, '["Low","Medium","High"]'::jsonb, NULL, 10),
  ('pfs-clearance-certificate:number_of_workers', 'pfs-clearance-certificate', 'number_of_workers', 'Number of Workers', NULL, 'NUMBER', true, NULL, '2', 20),
  ('pfs-clearance-certificate:clearance_for', 'pfs-clearance-certificate', 'clearance_for', 'Clearance For', NULL, 'TEXT', true, NULL, 'Task, area or work package', 30)
ON CONFLICT (template_id, field_key) DO UPDATE SET
  label = EXCLUDED.label,
  help_text = EXCLUDED.help_text,
  field_type = EXCLUDED.field_type,
  required = EXCLUDED.required,
  options_json = EXCLUDED.options_json,
  placeholder = EXCLUDED.placeholder,
  sort_order = EXCLUDED.sort_order;

UPDATE public.permit_template_sections
SET
  title = 'Task Scope / Clearance Control',
  description = 'Confirm the task description and daily clearance boundary before work starts.',
  sort_order = 10
WHERE id = 'pfs-clearance-certificate:task-scope';

DELETE FROM public.permit_template_questions
WHERE template_id = 'pfs-clearance-certificate'
  AND question_key IN ('task_risk_level_recorded', 'number_workers_recorded');

UPDATE public.permit_template_questions
SET sort_order = 1
WHERE template_id = 'pfs-clearance-certificate'
  AND question_key = 'task_description_sufficient';

INSERT INTO public.permit_template_questions (id, template_id, section_id, question_key, prompt, help_text, answer_type, requires_comment_on, sort_order)
VALUES
  (
    'pfs-clearance-certificate:daily_clearance_boundary_confirmed',
    'pfs-clearance-certificate',
    'pfs-clearance-certificate:task-scope',
    'daily_clearance_boundary_confirmed',
    'Is this clearance certificate limited to today''s work and the task area recorded above?',
    NULL,
    'YES_NO_NA',
    'NO',
    2
  )
ON CONFLICT (template_id, question_key) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  prompt = EXCLUDED.prompt,
  help_text = EXCLUDED.help_text,
  answer_type = EXCLUDED.answer_type,
  requires_comment_on = EXCLUDED.requires_comment_on,
  sort_order = EXCLUDED.sort_order;
