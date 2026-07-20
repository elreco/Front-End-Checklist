-- Give every immutable website version a human title and keep optional branch ancestry.

alter table public.cr_site_revisions
  add column if not exists title text;
alter table public.cr_site_revisions
  add column if not exists source_revision_id uuid
    references public.cr_site_revisions(id) on delete set null;

update public.cr_site_revisions revisions
set title = case
  when revisions.revision_number = 1 then 'Initial website'
  else coalesce(
    (
      select left(trim(messages.content), 120)
      from public.cr_builder_messages messages
      where messages.site_id = revisions.site_id
        and messages.owner_id = revisions.owner_id
        and messages.role = 'user'
        and messages.status = 'completed'
        and messages.created_at <= revisions.created_at + interval '10 seconds'
      order by messages.created_at desc
      limit 1
    ),
    'Website update'
  )
end
where revisions.title is null or trim(revisions.title) = '';

alter table public.cr_site_revisions
  alter column title set default 'Initial website';
alter table public.cr_site_revisions
  alter column title set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'cr_site_revisions_title_check'
  ) then
    alter table public.cr_site_revisions
      add constraint cr_site_revisions_title_check
      check (char_length(trim(title)) between 1 and 120);
  end if;
end;
$$;

create index if not exists cr_site_revisions_source_idx
  on public.cr_site_revisions(source_revision_id)
  where source_revision_id is not null;

-- Named content updates power manual edits, connector changes, and "Continue from here".
create or replace function public.cr_update_builder_site_content(
  p_site_id uuid,
  p_site_document jsonb,
  p_revision_title text,
  p_source_revision_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_owner uuid := auth.uid();
  next_revision integer;
  revision_id uuid;
  safe_title text := left(coalesce(nullif(trim(p_revision_title), ''), 'Website update'), 120);
begin
  if current_owner is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(p_site_document) <> 'object'
    or p_site_document ->> 'version' <> '1'
    or jsonb_typeof(p_site_document -> 'sections') <> 'array'
    or jsonb_array_length(p_site_document -> 'sections') not between 1 and 12
    or pg_column_size(p_site_document) > 2097152
    or (
      case
        when not (p_site_document ? 'pages') then false
        when jsonb_typeof(p_site_document -> 'pages') <> 'array' then true
        else jsonb_array_length(p_site_document -> 'pages') not between 1 and 50
      end
    ) then
    raise exception 'Invalid site document';
  end if;
  perform 1 from public.cr_builder_sites
  where id = p_site_id and owner_id = current_owner and archived_at is null
  for update;
  if not found then raise exception 'Website not found'; end if;
  if p_source_revision_id is not null then
    perform 1 from public.cr_site_revisions
    where id = p_source_revision_id and site_id = p_site_id and owner_id = current_owner;
    if not found then raise exception 'Website version not found'; end if;
  end if;
  select coalesce(max(revision_number), 0) + 1 into next_revision
  from public.cr_site_revisions
  where site_id = p_site_id;
  insert into public.cr_site_revisions (
    owner_id,
    site_id,
    revision_number,
    site_document,
    title,
    source_revision_id
  ) values (
    current_owner,
    p_site_id,
    next_revision,
    p_site_document,
    safe_title,
    p_source_revision_id
  ) returning id into revision_id;
  update public.cr_builder_sites
  set status = 'ready', status_message = 'Your changes are ready', updated_at = now()
  where id = p_site_id and owner_id = current_owner;
  return revision_id;
end;
$$;

revoke all on function public.cr_update_builder_site_content(uuid, jsonb, text, uuid)
  from public, anon;
grant execute on function public.cr_update_builder_site_content(uuid, jsonb, text, uuid)
  to authenticated;

comment on column public.cr_site_revisions.title is
  'Short owner-facing description of the visible outcome stored in this immutable version.';
comment on column public.cr_site_revisions.source_revision_id is
  'Optional earlier version selected by the owner before continuing as a new latest version.';
