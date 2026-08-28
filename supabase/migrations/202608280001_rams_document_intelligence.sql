create table if not exists public.rams_documents (
  id text primary key,
  title text not null,
  site_name text,
  contractor text not null,
  document_reference text,
  revision text,
  revision_date text,
  file_name text not null,
  storage_key text not null,
  file_size bigint not null,
  mime_type text not null,
  page_count integer,
  processing_status text not null default 'UPLOADED',
  processing_error text,
  text_extraction_status text not null default 'PENDING',
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rams_sections (
  id text primary key,
  rams_document_id text not null references public.rams_documents(id) on delete cascade,
  title text not null,
  start_page integer not null,
  end_page integer not null,
  sort_order integer not null,
  created_at timestamptz not null default now()
);

create table if not exists public.rams_chunks (
  id text primary key,
  rams_document_id text not null references public.rams_documents(id) on delete cascade,
  section_id text references public.rams_sections(id) on delete set null,
  page_number integer not null,
  end_page_number integer not null,
  chunk_index integer not null,
  text text not null,
  normalised_text text not null,
  embedding jsonb,
  token_count integer,
  created_at timestamptz not null default now()
);

create table if not exists public.rams_chunk_boxes (
  id text primary key,
  chunk_id text not null references public.rams_chunks(id) on delete cascade,
  page_number integer not null,
  text text not null,
  x double precision not null,
  y double precision not null,
  width double precision not null,
  height double precision not null,
  page_width double precision,
  page_height double precision,
  sort_order integer not null
);

create table if not exists public.rams_chat_threads (
  id text primary key,
  rams_document_id text not null references public.rams_documents(id) on delete cascade,
  admin_id text,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rams_chat_messages (
  id text primary key,
  thread_id text not null references public.rams_chat_threads(id) on delete cascade,
  role text not null,
  message text not null,
  model text,
  created_at timestamptz not null default now()
);

create table if not exists public.rams_chat_citations (
  id text primary key,
  message_id text not null references public.rams_chat_messages(id) on delete cascade,
  chunk_id text not null references public.rams_chunks(id) on delete cascade,
  citation_order integer not null,
  created_at timestamptz not null default now()
);

create table if not exists public.rams_review_evidence (
  id text primary key,
  rams_document_id text not null references public.rams_documents(id) on delete cascade,
  review_question_key text not null,
  answer text not null,
  comment text,
  chunk_id text references public.rams_chunks(id) on delete set null,
  confidence double precision,
  decision_origin text not null default 'MANUAL',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (rams_document_id, review_question_key, chunk_id)
);

create index if not exists idx_rams_documents_created on public.rams_documents(created_at desc);
create index if not exists idx_rams_documents_status on public.rams_documents(processing_status);
create index if not exists idx_rams_sections_document on public.rams_sections(rams_document_id, sort_order);
create index if not exists idx_rams_chunks_document on public.rams_chunks(rams_document_id, chunk_index);
create index if not exists idx_rams_chunks_document_page on public.rams_chunks(rams_document_id, page_number);
create index if not exists idx_rams_chunk_boxes_chunk on public.rams_chunk_boxes(chunk_id, sort_order);
create index if not exists idx_rams_review_evidence_document on public.rams_review_evidence(rams_document_id, review_question_key);

alter table public.rams_documents enable row level security;
alter table public.rams_sections enable row level security;
alter table public.rams_chunks enable row level security;
alter table public.rams_chunk_boxes enable row level security;
alter table public.rams_chat_threads enable row level security;
alter table public.rams_chat_messages enable row level security;
alter table public.rams_chat_citations enable row level security;
alter table public.rams_review_evidence enable row level security;

create policy "No public RAMS document access" on public.rams_documents for all using (false);
create policy "No public RAMS section access" on public.rams_sections for all using (false);
create policy "No public RAMS chunk access" on public.rams_chunks for all using (false);
create policy "No public RAMS box access" on public.rams_chunk_boxes for all using (false);
create policy "No public RAMS chat thread access" on public.rams_chat_threads for all using (false);
create policy "No public RAMS chat message access" on public.rams_chat_messages for all using (false);
create policy "No public RAMS citation access" on public.rams_chat_citations for all using (false);
create policy "No public RAMS review evidence access" on public.rams_review_evidence for all using (false);

insert into storage.buckets (id, name, public)
values ('rams-documents', 'rams-documents', false)
on conflict (id) do nothing;
