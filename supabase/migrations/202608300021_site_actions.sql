CREATE TABLE IF NOT EXISTS public.site_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id text NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  project_id text REFERENCES public.projects(id) ON DELETE SET NULL,
  source_type text NOT NULL DEFAULT 'manager_note',
  source_id text,
  source_label text,
  title text NOT NULL,
  description text,
  owner_name text,
  owner_company text,
  status text NOT NULL DEFAULT 'OPEN',
  priority text NOT NULL DEFAULT 'MEDIUM',
  due_date date,
  closed_at timestamptz,
  closed_by text,
  closed_notes text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_actions_status_check CHECK (status IN ('OPEN', 'IN_PROGRESS', 'BLOCKED', 'CLOSED', 'CANCELLED')),
  CONSTRAINT site_actions_priority_check CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH'))
);

CREATE INDEX IF NOT EXISTS idx_site_actions_site_status ON public.site_actions(site_id, status, due_date ASC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_actions_source ON public.site_actions(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_site_actions_owner ON public.site_actions(site_id, owner_name, status);

ALTER TABLE public.site_actions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "No public site action access" ON public.site_actions FOR ALL USING (false) WITH CHECK (false);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
