-- Keep website recreation understandable in real time without exposing worker logs, prompts,
-- provider payloads, or source code. Visual captures stay private and expire after one day.

create table public.cr_builder_import_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  site_id uuid not null references public.cr_builder_sites(id) on delete cascade,
  job_id uuid not null references public.cr_jobs(id) on delete cascade,
  event_key text not null check (char_length(event_key) between 1 and 80),
  stage text not null check (stage in (
    'queued',
    'starting',
    'checking_pages',
    'comparing',
    'saving',
    'retrying',
    'completed'
  )),
  event_kind text not null check (event_kind in (
    'queued',
    'progress',
    'capture',
    'ai',
    'page',
    'warning',
    'completed',
    'failed'
  )),
  title text not null check (char_length(title) between 1 and 120),
  detail text check (detail is null or char_length(detail) between 1 and 500),
  progress integer not null check (progress between 0 and 100),
  artifact_path text check (
    artifact_path is null
    or (
      char_length(artifact_path) between 1 and 500
      and artifact_path not like '/%'
      and artifact_path not like '%..%'
    )
  ),
  artifact_kind text check (
    artifact_kind is null or artifact_kind in ('desktop', 'mobile')
  ),
  artifact_expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (job_id, event_key),
  check (
    (artifact_path is null and artifact_kind is null and artifact_expires_at is null)
    or (
      artifact_path is not null
      and artifact_kind is not null
      and artifact_expires_at is not null
    )
  )
);

create index cr_builder_import_events_site_activity_idx
  on public.cr_builder_import_events(owner_id, site_id, created_at);
create index cr_builder_import_events_expired_artifacts_idx
  on public.cr_builder_import_events(artifact_expires_at)
  where artifact_path is not null;

alter table public.cr_builder_import_events enable row level security;
create policy cr_builder_import_events_owner_select
  on public.cr_builder_import_events for select
  using (auth.uid() = owner_id);

revoke all privileges on table public.cr_builder_import_events from anon, authenticated;
grant select on table public.cr_builder_import_events to authenticated;
grant all privileges on table public.cr_builder_import_events to service_role;

create or replace function public.cr_record_builder_import_queued()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.kind = 'site_import' and new.builder_site_id is not null then
    insert into public.cr_builder_import_events (
      owner_id,
      site_id,
      job_id,
      event_key,
      stage,
      event_kind,
      title,
      detail,
      progress
    ) values (
      new.owner_id,
      new.builder_site_id,
      new.id,
      'queued',
      'queued',
      'queued',
      'Request received',
      'Your website is safely waiting for CodeRocket to begin.',
      3
    )
    on conflict (job_id, event_key) do nothing;
  end if;
  return new;
end;
$$;

create trigger cr_jobs_record_builder_import_queued
after insert on public.cr_jobs
for each row execute function public.cr_record_builder_import_queued();

revoke all on function public.cr_record_builder_import_queued() from public, anon, authenticated;

insert into public.cr_builder_import_events (
  owner_id,
  site_id,
  job_id,
  event_key,
  stage,
  event_kind,
  title,
  detail,
  progress
)
select
  jobs.owner_id,
  jobs.builder_site_id,
  jobs.id,
  'queued',
  'queued',
  'queued',
  'Request received',
  'Your website is safely waiting for CodeRocket to begin.',
  3
from public.cr_jobs jobs
where jobs.kind = 'site_import'
  and jobs.builder_site_id is not null
  and jobs.status in ('queued', 'leased')
on conflict (job_id, event_key) do nothing;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'cr-builder-imports',
  'cr-builder-imports',
  false,
  3145728,
  array['image/jpeg']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy cr_builder_import_artifacts_owner_select
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'cr-builder-imports'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

do $$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'cr_builder_import_events'
  ) then
    alter publication supabase_realtime add table public.cr_builder_import_events;
  end if;
end;
$$;

comment on table public.cr_builder_import_events is
  'Owner-visible recreation milestones only. Never raw worker logs, prompts, source code, or secrets.';
comment on column public.cr_builder_import_events.artifact_path is
  'Private temporary Supabase Storage path for a bounded source-page screenshot.';
