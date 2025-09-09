-- 1) Extensions
create extension if not exists vector; -- pgvector
create extension if not exists pg_trgm; -- helpful for hybrid search (optional)

-- 2) Documents table
create table if not exists public.documents (
  id bigserial primary key,
  content text not null,              -- chunk text
  metadata jsonb not null default '{}',
  embedding vector(768) not null,     -- 768 for text-embedding-004
  source text,                        -- file path/URL
  page int,
  department text,
  allowed_roles text[] not null default '{}', -- for RBAC filtering
  uploader uuid default auth.uid(),
  created_at timestamptz not null default now()
);

-- 3) RPC that respects RLS (SECURITY INVOKER is default in Supabase)
create or replace function public.match_documents (
  query_embedding vector(768),
  match_count int default 4,
  filter jsonb default '{}'::jsonb,
  role text default null
) returns table (
  id bigint,
  content text,
  metadata jsonb,
  similarity float4,
  source text,
  page int
) language plpgsql as $$
begin
  return query
  select
    d.id,
    d.content,
    d.metadata,
    (1 - (d.embedding <=> query_embedding))::float4 as similarity, -- cosine
    d.source,
    d.page
  from public.documents d
  where
    -- JSONB filter (e.g., {"department":"HR"} or {"role_access":["HR"]})
    (d.metadata @> filter)
    and (role is null or role = any(d.allowed_roles))
  order by d.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- 4) Helper RPC for batch insert with vectors
create or replace function public.insert_documents_batch(rows jsonb)
returns jsonb
language plpgsql
as $$
declare
  r jsonb;
  inserted jsonb := '[]'::jsonb;
  vec_array float8[];
  vec_str text;
begin
  for r in select * from jsonb_array_elements(rows)
  loop
    -- Convert JSON array string to vector
    vec_str := replace(replace(r->>'embedding','[',''),']','');
    vec_array := string_to_array(vec_str, ',')::float8[];
    
    insert into public.documents (content, metadata, embedding, source, page, department, allowed_roles)
    values (
      (r->>'content'),
      (r->'metadata'),
      vec_array::vector,
      (r->>'source'),
      nullif((r->>'page'),'')::int,
      (r->>'department'),
      (select array_agg(trim('"' from elem::text)) from jsonb_array_elements_text(r->'allowed_roles') elem)
    )
    returning to_jsonb(documents.*) into r;
    inserted := inserted || r;
  end loop;
  return inserted;
end;
$$;

-- 5) Indexes (adjust lists as corpus grows)
create index if not exists idx_documents_embedding
  on public.documents using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create index if not exists idx_documents_metadata_gin
  on public.documents using gin (metadata jsonb_path_ops);

create index if not exists idx_documents_allowed_roles
  on public.documents using gin (allowed_roles);

-- 6) Basic RLS (optional for demo; turn on if you'll attach auth)
alter table public.documents enable row level security;

-- Map user -> one role (simplest). You can extend to many-to-many later.
create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('HR','Procurement','Engineer','StationController','Director'))
);

-- helper to fetch caller role
create or replace function public.my_role() returns text
language sql security invoker as $$
  select role from public.user_roles where user_id = auth.uid();
$$;

-- SELECT policy: user sees docs if their role intersects allowed_roles
create policy if not exists "read_by_role"
  on public.documents for select
  using (
    -- if no auth (service server) you'll bypass RLS anyway;
    -- if authenticated, check role membership
    (select coalesce(public.my_role(), '')) = any (allowed_roles)
  );

-- INSERT policy: allow server/service key or owners
create policy if not exists "insert_by_owner"
  on public.documents for insert
  with check (uploader = auth.uid());