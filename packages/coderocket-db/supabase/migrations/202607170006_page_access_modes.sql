alter table public.cr_projects
  add column if not exists authenticated_page_paths text[] not null default array[]::text[];

alter table public.cr_projects
  add column if not exists secure_runner_required boolean not null default false;

update public.cr_projects
set authenticated_page_paths = case
      when access_mode = 'private' and cardinality(authenticated_page_paths) = 0 then page_paths
      else authenticated_page_paths
    end,
    secure_runner_required = access_mode <> 'public';

alter table public.cr_projects
  add constraint cr_projects_valid_authenticated_page_paths
  check (
    (
      cardinality(authenticated_page_paths) = 0
      or public.cr_valid_page_paths(authenticated_page_paths)
    )
    and authenticated_page_paths <@ page_paths
  ) not valid;

alter table public.cr_projects
  validate constraint cr_projects_valid_authenticated_page_paths;

comment on column public.cr_projects.authenticated_page_paths is
  'Monitored paths that must receive the dedicated application session during secure runner checks. Other monitored paths remain anonymous.';

comment on column public.cr_projects.secure_runner_required is
  'Whether checks must run in the customer-controlled environment because of authentication, edge protection, allowlists, certificates, or private networking.';
