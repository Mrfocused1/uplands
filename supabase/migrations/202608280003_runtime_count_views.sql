create or replace view public.rams_documents_with_counts as
select
  d.*,
  coalesce(s.section_count, 0)::integer as section_count,
  coalesce(c.chunk_count, 0)::integer as chunk_count
from public.rams_documents d
left join (
  select rams_document_id, count(*) as section_count
  from public.rams_sections
  group by rams_document_id
) s on s.rams_document_id = d.id
left join (
  select rams_document_id, count(*) as chunk_count
  from public.rams_chunks
  group by rams_document_id
) c on c.rams_document_id = d.id;

create or replace view public.submissions_with_counts as
select
  s.*,
  coalesce(e.evidence_count, 0)::integer as evidence_count
from public.submissions s
left join (
  select submission_id, count(*) as evidence_count
  from public.evidence_documents
  where storage_path is not null
  group by submission_id
) e on e.submission_id = s.id;
