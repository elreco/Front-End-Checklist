-- Let an owner stop a queued or running website check without deleting its history.
-- The existing job enum stays unchanged: cancelled jobs are terminal failed jobs with
-- explicit cancellation metadata, which keeps older workers and queries compatible.

alter table public.cr_jobs
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid references auth.users(id) on delete set null;

comment on column public.cr_jobs.cancelled_at is
  'When set, the owner stopped this job and no audit result may be persisted for it.';
comment on column public.cr_jobs.cancelled_by is
  'The authenticated owner who stopped this job.';

create or replace function public.cr_guard_audit_job_persistence()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_status public.cr_job_status;
  stopped_at timestamptz;
begin
  if new.job_id is null then return new; end if;

  select jobs.status, jobs.cancelled_at
  into active_status, stopped_at
  from public.cr_jobs jobs
  where jobs.id = new.job_id
  for update;

  if not found then
    raise exception 'Audit job is unavailable';
  end if;
  if stopped_at is not null or active_status <> 'leased'::public.cr_job_status then
    raise exception 'Audit job is no longer active';
  end if;

  return new;
end;
$$;

drop trigger if exists cr_audits_guard_active_job on public.cr_audits;
create trigger cr_audits_guard_active_job
before insert on public.cr_audits
for each row
when (new.job_id is not null)
execute function public.cr_guard_audit_job_persistence();

revoke all on function public.cr_guard_audit_job_persistence() from public, anon, authenticated;
grant execute on function public.cr_guard_audit_job_persistence() to service_role;
