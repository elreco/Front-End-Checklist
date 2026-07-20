-- Preserve the exact visible element a non-technical user selected before requesting an edit.
-- The selection is bounded descriptive context only: no DOM, HTML, CSS selector, or source code.

alter table public.cr_builder_messages
  add column selection jsonb check (
    selection is null
    or (
      jsonb_typeof(selection) = 'object'
      and pg_column_size(selection) <= 4096
      and selection ?& array['kind', 'label', 'pagePath']
      and jsonb_typeof(selection -> 'kind') = 'string'
      and jsonb_typeof(selection -> 'label') = 'string'
      and jsonb_typeof(selection -> 'pagePath') = 'string'
      and selection ->> 'kind' in (
        'brand',
        'section',
        'heading',
        'text',
        'button',
        'image',
        'collection_item'
      )
      and char_length(selection ->> 'label') between 1 and 240
      and char_length(selection ->> 'pagePath') between 1 and 1024
      and selection ->> 'pagePath' ~ '^/[^?#[:space:]]*$'
      and (
        not (selection ? 'sectionId')
        or (
          jsonb_typeof(selection -> 'sectionId') = 'string'
          and selection ->> 'sectionId' ~ '^[a-z0-9-]{1,80}$'
        )
      )
      and (
        not (selection ? 'itemId')
        or (
          jsonb_typeof(selection -> 'itemId') = 'string'
          and selection ->> 'itemId' ~ '^[a-z0-9-]{1,120}$'
        )
      )
    )
  );

create or replace function public.cr_request_site_edit_with_selection(
  p_site_id uuid,
  p_instruction text,
  p_selection jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_owner uuid := auth.uid();
  queued_job_id uuid;
begin
  if current_owner is null then raise exception 'Authentication required'; end if;
  if p_selection is not null and (
    jsonb_typeof(p_selection) <> 'object'
    or pg_column_size(p_selection) > 4096
    or not (p_selection ?& array['kind', 'label', 'pagePath'])
    or jsonb_typeof(p_selection -> 'kind') is distinct from 'string'
    or jsonb_typeof(p_selection -> 'label') is distinct from 'string'
    or jsonb_typeof(p_selection -> 'pagePath') is distinct from 'string'
    or p_selection ->> 'kind' not in (
      'brand',
      'section',
      'heading',
      'text',
      'button',
      'image',
      'collection_item'
    )
    or char_length(p_selection ->> 'label') not between 1 and 240
    or char_length(p_selection ->> 'pagePath') not between 1 and 1024
    or p_selection ->> 'pagePath' !~ '^/[^?#[:space:]]*$'
    or (
      p_selection ? 'sectionId'
      and (
        jsonb_typeof(p_selection -> 'sectionId') is distinct from 'string'
        or p_selection ->> 'sectionId' !~ '^[a-z0-9-]{1,80}$'
      )
    )
    or (
      p_selection ? 'itemId'
      and (
        jsonb_typeof(p_selection -> 'itemId') is distinct from 'string'
        or p_selection ->> 'itemId' !~ '^[a-z0-9-]{1,120}$'
      )
    )
  ) then
    raise exception 'The selected website element is invalid';
  end if;

  queued_job_id := public.cr_request_site_edit(p_site_id, p_instruction);
  update public.cr_builder_messages
  set selection = p_selection
  where job_id = queued_job_id
    and owner_id = current_owner
    and role = 'user';
  return queued_job_id;
end;
$$;

revoke all on function public.cr_request_site_edit_with_selection(uuid, text, jsonb)
  from public, anon;
grant execute on function public.cr_request_site_edit_with_selection(uuid, text, jsonb)
  to authenticated;

comment on column public.cr_builder_messages.selection is
  'Bounded plain-language context for the visible preview element selected by the owner.';
