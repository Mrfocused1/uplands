DROP VIEW IF EXISTS public.permits_with_template;

CREATE TABLE IF NOT EXISTS public.contractors (
  id text PRIMARY KEY,
  name text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED')),
  primary_contact_name text,
  primary_contact_email text,
  primary_contact_phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.site_contractors (
  id text PRIMARY KEY,
  site_id text NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  project_id text REFERENCES public.projects(id) ON DELETE SET NULL,
  contractor_id text NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  trade text,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(site_id, contractor_id)
);

ALTER TABLE public.permits ADD COLUMN IF NOT EXISTS contractor_id text REFERENCES public.contractors(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contractors_name ON public.contractors(name);
CREATE INDEX IF NOT EXISTS idx_site_contractors_site ON public.site_contractors(site_id, status);
CREATE INDEX IF NOT EXISTS idx_site_contractors_contractor ON public.site_contractors(contractor_id);
CREATE INDEX IF NOT EXISTS idx_permits_contractor ON public.permits(contractor_id);

WITH source_contractors AS (
  SELECT trim(contractor) AS name FROM public.permits WHERE trim(COALESCE(contractor, '')) <> ''
  UNION
  SELECT trim(contractor) AS name FROM public.rams_documents WHERE trim(COALESCE(contractor, '')) <> ''
  UNION
  SELECT trim(company_name) AS name FROM public.submissions WHERE trim(COALESCE(company_name, '')) <> ''
)
INSERT INTO public.contractors (id, name, status)
SELECT 'contractor-' || md5(lower(name)), name, 'ACTIVE'
FROM source_contractors
ON CONFLICT (name) DO UPDATE SET
  status = 'ACTIVE',
  updated_at = now();

WITH site_sources AS (
  SELECT site_id, project_id, trim(contractor) AS name FROM public.permits WHERE site_id IS NOT NULL AND trim(COALESCE(contractor, '')) <> ''
  UNION ALL
  SELECT site_id, NULL::text AS project_id, trim(contractor) AS name FROM public.rams_documents WHERE site_id IS NOT NULL AND trim(COALESCE(contractor, '')) <> ''
  UNION ALL
  SELECT site_id, NULL::text AS project_id, trim(company_name) AS name FROM public.submissions WHERE site_id IS NOT NULL AND trim(COALESCE(company_name, '')) <> ''
),
site_contractor_rows AS (
  SELECT
    ss.site_id,
    MAX(ss.project_id) AS project_id,
    c.id AS contractor_id
  FROM site_sources ss
  JOIN public.contractors c ON c.name = ss.name
  GROUP BY ss.site_id, c.id
)
INSERT INTO public.site_contractors (id, site_id, project_id, contractor_id, status)
SELECT 'site-contractor-' || md5(site_id || ':' || contractor_id), site_id, project_id, contractor_id, 'ACTIVE'
FROM site_contractor_rows
ON CONFLICT (site_id, contractor_id) DO UPDATE SET
  project_id = COALESCE(EXCLUDED.project_id, public.site_contractors.project_id),
  status = 'ACTIVE',
  updated_at = now();

UPDATE public.permits p
SET contractor_id = c.id
FROM public.contractors c
WHERE p.contractor_id IS NULL
  AND c.name = trim(p.contractor);

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

CREATE OR REPLACE VIEW public.contractors_by_site AS
SELECT
  sc.id AS site_contractor_id,
  sc.site_id,
  sc.project_id,
  c.id AS contractor_id,
  c.name,
  c.status AS contractor_status,
  sc.status AS site_status,
  sc.trade,
  c.primary_contact_name,
  c.primary_contact_email,
  c.primary_contact_phone,
  sc.created_at,
  sc.updated_at
FROM public.site_contractors sc
JOIN public.contractors c ON c.id = sc.contractor_id;

ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_contractors ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "No public contractor access" ON public.contractors FOR ALL USING (false) WITH CHECK (false);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "No public site contractor access" ON public.site_contractors FOR ALL USING (false) WITH CHECK (false);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
