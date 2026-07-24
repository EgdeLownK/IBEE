-- user_profiles : 1:1 avec auth.users, données candidat internes
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  default_resume_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

create policy "user_profiles: own read" on public.user_profiles
  for select using (auth.uid() = user_id);

create policy "user_profiles: own insert" on public.user_profiles
  for insert with check (auth.uid() = user_id);

create policy "user_profiles: own update" on public.user_profiles
  for update using (auth.uid() = user_id);

-- applicant_user_id sur entity_job_applications (nullable pour compat ascendante)
alter table public.entity_job_applications
  add column if not exists applicant_user_id uuid references auth.users(id) on delete set null;

-- Le candidat peut lire ses propres candidatures
create policy "entity_job_apps_applicant_select" on public.entity_job_applications
  for select using (applicant_user_id = auth.uid());

-- favorites : user connecté ou cookie anonyme
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  anonymous_id text,
  entity_id uuid not null references public.entity(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint favorites_has_owner check (user_id is not null or anonymous_id is not null)
);

alter table public.favorites enable row level security;

create policy "favorites: own read" on public.favorites
  for select using (auth.uid() = user_id or (user_id is null and anonymous_id is not null));

create policy "favorites: own insert" on public.favorites
  for insert with check (auth.uid() = user_id or user_id is null);

create policy "favorites: own delete" on public.favorites
  for delete using (auth.uid() = user_id);
