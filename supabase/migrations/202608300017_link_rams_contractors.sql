DROP VIEW IF EXISTS public.rams_documents_with_counts;

ALTER TABLE public.rams_documents
  ADD COLUMN IF NOT EXISTS contractor_id text REFERENCES public.contractors(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_rams_documents_contractor
  ON public.rams_documents(site_id, contractor_id, created_at DESC);

UPDATE public.rams_documents r
SET contractor_id = c.id
FROM public.contractors c
WHERE r.contractor_id IS NULL
  AND c.name = trim(r.contractor);

CREATE OR REPLACE VIEW public.rams_documents_with_counts AS
SELECT
  d.*,
  (SELECT COUNT(*) FROM public.rams_sections s WHERE s.rams_document_id = d.id) AS section_count,
  (SELECT COUNT(*) FROM public.rams_chunks c WHERE c.rams_document_id = d.id) AS chunk_count
FROM public.rams_documents d;
