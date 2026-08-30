CREATE TABLE IF NOT EXISTS public.attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id text NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  project_id text REFERENCES public.projects(id) ON DELETE SET NULL,
  contractor_id text NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  operative_id text NOT NULL REFERENCES public.operatives(id) ON DELETE CASCADE,
  induction_status text NOT NULL DEFAULT 'NOT_STARTED',
  shift text NOT NULL DEFAULT 'DAY',
  status text NOT NULL DEFAULT 'SIGNED_IN',
  signed_in_at timestamptz NOT NULL DEFAULT now(),
  signed_in_by text,
  signed_out_at timestamptz,
  signed_out_by text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attendance_site_status ON public.attendance_records(site_id, status, signed_in_at DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_contractor ON public.attendance_records(site_id, contractor_id, signed_in_at DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_operative ON public.attendance_records(site_id, operative_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_one_open_record ON public.attendance_records(site_id, operative_id) WHERE status = 'SIGNED_IN';

CREATE OR REPLACE VIEW public.attendance_records_with_details AS
SELECT
  ar.*,
  c.name AS contractor_name,
  o.full_name,
  o.email,
  o.phone,
  o.role,
  so.site_operative_id,
  so.site_status AS operative_site_status,
  so.induction_submission_id,
  so.induction_reference
FROM public.attendance_records ar
JOIN public.contractors c ON c.id = ar.contractor_id
JOIN public.operatives o ON o.id = ar.operative_id
LEFT JOIN public.site_operatives_with_details so ON so.site_id = ar.site_id AND so.operative_id = ar.operative_id;

ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "No public attendance access" ON public.attendance_records FOR ALL USING (false) WITH CHECK (false);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
