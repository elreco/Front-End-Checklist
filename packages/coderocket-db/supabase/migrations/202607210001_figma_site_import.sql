-- Let an owner connect Figma once, select a bounded set of screens, and send them through the
-- existing private website-import queue. OAuth tokens remain encrypted and service-role-only.

create table public.cr_figma_connections (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  encrypted_credentials text not null
    check (char_length(encrypted_credentials) between 40 and 30000),
  figma_user_id text check (figma_user_id is null or char_length(figma_user_id) between 1 and 160),
  status text not null default 'connected' check (status in ('connected', 'expired', 'revoked')),
  expires_at timestamptz not null,
  last_error text check (last_error is null or char_length(last_error) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.cr_figma_connections enable row level security;
revoke all privileges on table public.cr_figma_connections from anon, authenticated;
grant all privileges on table public.cr_figma_connections to service_role;

create table public.cr_builder_figma_sources (
  site_id uuid primary key references public.cr_builder_sites(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  file_key text not null check (file_key ~ '^[A-Za-z0-9_-]{6,128}$'),
  selected_node_ids text[] not null
    check (cardinality(selected_node_ids) between 1 and 5),
  selected_screen_names text[] not null
    check (
      cardinality(selected_screen_names) = cardinality(selected_node_ids)
      and cardinality(selected_screen_names) between 1 and 5
    ),
  created_at timestamptz not null default now(),
  unique (owner_id, site_id)
);
create index cr_builder_figma_sources_owner_idx
  on public.cr_builder_figma_sources(owner_id, created_at desc);
alter table public.cr_builder_figma_sources enable row level security;
create policy cr_builder_figma_sources_owner_select
  on public.cr_builder_figma_sources for select
  using (auth.uid() = owner_id);
revoke all privileges on table public.cr_builder_figma_sources from anon, authenticated;
grant select on table public.cr_builder_figma_sources to authenticated;
grant all privileges on table public.cr_builder_figma_sources to service_role;

alter table public.cr_builder_import_events
  drop constraint if exists cr_builder_import_events_artifact_kind_check;
alter table public.cr_builder_import_events
  add constraint cr_builder_import_events_artifact_kind_check
  check (artifact_kind is null or artifact_kind in ('desktop', 'mobile', 'figma'));

create or replace function public.cr_request_figma_import(
  p_source_url text,
  p_name text,
  p_source_mode text,
  p_initial_instruction text,
  p_file_key text,
  p_node_ids text[],
  p_screen_names text[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_owner uuid := auth.uid();
  site_id uuid;
  queued_job_id uuid;
begin
  if current_owner is null then raise exception 'Authentication required'; end if;
  if p_source_url !~ '^https://(www\.)?figma\.com/(design|file|proto|board|slides|make)/'
    or p_file_key !~ '^[A-Za-z0-9_-]{6,128}$'
    or cardinality(p_node_ids) not between 1 and 5
    or cardinality(p_screen_names) <> cardinality(p_node_ids)
    or cardinality(p_node_ids) <> (
      select count(distinct node_id) from unnest(p_node_ids) as node_id
    )
    or exists (
      select 1 from unnest(p_node_ids) as node_id
      where node_id !~ '^[0-9]+(:[0-9]+)+$'
    )
    or exists (
      select 1 from unnest(p_screen_names) as screen_name
      where char_length(trim(screen_name)) not between 1 and 120
    ) then
    raise exception 'Invalid Figma import request';
  end if;
  if not exists (
    select 1 from public.cr_figma_connections
    where owner_id = current_owner and status = 'connected'
  ) then
    raise exception 'Connect Figma before importing a design';
  end if;

  site_id := public.cr_request_site_import(
    p_source_url,
    p_name,
    p_source_mode,
    p_initial_instruction
  );
  insert into public.cr_builder_figma_sources (
    site_id, owner_id, file_key, selected_node_ids, selected_screen_names
  ) values (
    site_id, current_owner, p_file_key, p_node_ids, p_screen_names
  );
  update public.cr_builder_sites
  set status_message = case
        when nullif(trim(p_initial_instruction), '') is null
          then 'Waiting to read the selected Figma screens'
        else 'Waiting to read the selected Figma screens · your extra request is saved'
      end,
      updated_at = now()
  where id = site_id and owner_id = current_owner;
  update public.cr_jobs
  set payload = payload || jsonb_build_object('sourceType', 'figma'),
      progress_message = 'Waiting to read the selected Figma screens',
      progress_updated_at = now()
  where builder_site_id = site_id
    and owner_id = current_owner
    and kind = 'site_import'
    and status = 'queued'
  returning id into queued_job_id;
  update public.cr_builder_import_events
  set detail = 'Your selected Figma screens are safely waiting for CodeRocket to begin.'
  where job_id = queued_job_id and event_key = 'queued';
  return site_id;
end;
$$;

create or replace function public.cr_retry_figma_import(p_site_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_owner uuid := auth.uid();
  queued_job_id uuid;
begin
  if current_owner is null then raise exception 'Authentication required'; end if;
  if not exists (
    select 1 from public.cr_builder_figma_sources
    where site_id = p_site_id and owner_id = current_owner
  ) then
    raise exception 'Figma source not found';
  end if;
  if not exists (
    select 1 from public.cr_figma_connections
    where owner_id = current_owner and status = 'connected'
  ) then
    raise exception 'Reconnect Figma before retrying this design';
  end if;
  queued_job_id := public.cr_retry_site_import(p_site_id);
  update public.cr_builder_sites
  set status_message = 'Waiting to read the selected Figma screens', updated_at = now()
  where id = p_site_id and owner_id = current_owner;
  update public.cr_jobs
  set payload = payload || jsonb_build_object('sourceType', 'figma'),
      progress_message = 'Waiting to read the selected Figma screens',
      progress_updated_at = now()
  where id = queued_job_id and owner_id = current_owner;
  update public.cr_builder_import_events
  set detail = 'Your selected Figma screens are safely waiting for CodeRocket to begin.'
  where job_id = queued_job_id and event_key = 'queued';
  return queued_job_id;
end;
$$;

revoke all on function public.cr_request_figma_import(text, text, text, text, text, text[], text[])
  from public, anon;
grant execute on function public.cr_request_figma_import(text, text, text, text, text, text[], text[])
  to authenticated;
revoke all on function public.cr_retry_figma_import(uuid) from public, anon;
grant execute on function public.cr_retry_figma_import(uuid) to authenticated;

comment on table public.cr_figma_connections is
  'Encrypted owner-level Figma OAuth connection. Browser roles never read provider tokens.';
comment on table public.cr_builder_figma_sources is
  'Bounded selected Figma screens that enter the normal private site-import workflow.';
