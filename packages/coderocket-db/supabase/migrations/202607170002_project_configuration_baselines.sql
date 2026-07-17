alter table public.cr_projects
  add column if not exists baseline_reset_at timestamptz;

comment on column public.cr_projects.baseline_reset_at is
  'Audits created before this timestamp remain in history but cannot be used as the comparison baseline.';
