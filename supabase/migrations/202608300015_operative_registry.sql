CREATE TABLE IF NOT EXISTS public.operatives (
  id text PRIMARY KEY,
  contractor_id text NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text,
  phone text,
  role text,
  cscs_card_number text,
  cscs_expiry date,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.site_operatives (
  id text PRIMARY KEY,
  site_id text NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  project_id text REFERENCES public.projects(id) ON DELETE SET NULL,
  contractor_id text NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  operative_id text NOT NULL REFERENCES public.operatives(id) ON DELETE CASCADE,
  induction_submission_id text REFERENCES public.submissions(id) ON DELETE SET NULL,
  induction_status text NOT NULL DEFAULT 'NOT_STARTED' CHECK (induction_status IN ('NOT_STARTED', 'INVITED', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED')),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(site_id, operative_id)
);

ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS contractor_id text REFERENCES public.contractors(id) ON DELETE SET NULL;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS operative_id text REFERENCES public.operatives(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_operatives_contractor ON public.operatives(contractor_id, status);
CREATE INDEX IF NOT EXISTS idx_site_operatives_site ON public.site_operatives(site_id, status);
CREATE INDEX IF NOT EXISTS idx_site_operatives_contractor ON public.site_operatives(site_id, contractor_id, status);
CREATE INDEX IF NOT EXISTS idx_site_operatives_operative ON public.site_operatives(operative_id);
CREATE INDEX IF NOT EXISTS idx_submissions_contractor ON public.submissions(contractor_id);
CREATE INDEX IF NOT EXISTS idx_submissions_operative ON public.submissions(operative_id);

WITH induction_sources AS (
  SELECT
    s.id AS submission_id,
    s.site_id,
    s.full_name,
    s.print_review_status,
    c.id AS contractor_id
  FROM public.submissions s
  JOIN public.contractors c ON c.name = trim(s.company_name)
  WHERE s.operative_id IS NULL
    AND trim(COALESCE(s.full_name, '')) <> ''
    AND trim(COALESCE(s.company_name, '')) <> ''
),
operative_rows AS (
  SELECT DISTINCT
    'operative-' || md5(contractor_id || ':' || lower(trim(full_name))) AS id,
    contractor_id,
    trim(full_name) AS full_name
  FROM induction_sources
)
INSERT INTO public.operatives (id, contractor_id, full_name, status)
SELECT id, contractor_id, full_name, 'ACTIVE'
FROM operative_rows
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  updated_at = now();

WITH induction_sources AS (
  SELECT
    s.id AS submission_id,
    s.site_id,
    s.full_name,
    s.print_review_status,
    c.id AS contractor_id,
    o.id AS operative_id
  FROM public.submissions s
  JOIN public.contractors c ON c.name = trim(s.company_name)
  JOIN public.operatives o ON o.id = 'operative-' || md5(c.id || ':' || lower(trim(s.full_name)))
  WHERE s.site_id IS NOT NULL
    AND s.operative_id IS NULL
    AND trim(COALESCE(s.full_name, '')) <> ''
    AND trim(COALESCE(s.company_name, '')) <> ''
)
INSERT INTO public.site_operatives
  (id, site_id, project_id, contractor_id, operative_id, induction_submission_id, induction_status, status)
SELECT
  'site-operative-' || md5(site_id || ':' || operative_id),
  site_id,
  NULL::text,
  contractor_id,
  operative_id,
  submission_id,
  CASE WHEN print_review_status = 'ready' THEN 'APPROVED' ELSE 'PENDING_REVIEW' END,
  'ACTIVE'
FROM induction_sources
ON CONFLICT (site_id, operative_id) DO UPDATE SET
  induction_submission_id = COALESCE(public.site_operatives.induction_submission_id, EXCLUDED.induction_submission_id),
  induction_status = EXCLUDED.induction_status,
  updated_at = now();

UPDATE public.submissions s
SET
  contractor_id = c.id,
  operative_id = o.id,
  updated_at = now()
FROM public.contractors c
JOIN public.operatives o ON o.contractor_id = c.id
WHERE s.operative_id IS NULL
  AND c.name = trim(s.company_name)
  AND o.full_name = trim(s.full_name);

CREATE OR REPLACE VIEW public.site_operatives_with_details AS
SELECT
  so.id AS site_operative_id,
  so.site_id,
  so.project_id,
  so.contractor_id,
  c.name AS contractor_name,
  o.id AS operative_id,
  o.full_name,
  o.email,
  o.phone,
  o.role,
  o.cscs_card_number,
  o.cscs_expiry,
  o.status AS operative_status,
  so.status AS site_status,
  so.induction_status,
  so.induction_submission_id,
  s.reference AS induction_reference,
  so.created_at,
  so.updated_at
FROM public.site_operatives so
JOIN public.operatives o ON o.id = so.operative_id
JOIN public.contractors c ON c.id = so.contractor_id
LEFT JOIN public.submissions s ON s.id = so.induction_submission_id;

ALTER TABLE public.operatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_operatives ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "No public operative access" ON public.operatives FOR ALL USING (false) WITH CHECK (false);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "No public site operative access" ON public.site_operatives FOR ALL USING (false) WITH CHECK (false);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
