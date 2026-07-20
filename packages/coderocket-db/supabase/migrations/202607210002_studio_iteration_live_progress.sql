-- Keep guided website changes understandable inside the existing owner-visible conversation.
-- These fields contain stable product milestones only: never model reasoning, prompts, tokens,
-- source code, provider payloads, worker identifiers, or raw errors.

alter table public.cr_builder_messages
  add column if not exists progress_stage text
    check (
      progress_stage is null
      or progress_stage in (
        'queued',
        'starting',
        'comparing',
        'checking_pages',
        'saving',
        'retrying',
        'completed'
      )
    ),
  add column if not exists progress_current integer not null default 0
    check (progress_current >= 0),
  add column if not exists progress_total integer not null default 0
    check (progress_total >= 0),
  add column if not exists progress_message text
    check (
      progress_message is null
      or char_length(progress_message) between 1 and 500
    ),
  add column if not exists progress_updated_at timestamptz;

create or replace function public.cr_prepare_builder_message_progress()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role = 'user'
    and new.job_id is not null
    and new.status in ('queued', 'working') then
    new.progress_stage := coalesce(new.progress_stage, 'queued');
    new.progress_total := case when new.progress_total > 0 then new.progress_total else 5 end;
    new.progress_message := coalesce(new.progress_message, 'Your change is safely waiting');
    new.progress_updated_at := coalesce(new.progress_updated_at, now());
  end if;
  return new;
end;
$$;

drop trigger if exists cr_builder_messages_prepare_progress on public.cr_builder_messages;
create trigger cr_builder_messages_prepare_progress
before insert on public.cr_builder_messages
for each row execute function public.cr_prepare_builder_message_progress();

revoke all on function public.cr_prepare_builder_message_progress() from public, anon, authenticated;

update public.cr_builder_messages messages
set
  progress_stage = case
    when jobs.progress_stage in (
      'queued',
      'starting',
      'comparing',
      'checking_pages',
      'saving',
      'retrying',
      'completed'
    ) then jobs.progress_stage
    else 'queued'
  end,
  progress_current = greatest(jobs.progress_current, 0),
  progress_total = case when jobs.progress_total > 0 then jobs.progress_total else 5 end,
  progress_message = coalesce(
    nullif(trim(jobs.progress_message), ''),
    'Your change is safely waiting'
  ),
  progress_updated_at = coalesce(jobs.progress_updated_at, messages.created_at)
from public.cr_jobs jobs
where messages.job_id = jobs.id
  and jobs.kind = 'site_edit'
  and messages.role = 'user'
  and messages.status in ('queued', 'working');

comment on column public.cr_builder_messages.progress_stage is
  'Stable owner-facing milestone for one guided website change.';
comment on column public.cr_builder_messages.progress_message is
  'Short plain-language iteration update safe for the authenticated conversation.';
