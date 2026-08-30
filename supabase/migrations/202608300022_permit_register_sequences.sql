CREATE TABLE IF NOT EXISTS public.permit_register_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id text NOT NULL REFERENCES public.permit_templates(id) ON DELETE CASCADE,
  site_id text NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  year integer NOT NULL,
  prefix text NOT NULL,
  last_number integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(template_id, site_id, year)
);

INSERT INTO public.permit_register_sequences (template_id, site_id, year, prefix, last_number)
SELECT
  template_id,
  site_id,
  year_value,
  prefix_value,
  MAX(sequence_value)
FROM (
  SELECT
    p.template_id,
    p.site_id,
    COALESCE((regexp_match(p.permit_number, '-([0-9]{4})-[0-9]+$'))[1]::integer, EXTRACT(YEAR FROM p.created_at)::integer) AS year_value,
    regexp_replace(p.permit_number, '[0-9]+$', '') AS prefix_value,
    COALESCE((regexp_match(p.permit_number, '-([0-9]+)$'))[1]::integer, 0) AS sequence_value
  FROM public.permits p
) existing_permits
GROUP BY template_id, site_id, year_value, prefix_value
ON CONFLICT(template_id, site_id, year) DO UPDATE SET
  prefix = excluded.prefix,
  last_number = GREATEST(public.permit_register_sequences.last_number, excluded.last_number),
  updated_at = now();

CREATE OR REPLACE FUNCTION public.next_permit_register_number(
  p_template_id text,
  p_site_id text,
  p_year integer,
  p_prefix text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_number integer;
BEGIN
  INSERT INTO public.permit_register_sequences (template_id, site_id, year, prefix, last_number)
  VALUES (p_template_id, p_site_id, p_year, p_prefix, 1)
  ON CONFLICT(template_id, site_id, year) DO UPDATE SET
    last_number = public.permit_register_sequences.last_number + 1,
    prefix = excluded.prefix,
    updated_at = now()
  RETURNING last_number INTO next_number;

  RETURN p_prefix || lpad(next_number::text, 4, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.next_permit_register_number(text, text, integer, text) FROM PUBLIC;

ALTER TABLE public.permit_register_sequences ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "No public permit register sequence access" ON public.permit_register_sequences FOR ALL USING (false) WITH CHECK (false);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
