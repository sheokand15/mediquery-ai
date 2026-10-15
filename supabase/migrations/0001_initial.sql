create extension if not exists vector with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.profiles(id) values(new.id); return new; end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('application/pdf','text/plain')),
  file_size bigint not null check (file_size > 0 and file_size <= 10485760),
  status text not null default 'processing' check (status in ('processing','ready','failed')),
  page_count integer,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index documents_user_created_idx on public.documents(user_id, created_at desc);
create table public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  page_number integer,
  char_count integer not null,
  embedding extensions.vector(1536),
  search_vector tsvector generated always as (to_tsvector('english', coalesce(content,''))) stored,
  created_at timestamptz not null default now(),
  unique(document_id, chunk_index)
);
create index chunks_search_idx on public.document_chunks using gin(search_vector);
create index chunks_embedding_idx on public.document_chunks using hnsw (embedding extensions.vector_cosine_ops);
create index chunks_document_idx on public.document_chunks(document_id, chunk_index);
create table public.conversations (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New conversation', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.messages (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete cascade,
  role text not null check(role in ('user','assistant')), content text not null,
  citations jsonb not null default '[]'::jsonb, created_at timestamptz not null default now()
);
create index messages_user_created_idx on public.messages(user_id, created_at desc);

create function public.search_chunks_lexical(query_text text, match_count int default 20, filter_document_ids uuid[] default null)
returns table(id uuid, document_id uuid, document_name text, content text, page_number integer, score real)
language sql stable security invoker set search_path = public, extensions as $$
  select c.id,c.document_id,d.display_name,c.content,c.page_number,ts_rank_cd(c.search_vector, websearch_to_tsquery('english',query_text)) score
  from document_chunks c join documents d on d.id=c.document_id
  where c.user_id=auth.uid() and d.user_id=auth.uid() and d.status='ready'
    and (filter_document_ids is null or c.document_id=any(filter_document_ids))
    and c.search_vector @@ websearch_to_tsquery('english',query_text)
  order by score desc limit least(greatest(match_count,1),100)
$$;
create function public.search_chunks_semantic(query_embedding extensions.vector(1536), match_count int default 20, filter_document_ids uuid[] default null)
returns table(id uuid, document_id uuid, document_name text, content text, page_number integer, score real)
language sql stable security invoker set search_path = public, extensions as $$
  select c.id,c.document_id,d.display_name,c.content,c.page_number,(1-(c.embedding <=> query_embedding))::real score
  from document_chunks c join documents d on d.id=c.document_id
  where c.user_id=auth.uid() and d.user_id=auth.uid() and d.status='ready' and c.embedding is not null
    and (filter_document_ids is null or c.document_id=any(filter_document_ids))
  order by c.embedding <=> query_embedding limit least(greatest(match_count,1),100)
$$;

alter table profiles enable row level security; alter table documents enable row level security;
alter table document_chunks enable row level security; alter table conversations enable row level security;
alter table messages enable row level security;
create policy "profile own" on profiles for all using (id=auth.uid()) with check (id=auth.uid());
create policy "documents own" on documents for all using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "chunks own" on document_chunks for all using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "conversations own" on conversations for all using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "messages own" on messages for all using (user_id=auth.uid()) with check (user_id=auth.uid());
grant select,insert,update,delete on profiles,documents,document_chunks,conversations,messages to authenticated;
grant execute on function search_chunks_lexical(text,int,uuid[]), search_chunks_semantic(extensions.vector,int,uuid[]) to authenticated;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('medical-reports','medical-reports',false,10485760,array['application/pdf','text/plain'])
on conflict(id) do update set public=false,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;
create policy "user upload own medical reports" on storage.objects for insert to authenticated with check (bucket_id='medical-reports' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "user read own medical reports" on storage.objects for select to authenticated using (bucket_id='medical-reports' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "user delete own medical reports" on storage.objects for delete to authenticated using (bucket_id='medical-reports' and (storage.foldername(name))[1]=auth.uid()::text);



