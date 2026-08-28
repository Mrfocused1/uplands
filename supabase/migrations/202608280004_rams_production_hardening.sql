do $$
begin
  alter table public.rams_documents
    add constraint rams_documents_processing_status_check
    check (processing_status in ('UPLOADED', 'PROCESSING', 'READY', 'FAILED', 'OCR_REQUIRED')) not valid;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.rams_documents
    add constraint rams_documents_text_extraction_status_check
    check (text_extraction_status in ('PENDING', 'EXTRACTED', 'OCR_REQUIRED', 'FAILED')) not valid;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.rams_sections
    add constraint rams_sections_valid_page_range_check
    check (start_page >= 1 and end_page >= start_page) not valid;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.rams_chunks
    add constraint rams_chunks_valid_page_range_check
    check (page_number >= 1 and end_page_number >= page_number) not valid;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.rams_review_evidence
    add constraint rams_review_evidence_decision_origin_check
    check (decision_origin in ('MANUAL', 'AI', 'AI_EDITED', 'SYSTEM')) not valid;
exception when duplicate_object then null;
end $$;

alter table public.rams_chunks
  add column if not exists search_vector tsvector
  generated always as (to_tsvector('english', coalesce(normalised_text, ''))) stored;

create index if not exists idx_rams_chunks_search_vector
  on public.rams_chunks using gin (search_vector);

create index if not exists idx_rams_chunk_boxes_page
  on public.rams_chunk_boxes (page_number, chunk_id);
