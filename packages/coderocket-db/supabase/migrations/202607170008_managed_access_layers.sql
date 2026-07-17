alter table public.cr_project_access_connections
  drop constraint if exists cr_project_access_connections_project_id_key;

alter table public.cr_project_access_connections
  add constraint cr_project_access_connections_project_scope_key unique (project_id, scope);

comment on constraint cr_project_access_connections_project_scope_key
  on public.cr_project_access_connections is
  'Allows one origin-wide and one authenticated-page access bundle so protection layers can be combined safely.';
