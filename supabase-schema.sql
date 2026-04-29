create extension if not exists "uuid-ossp";
create extension if not exists vector;

create table if not exists public.timetable_documents (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  file_name text not null,
  file_type text not null,
  storage_path text not null,
  extracted_text text,
  processing_status text not null default 'PENDING',
  created_at timestamp with time zone not null default now()
);

create table if not exists public.timetable_chunks (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid not null references public.timetable_documents(id) on delete cascade,
  content text not null,
  embedding vector(1536) not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.timetable_entries (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid not null references public.timetable_documents(id) on delete cascade,
  course_code text,
  course_title text,
  programme text,
  year_semester text,
  study_mode text,
  exam_date text,
  session text,
  start_time text,
  end_time text,
  invigilator text,
  phone text,
  number_of_students integer,
  room text,
  raw_text text,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.timetable_issues (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid not null references public.timetable_documents(id) on delete cascade,
  issue_type text not null,
  severity text not null,
  title text not null,
  description text not null,
  related_entry_id uuid null references public.timetable_entries(id) on delete set null,
  status text not null default 'OPEN',
  created_at timestamp with time zone not null default now()
);

create index if not exists timetable_chunks_document_id_idx
  on public.timetable_chunks (document_id);

create index if not exists timetable_entries_document_id_idx
  on public.timetable_entries (document_id);

create index if not exists timetable_issues_document_id_idx
  on public.timetable_issues (document_id);

create index if not exists timetable_chunks_embedding_idx
  on public.timetable_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create or replace function public.match_timetable_chunks(
  query_embedding vector(1536),
  match_document_id uuid,
  match_count int default 5
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language sql
as $$
  select
    c.id,
    c.document_id,
    c.content,
    c.metadata,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.timetable_chunks c
  where c.document_id = match_document_id
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

