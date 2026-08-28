create table if not exists public.submissions (
  id text primary key,
  reference text,
  full_name text,
  company_name text,
  site_name text,
  declaration_date text,
  print_review_status text not null default 'not_reviewed',
  print_data text not null,
  pinned integer not null default 0,
  is_sample integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.evidence_documents (
  id text primary key,
  submission_id text not null references public.submissions(id) on delete cascade,
  document_type text not null,
  original_name text,
  mime_type text,
  storage_path text,
  source_width integer,
  source_height integer,
  fit_mode text not null default 'fit',
  offset_x double precision not null default 0,
  offset_y double precision not null default 0,
  scale double precision not null default 1,
  rotation integer not null default 0,
  updated_at timestamptz not null default now(),
  updated_by text
);

create index if not exists idx_submissions_created on public.submissions(created_at desc);
create index if not exists idx_evidence_submission on public.evidence_documents(submission_id);

alter table public.submissions enable row level security;
alter table public.evidence_documents enable row level security;

create policy "No public submission access" on public.submissions for all using (false);
create policy "No public evidence document access" on public.evidence_documents for all using (false);

insert into storage.buckets (id, name, public)
values ('uplands-uploads', 'uplands-uploads', false)
on conflict (id) do nothing;
