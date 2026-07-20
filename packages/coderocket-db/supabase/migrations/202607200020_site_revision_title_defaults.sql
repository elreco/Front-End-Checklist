-- Give revisions a useful fallback title even when an older writer omits one.

create or replace function public.cr_prepare_site_revision_title()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.title := left(
    coalesce(
      nullif(trim(new.title), ''),
      case
        when new.revision_number = 1 then 'Initial website'
        else 'Website update'
      end
    ),
    120
  );
  return new;
end;
$$;

drop trigger if exists cr_prepare_site_revision_title on public.cr_site_revisions;
create trigger cr_prepare_site_revision_title
before insert on public.cr_site_revisions
for each row execute function public.cr_prepare_site_revision_title();

alter table public.cr_site_revisions
  alter column title drop default;

comment on function public.cr_prepare_site_revision_title() is
  'Applies a safe owner-facing fallback when a website-version writer has no specific title.';
