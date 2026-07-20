-- Let a website owner recreate authorised SaaS screens with a short-lived, encrypted test account.
-- The browser password is never stored in a plaintext column and is removed after the attempt.

create table public.cr_builder_access_connections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  site_id uuid not null unique references public.cr_builder_sites(id) on delete cascade,
  kind text not null default 'browser_login' check (kind = 'browser_login'),
  encrypted_credentials text
    check (
      encrypted_credentials is null
      or char_length(encrypted_credentials) between 40 and 30000
    ),
  status text not null default 'configured'
    check (status in ('configured', 'verified', 'failed', 'removed')),
  display_label text not null default 'Temporary test account'
    check (char_length(display_label) between 1 and 120),
  last_verified_at timestamptz,
  last_error text check (last_error is null or char_length(last_error) <= 500),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status in ('configured', 'verified') and encrypted_credentials is not null)
    or (status in ('failed', 'removed') and encrypted_credentials is null)
  )
);

create index cr_builder_access_connections_owner_idx
  on public.cr_builder_access_connections(owner_id, updated_at desc);

alter table public.cr_builder_access_connections enable row level security;

create policy cr_builder_access_connections_owner_select
  on public.cr_builder_access_connections for select
  using (auth.uid() = owner_id);

revoke all privileges on table public.cr_builder_access_connections from anon, authenticated;
grant select on table public.cr_builder_access_connections to authenticated;

create or replace function public.cr_connect_builder_test_account(
  p_site_id uuid,
  p_source_url text,
  p_encrypted_credentials text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_owner uuid := auth.uid();
  current_source_url text;
  source_origin text;
  queued_job_id uuid;
begin
  if current_owner is null then raise exception 'Authentication required'; end if;
  if p_source_url not like 'https://%'
    or char_length(p_source_url) not between 10 and 2048
    or char_length(p_encrypted_credentials) not between 40 and 30000 then
    raise exception 'Invalid protected website connection';
  end if;

  select source_url into current_source_url
  from public.cr_builder_sites
  where id = p_site_id
    and owner_id = current_owner
    and status = 'failed'
    and archived_at is null
  for update;
  if current_source_url is null then raise exception 'Failed website not found'; end if;

  source_origin := substring(current_source_url from '^(https://[^/]+)');
  if source_origin is null
    or not (p_source_url = source_origin or p_source_url like source_origin || '/%') then
    raise exception 'The private page must belong to the same website';
  end if;

  insert into public.cr_builder_access_connections (
    owner_id,
    site_id,
    encrypted_credentials,
    status,
    display_label,
    last_verified_at,
    last_error,
    expires_at,
    updated_at
  ) values (
    current_owner,
    p_site_id,
    p_encrypted_credentials,
    'configured',
    'Temporary test account',
    null,
    null,
    now() + interval '24 hours',
    now()
  )
  on conflict (site_id) do update
  set encrypted_credentials = excluded.encrypted_credentials,
      status = 'configured',
      display_label = excluded.display_label,
      last_verified_at = null,
      last_error = null,
      expires_at = excluded.expires_at,
      updated_at = now()
  where public.cr_builder_access_connections.owner_id = current_owner;

  update public.cr_builder_sites
  set source_url = p_source_url,
      status_message = 'Waiting to open the private app',
      updated_at = now()
  where id = p_site_id and owner_id = current_owner;

  queued_job_id := public.cr_retry_site_import(p_site_id);
  return queued_job_id;
end;
$$;

revoke all on function public.cr_connect_builder_test_account(uuid, text, text)
  from public, anon;
grant execute on function public.cr_connect_builder_test_account(uuid, text, text)
  to authenticated;

comment on table public.cr_builder_access_connections is
  'Short-lived encrypted test-account access for an authorised private app. Never plaintext credentials, cookies, DOM, or source code.';
comment on column public.cr_builder_access_connections.encrypted_credentials is
  'AES-GCM envelope consumed only by the worker and cleared after the terminal import attempt.';
