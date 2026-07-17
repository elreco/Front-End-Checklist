alter table public.cr_projects
  add column if not exists social_image_url text;

alter table public.cr_projects
  drop constraint if exists cr_projects_social_image_url_valid;

alter table public.cr_projects
  add constraint cr_projects_social_image_url_valid
  check (
    social_image_url is null
    or (
      char_length(social_image_url) between 1 and 2048
      and social_image_url like 'https://%'
    )
  );

comment on column public.cr_projects.social_image_url is
  'Validated Open Graph or social preview image discovered during a reachable home-page check.';
