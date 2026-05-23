-- Bloomprint Supabase power-ups — all free-tier safe, additive, idempotent.
-- Search (pg_trgm), entitlement enforcement (RPC), plan sharing (RLS + token),
-- realtime, and pgvector scaffolding for plant similarity. (pg_cron job applied separately.)

-- ---------- Extensions (free on Supabase) ----------
create extension if not exists pg_trgm;
create extension if not exists vector;

-- ---------- Trigram fuzzy search over the public source registry ----------
create index if not exists source_registry_name_trgm on public.source_registry using gin (name gin_trgm_ops);

create or replace function public.search_sources(q text, max_results int default 20)
returns setof public.source_registry
language sql stable security definer set search_path = public as $$
  select * from public.source_registry
  where q is null or q = '' or name ilike '%' || q || '%'
  order by similarity(name, coalesce(q, '')) desc nulls last, name
  limit greatest(1, least(max_results, 50));
$$;

-- ---------- Entitlement enforcement: atomic usage increment + quota check ----------
-- The plan limit is decided by the billing layer; this just enforces it atomically against
-- usage_counters (which only the service role / this definer function may write). Returns true
-- when the action is allowed (usage stayed within p_limit).
create or replace function public.check_and_increment_usage(p_metric text, p_period text, p_limit int)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  current_val int;
begin
  if uid is null then
    return false;
  end if;
  insert into public.usage_counters (user_id, period_key, metric, value)
    values (uid, p_period, p_metric, 0)
    on conflict (user_id, period_key, metric) do nothing;
  select value into current_val from public.usage_counters
    where user_id = uid and period_key = p_period and metric = p_metric
    for update;
  if current_val >= p_limit then
    return false;
  end if;
  update public.usage_counters set value = value + 1, updated_at = now()
    where user_id = uid and period_key = p_period and metric = p_metric;
  return true;
end;
$$;

-- ---------- Plan sharing: read-only public plans via a share token ----------
alter table public.projects add column if not exists share_token uuid not null default gen_random_uuid();
alter table public.projects add column if not exists is_public boolean not null default false;
create unique index if not exists projects_share_token_idx on public.projects(share_token);

-- Permissive policies are OR'd with the owner policy: select allowed if owner OR is_public.
drop policy if exists "projects_public_read" on public.projects;
create policy "projects_public_read" on public.projects for select using (is_public = true);

drop policy if exists "plan_versions_public_read" on public.plan_versions;
create policy "plan_versions_public_read" on public.plan_versions for select
  using (exists (select 1 from public.projects p where p.id = plan_versions.project_id and p.is_public = true));

-- ---------- Realtime: clients can subscribe to their own projects/versions ----------
do $$ begin
  alter publication supabase_realtime add table public.projects;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.plan_versions;
exception when duplicate_object then null; end $$;

-- ---------- pgvector scaffolding for plant similarity (embeddings populated later) ----------
-- 384 dims matches Supabase's free built-in `gte-small` model (run from an Edge Function).
create table if not exists public.plant_embeddings (
  plant_id text primary key,
  embedding vector(384)
);
create index if not exists plant_embeddings_hnsw on public.plant_embeddings using hnsw (embedding vector_cosine_ops);
alter table public.plant_embeddings enable row level security;
drop policy if exists "plant_embeddings_read" on public.plant_embeddings;
create policy "plant_embeddings_read" on public.plant_embeddings for select using (true);

create or replace function public.match_plants(query_embedding vector(384), match_count int default 5)
returns table (plant_id text, similarity float)
language sql stable set search_path = public as $$
  select plant_id, 1 - (embedding <=> query_embedding) as similarity
  from public.plant_embeddings
  order by embedding <=> query_embedding
  limit greatest(1, least(match_count, 25));
$$;
