CREATE TABLE IF NOT EXISTS public.site_handovers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id text NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  project_id text REFERENCES public.projects(id) ON DELETE SET NULL,
  handover_date date NOT NULL DEFAULT CURRENT_DATE,
  shift text NOT NULL DEFAULT 'DAY',
  status text NOT NULL DEFAULT 'DRAFT',
  manager_name text,
  summary text,
  work_completed text,
  contractors_present text,
  permits_summary text,
  issues text,
  deliveries text,
  outstanding_actions text,
  next_shift_notes text,
  submitted_at timestamptz,
  submitted_by text,
  acknowledged_at timestamptz,
  acknowledged_by text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_handovers_shift_check CHECK (shift IN ('DAY', 'NIGHT')),
  CONSTRAINT site_handovers_status_check CHECK (status IN ('DRAFT', 'SUBMITTED', 'ACKNOWLEDGED', 'ARCHIVED'))
);

CREATE INDEX IF NOT EXISTS idx_site_handovers_site_date ON public.site_handovers(site_id, handover_date DESC, shift);
CREATE INDEX IF NOT EXISTS idx_site_handovers_status ON public.site_handovers(site_id, status, updated_at DESC);

ALTER TABLE public.site_handovers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "No public handover access" ON public.site_handovers FOR ALL USING (false) WITH CHECK (false);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
