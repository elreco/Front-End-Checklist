-- Allow the cloud browser to sign in with a dedicated, revocable test account.
alter table public.cr_project_access_connections
  drop constraint if exists cr_project_access_connections_kind_check;

alter table public.cr_project_access_connections
  add constraint cr_project_access_connections_kind_check
  check (
    kind in (
      'browser_login',
      'vercel',
      'cloudflare',
      'basic_auth',
      'bearer_token',
      'session_cookie',
      'custom_headers'
    )
  );

comment on column public.cr_project_access_connections.kind is
  'Secret-free access method discriminator. browser_login credentials remain inside encrypted_headers.';
