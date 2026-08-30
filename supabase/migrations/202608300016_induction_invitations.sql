CREATE TABLE IF NOT EXISTS public.induction_invitations (
  id text PRIMARY KEY,
  token_hash text NOT NULL UNIQUE,
  site_id text NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  project_id text REFERENCES public.projects(id) ON DELETE SET NULL,
  contractor_id text NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  operative_id text REFERENCES public.operatives(id) ON DELETE SET NULL,
  submission_id text REFERENCES public.submissions(id) ON DELETE SET NULL,
  invited_full_name text,
  invited_email text,
  invited_phone text,
  role text,
  status text NOT NULL DEFAULT 'INVITED' CHECK (status IN ('INVITED', 'SUBMITTED', 'REVOKED', 'EXPIRED')),
  expires_at timestamptz NOT NULL,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz,
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_induction_invitations_site ON public.induction_invitations(site_id, contractor_id, status);
CREATE INDEX IF NOT EXISTS idx_induction_invitations_submission ON public.induction_invitations(submission_id);
CREATE INDEX IF NOT EXISTS idx_induction_invitations_expires ON public.induction_invitations(expires_at);

ALTER TABLE public.induction_invitations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "No public induction invitation access" ON public.induction_invitations FOR ALL USING (false) WITH CHECK (false);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
