alter table public.cr_projects
  add column if not exists email_alerts_enabled boolean not null default true,
  add column if not exists alert_on_new_problems boolean not null default true,
  add column if not exists alert_on_check_failures boolean not null default true;

comment on column public.cr_projects.email_alerts_enabled is
  'Whether CodeRocket may send any actionable email alert for this monitored site.';

comment on column public.cr_projects.alert_on_new_problems is
  'Whether a new urgent or important problem may create an email alert for this site.';

comment on column public.cr_projects.alert_on_check_failures is
  'Whether repeated incomplete or failed checks may create an email alert for this site.';
