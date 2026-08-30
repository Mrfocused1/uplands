CREATE TABLE IF NOT EXISTS public.sites (
  id text PRIMARY KEY,
  name text NOT NULL,
  location text NOT NULL,
  summary text NOT NULL,
  status text NOT NULL DEFAULT 'PLANNED' CHECK (status IN ('ACTIVE', 'TESTING', 'PLANNED', 'ARCHIVED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.projects (
  id text PRIMARY KEY,
  site_id text NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  name text NOT NULL,
  reference text,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PLANNED', 'COMPLETED', 'ARCHIVED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.site_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id text NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  admin_id text NOT NULL,
  role text NOT NULL,
  can_manage_inductions boolean NOT NULL DEFAULT true,
  can_manage_rams boolean NOT NULL DEFAULT true,
  can_manage_permits boolean NOT NULL DEFAULT true,
  can_manage_attendance boolean NOT NULL DEFAULT false,
  can_manage_handover boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(site_id, admin_id, role)
);

ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS site_id text REFERENCES public.sites(id) ON DELETE SET NULL;
ALTER TABLE public.rams_documents ADD COLUMN IF NOT EXISTS site_id text REFERENCES public.sites(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_projects_site ON public.projects(site_id, status);
CREATE INDEX IF NOT EXISTS idx_site_memberships_site ON public.site_memberships(site_id);
CREATE INDEX IF NOT EXISTS idx_site_memberships_admin ON public.site_memberships(admin_id);
CREATE INDEX IF NOT EXISTS idx_submissions_site ON public.submissions(site_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rams_documents_site ON public.rams_documents(site_id, created_at DESC);

INSERT INTO public.sites (id, name, location, summary, status)
VALUES
  ('newport', 'Newport', 'Waitrose Newport', 'Current RAMS reviews, site inductions, forms and document tools for the Newport works.', 'ACTIVE'),
  ('balham', 'Balham', 'Waitrose Balham', 'Editable daily report documents and site document preparation for Balham.', 'TESTING'),
  ('plymouth', 'Plymouth', 'Plymouth Depot', 'Prepared for future Uplands site-management records.', 'PLANNED'),
  ('bristol', 'Bristol', 'Bristol Retail Works', 'Prepared for future Uplands site-management records.', 'PLANNED'),
  ('london', 'London Central', 'Central London Sites', 'Prepared for future Uplands site-management records.', 'PLANNED')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  location = EXCLUDED.location,
  summary = EXCLUDED.summary,
  status = EXCLUDED.status,
  updated_at = now();

INSERT INTO public.projects (id, site_id, name, reference, status)
VALUES
  ('newport-waitrose', 'newport', 'Waitrose Newport', 'NEWPORT', 'ACTIVE'),
  ('balham-waitrose', 'balham', 'Waitrose Balham', 'BALHAM', 'ACTIVE'),
  ('plymouth-depot', 'plymouth', 'Plymouth Depot', 'PLYMOUTH', 'ACTIVE'),
  ('bristol-retail', 'bristol', 'Bristol Retail Works', 'BRISTOL', 'ACTIVE'),
  ('london-central', 'london', 'Central London Sites', 'LONDON', 'ACTIVE')
ON CONFLICT (id) DO UPDATE SET
  site_id = EXCLUDED.site_id,
  name = EXCLUDED.name,
  reference = EXCLUDED.reference,
  status = EXCLUDED.status,
  updated_at = now();

UPDATE public.submissions
SET site_id = 'newport'
WHERE site_id IS NULL AND lower(COALESCE(site_name, '')) LIKE '%newport%';

UPDATE public.submissions
SET site_id = 'balham'
WHERE site_id IS NULL AND lower(COALESCE(site_name, '')) LIKE '%balham%';

UPDATE public.rams_documents
SET site_id = 'newport'
WHERE site_id IS NULL AND lower(COALESCE(site_name, '')) LIKE '%newport%';

UPDATE public.rams_documents
SET site_id = 'balham'
WHERE site_id IS NULL AND lower(COALESCE(site_name, '')) LIKE '%balham%';

CREATE OR REPLACE VIEW public.sites_with_primary_project AS
SELECT
  s.id,
  s.name,
  s.location,
  s.summary,
  s.status,
  s.created_at,
  s.updated_at,
  p.id AS project_id,
  p.name AS project_name,
  p.reference AS project_reference
FROM public.sites s
LEFT JOIN public.projects p ON p.site_id = s.id AND p.status = 'ACTIVE'
ORDER BY
  CASE s.status
    WHEN 'ACTIVE' THEN 0
    WHEN 'TESTING' THEN 1
    WHEN 'PLANNED' THEN 2
    ELSE 3
  END,
  s.name ASC;

CREATE OR REPLACE VIEW public.submissions_with_counts AS
SELECT
  s.id,
  s.reference,
  s.site_id,
  s.full_name,
  s.company_name,
  s.site_name,
  s.declaration_date,
  s.print_review_status,
  s.pinned,
  s.is_sample,
  s.created_at,
  s.updated_at,
  COUNT(e.id) FILTER (WHERE e.storage_path IS NOT NULL) AS evidence_count
FROM public.submissions s
LEFT JOIN public.evidence_documents e ON e.submission_id = s.id
GROUP BY s.id;

CREATE OR REPLACE VIEW public.rams_documents_with_counts AS
SELECT
  d.id,
  d.title,
  d.site_id,
  d.site_name,
  d.contractor,
  d.document_reference,
  d.revision,
  d.revision_date,
  d.file_name,
  d.storage_key,
  d.file_size,
  d.mime_type,
  d.page_count,
  d.processing_status,
  d.processing_error,
  d.text_extraction_status,
  d.created_by,
  d.created_at,
  d.updated_at,
  COUNT(DISTINCT s.id) AS section_count,
  COUNT(DISTINCT c.id) AS chunk_count
FROM public.rams_documents d
LEFT JOIN public.rams_sections s ON s.rams_document_id = d.id
LEFT JOIN public.rams_chunks c ON c.rams_document_id = d.id
GROUP BY d.id;

ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_memberships ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "No public site access" ON public.sites FOR ALL USING (false) WITH CHECK (false);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "No public project access" ON public.projects FOR ALL USING (false) WITH CHECK (false);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "No public site membership access" ON public.site_memberships FOR ALL USING (false) WITH CHECK (false);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
