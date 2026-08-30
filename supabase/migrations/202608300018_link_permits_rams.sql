DROP VIEW IF EXISTS public.permits_with_template;

ALTER TABLE public.permits
  ADD COLUMN IF NOT EXISTS rams_document_id text REFERENCES public.rams_documents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_permits_rams_document ON public.permits(rams_document_id);

CREATE OR REPLACE VIEW public.permits_with_template AS
SELECT
  p.*,
  t.code AS template_code,
  t.title AS template_title,
  s.location AS site_location,
  pr.name AS project_name,
  rd.title AS rams_document_title,
  rd.document_reference AS rams_document_reference,
  rd.revision AS rams_document_revision
FROM public.permits p
JOIN public.permit_templates t ON t.id = p.template_id
JOIN public.sites s ON s.id = p.site_id
LEFT JOIN public.projects pr ON pr.id = p.project_id
LEFT JOIN public.rams_documents rd ON rd.id = p.rams_document_id;
