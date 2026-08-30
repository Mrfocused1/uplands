CREATE TABLE IF NOT EXISTS public.site_activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id text NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  project_id text REFERENCES public.projects(id) ON DELETE SET NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  event_type text NOT NULL,
  title text NOT NULL,
  detail text NOT NULL,
  actor text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  metadata_json jsonb
);

CREATE INDEX IF NOT EXISTS idx_site_activity_site ON public.site_activity_events(site_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_activity_entity ON public.site_activity_events(entity_type, entity_id, occurred_at DESC);

ALTER TABLE public.site_activity_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "No public site activity access" ON public.site_activity_events FOR ALL USING (false) WITH CHECK (false);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
