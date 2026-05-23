-- Bloomprint core schema: profiles, properties, projects, plan_versions, project_photos,
-- plus reference/cache tables and the private photo bucket.
-- User-scoped tables are RLS-protected (owners read/write their own rows only).
-- Shapes mirror src/types/supabase.ts so the storage adapters keep type-checking.

-- ---------- Tables ----------

-- One profile row per auth user (id == auth.users.id). Auto-created by trigger below.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  user_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists properties_user_id_idx on public.properties(user_id);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  current_version_id uuid,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists projects_user_id_idx on public.projects(user_id);
create index if not exists projects_created_at_idx on public.projects(created_at desc);

create table if not exists public.plan_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  version_label text not null,
  intake jsonb not null,
  adjustments jsonb not null default '[]'::jsonb,
  deterministic_plan jsonb,
  ai_enhancement jsonb,
  scores jsonb,
  evidence jsonb,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists plan_versions_project_id_idx on public.plan_versions(project_id);
create index if not exists plan_versions_user_id_idx on public.plan_versions(user_id);

-- projects.current_version_id → plan_versions.id (added after both tables exist).
alter table public.projects drop constraint if exists projects_current_version_fk;
alter table public.projects
  add constraint projects_current_version_fk
  foreign key (current_version_id) references public.plan_versions(id) on delete set null;

create table if not exists public.project_photos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);
create index if not exists project_photos_project_id_idx on public.project_photos(project_id);
create index if not exists project_photos_user_id_idx on public.project_photos(user_id);

-- Reference data: public read, service-role writes.
create table if not exists public.source_registry (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source_type text,
  level integer not null,
  url text,
  notes text
);

-- Server-side cache for live data (weather/zones): public read, service-role writes.
create table if not exists public.live_data_cache (
  key text primary key,
  value jsonb not null,
  source jsonb,
  retrieved_at timestamptz not null default now(),
  expires_at timestamptz not null
);

-- AI response cache: service-role only (no client policies → RLS denies all client access).
create table if not exists public.ai_prompt_cache (
  key text primary key,
  value jsonb not null,
  created_at timestamptz not null default now()
);

-- ---------- updated_at triggers ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists properties_set_updated_at on public.properties;
create trigger properties_set_updated_at before update on public.properties
  for each row execute function public.set_updated_at();

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

-- ---------- Auto-create a profile row for each new auth user ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Row Level Security ----------
alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.projects enable row level security;
alter table public.plan_versions enable row level security;
alter table public.project_photos enable row level security;
alter table public.source_registry enable row level security;
alter table public.live_data_cache enable row level security;
alter table public.ai_prompt_cache enable row level security;

-- profiles: owner is the row id.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- properties / projects / plan_versions / project_photos: owner is user_id (full CRUD on own rows).
drop policy if exists "properties_rw_own" on public.properties;
create policy "properties_rw_own" on public.properties for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "projects_rw_own" on public.projects;
create policy "projects_rw_own" on public.projects for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "plan_versions_rw_own" on public.plan_versions;
create policy "plan_versions_rw_own" on public.plan_versions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "project_photos_rw_own" on public.project_photos;
create policy "project_photos_rw_own" on public.project_photos for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Reference + live cache: public read; writes only via service role (no insert/update policies).
drop policy if exists "source_registry_read" on public.source_registry;
create policy "source_registry_read" on public.source_registry for select using (true);
drop policy if exists "live_data_cache_read" on public.live_data_cache;
create policy "live_data_cache_read" on public.live_data_cache for select using (true);
-- ai_prompt_cache: intentionally no policies → only the service role (bypasses RLS) can touch it.

-- ---------- Storage: private photo bucket + per-user-folder policies ----------
insert into storage.buckets (id, name, public)
values ('project-photos', 'project-photos', false)
on conflict (id) do nothing;

-- Photos live at `<userId>/<projectId>/<photoId>.<ext>` → first path segment must equal auth.uid().
drop policy if exists "project_photos_select_own" on storage.objects;
create policy "project_photos_select_own" on storage.objects for select
  using (bucket_id = 'project-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "project_photos_insert_own" on storage.objects;
create policy "project_photos_insert_own" on storage.objects for insert
  with check (bucket_id = 'project-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "project_photos_update_own" on storage.objects;
create policy "project_photos_update_own" on storage.objects for update
  using (bucket_id = 'project-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "project_photos_delete_own" on storage.objects;
create policy "project_photos_delete_own" on storage.objects for delete
  using (bucket_id = 'project-photos' and (storage.foldername(name))[1] = auth.uid()::text);
