create table public.cr_project_access_connections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null unique references public.cr_projects(id) on delete cascade,
  kind text not null check (
    kind in (
      'vercel',
      'cloudflare',
      'basic_auth',
      'bearer_token',
      'session_cookie',
      'custom_headers'
    )
  ),
  scope text not null check (scope in ('all', 'authenticated')),
  encrypted_headers text not null check (char_length(encrypted_headers) between 40 and 30000),
  status text not null default 'configured' check (status in ('configured', 'verified', 'failed')),
  display_label text not null check (char_length(display_label) between 1 and 120),
  last_verified_at timestamptz,
  last_error text check (last_error is null or char_length(last_error) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index cr_project_access_connections_owner_idx
  on public.cr_project_access_connections(owner_id);

alter table public.cr_project_access_connections enable row level security;

create policy cr_project_access_connections_owner_select
  on public.cr_project_access_connections
  for select using (auth.uid() = owner_id);

create policy cr_project_access_connections_owner_insert
  on public.cr_project_access_connections
  for insert with check (auth.uid() = owner_id);

create policy cr_project_access_connections_owner_update
  on public.cr_project_access_connections
  for update using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy cr_project_access_connections_owner_delete
  on public.cr_project_access_connections
  for delete using (auth.uid() = owner_id);

grant select, insert, update, delete
  on table public.cr_project_access_connections
  to authenticated;

comment on table public.cr_project_access_connections is
  'Encrypted, revocable request headers used only by the CodeRocket cloud checker for one monitored site.';
