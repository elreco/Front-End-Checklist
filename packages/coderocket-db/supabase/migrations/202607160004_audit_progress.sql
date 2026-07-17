-- Expose durable, owner-scoped progress for long-running website checks.
-- Progress lives on the existing PostgreSQL job so no second queue or event store is required.

alter table public.cr_jobs
  add column if not exists progress_stage text not null default 'queued'
    check (progress_stage in (
      'queued',
      'starting',
      'checking_pages',
      'comparing',
      'saving',
      'retrying',
      'completed'
    )),
  add column if not exists progress_current integer not null default 0
    check (progress_current >= 0),
  add column if not exists progress_total integer not null default 0
    check (progress_total >= 0),
  add column if not exists progress_message text,
  add column if not exists progress_updated_at timestamptz not null default now();

create index if not exists cr_jobs_project_activity_idx
  on public.cr_jobs(owner_id, project_id, created_at desc);

comment on column public.cr_jobs.progress_stage is
  'Stable customer-facing stage for an asynchronous website check.';
comment on column public.cr_jobs.progress_current is
  'Number of configured pages fully checked by the worker.';
comment on column public.cr_jobs.progress_total is
  'Total number of pages the worker plans to check.';
comment on column public.cr_jobs.progress_message is
  'Short safe status message suitable for the authenticated product UI.';
comment on column public.cr_jobs.progress_updated_at is
  'Last time the worker reported meaningful progress.';
