-- Keep iteration references private, owner-scoped, and tied to the exact message that used them.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'cr-builder-prompt-files',
  'cr-builder-prompt-files',
  false,
  5242880,
  array[
    'application/json',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/avif',
    'image/gif',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/csv',
    'text/markdown',
    'text/plain'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.cr_builder_message_attachments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  site_id uuid not null references public.cr_builder_sites(id) on delete cascade,
  message_id uuid references public.cr_builder_messages(id) on delete cascade,
  composer_id uuid not null,
  storage_path text not null unique check (char_length(storage_path) between 20 and 500),
  file_name text not null check (char_length(file_name) between 1 and 160),
  mime_type text not null check (char_length(mime_type) between 3 and 160),
  byte_size integer not null check (byte_size between 1 and 5242880),
  status text not null default 'pending' check (status in ('pending', 'attached')),
  created_at timestamptz not null default now(),
  check (
    (status = 'pending' and message_id is null)
    or (status = 'attached' and message_id is not null)
  )
);
create index if not exists cr_builder_message_attachments_message_idx
  on public.cr_builder_message_attachments(owner_id, site_id, message_id);

alter table public.cr_builder_message_attachments enable row level security;
drop policy if exists cr_builder_message_attachments_owner_select
  on public.cr_builder_message_attachments;
create policy cr_builder_message_attachments_owner_select
  on public.cr_builder_message_attachments for select
  using (auth.uid() = owner_id);

revoke all privileges on table public.cr_builder_message_attachments from anon, authenticated;
grant select on table public.cr_builder_message_attachments to authenticated;
grant all privileges on table public.cr_builder_message_attachments to service_role;

create or replace function public.cr_request_site_edit_with_context(
  p_site_id uuid,
  p_instruction text,
  p_selection jsonb,
  p_attachment_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_owner uuid := auth.uid();
  queued_job_id uuid;
  user_message_id uuid;
  attachment_ids uuid[] := coalesce(p_attachment_ids, array[]::uuid[]);
begin
  if current_owner is null then raise exception 'Authentication required'; end if;
  if cardinality(attachment_ids) > 3 then
    raise exception 'Choose up to three reference files';
  end if;
  if cardinality(attachment_ids) <> (
    select count(distinct attachment_id)
    from unnest(attachment_ids) as attachment_id
  ) then
    raise exception 'A reference file was selected more than once';
  end if;
  if cardinality(attachment_ids) <> (
    select count(*)
    from public.cr_builder_message_attachments attachments
    where attachments.id = any(attachment_ids)
      and attachments.owner_id = current_owner
      and attachments.site_id = p_site_id
      and attachments.status = 'pending'
      and attachments.message_id is null
      and attachments.created_at > now() - interval '24 hours'
  ) then
    raise exception 'One of the reference files is no longer available';
  end if;

  queued_job_id := public.cr_request_site_edit_with_selection(
    p_site_id,
    p_instruction,
    p_selection
  );
  select messages.id into user_message_id
  from public.cr_builder_messages messages
  where messages.job_id = queued_job_id
    and messages.owner_id = current_owner
    and messages.role = 'user';
  update public.cr_builder_message_attachments
  set message_id = user_message_id, status = 'attached'
  where id = any(attachment_ids)
    and owner_id = current_owner
    and site_id = p_site_id
    and status = 'pending';
  return queued_job_id;
end;
$$;

revoke all on function public.cr_request_site_edit_with_context(uuid, text, jsonb, uuid[])
  from public, anon;
grant execute on function public.cr_request_site_edit_with_context(uuid, text, jsonb, uuid[])
  to authenticated;

comment on table public.cr_builder_message_attachments is
  'Private visual and document context explicitly attached to one owner website iteration.';

create table if not exists public.cr_builder_voice_windows (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count between 0 and 10)
);
alter table public.cr_builder_voice_windows enable row level security;
revoke all privileges on table public.cr_builder_voice_windows from anon, authenticated;
grant all privileges on table public.cr_builder_voice_windows to service_role;

create or replace function public.cr_take_voice_transcription_slot()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_owner uuid := auth.uid();
  granted boolean;
begin
  if current_owner is null then raise exception 'Authentication required'; end if;
  insert into public.cr_builder_voice_windows (
    owner_id,
    window_started_at,
    request_count
  ) values (
    current_owner,
    now(),
    1
  )
  on conflict (owner_id) do update
  set window_started_at = case
        when cr_builder_voice_windows.window_started_at <= now() - interval '1 hour'
          then now()
        else cr_builder_voice_windows.window_started_at
      end,
      request_count = case
        when cr_builder_voice_windows.window_started_at <= now() - interval '1 hour'
          then 1
        else cr_builder_voice_windows.request_count + 1
      end
  where cr_builder_voice_windows.window_started_at <= now() - interval '1 hour'
    or cr_builder_voice_windows.request_count < 10
  returning true into granted;
  return coalesce(granted, false);
end;
$$;

revoke all on function public.cr_take_voice_transcription_slot() from public, anon;
grant execute on function public.cr_take_voice_transcription_slot() to authenticated;

comment on table public.cr_builder_voice_windows is
  'Hourly owner limit for transient voice-to-prompt transcription requests.';
