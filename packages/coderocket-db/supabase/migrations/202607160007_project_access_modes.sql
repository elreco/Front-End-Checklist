alter table public.cr_projects
  add column if not exists access_mode text not null default 'public';

alter table public.cr_projects
  drop constraint if exists cr_projects_access_mode_valid;

alter table public.cr_projects
  add constraint cr_projects_access_mode_valid
  check (access_mode in ('public', 'protected', 'private')) not valid;

alter table public.cr_projects
  validate constraint cr_projects_access_mode_valid;

comment on column public.cr_projects.access_mode is
  'How CodeRocket is expected to reach the site: public cloud check, protected public check, or private CI runner.';

create index if not exists cr_projects_access_mode_idx
  on public.cr_projects(owner_id, access_mode)
  where archived_at is null;
