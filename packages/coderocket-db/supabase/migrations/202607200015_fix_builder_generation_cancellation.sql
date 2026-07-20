-- Correct the cancellation function on databases where the initial version was already applied.
-- cr_jobs has dedicated progress timestamps rather than a generic updated_at column.

create or replace function public.cr_cancel_builder_generation(p_site_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_owner uuid := auth.uid();
  source_site public.cr_builder_sites%rowtype;
  active_job public.cr_jobs%rowtype;
  reserved_cost bigint;
begin
  if current_owner is null then raise exception 'Authentication required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(current_owner::text, 1));

  select * into source_site
  from public.cr_builder_sites
  where id = p_site_id
    and owner_id = current_owner
    and archived_at is null
  for update;
  if source_site.id is null then raise exception 'Website not found'; end if;

  select * into active_job
  from public.cr_jobs
  where builder_site_id = p_site_id
    and owner_id = current_owner
    and kind in ('site_import', 'site_edit')
    and status in ('queued', 'leased')
    and cancelled_at is null
  order by created_at desc
  limit 1
  for update;
  if active_job.id is null then return null; end if;

  if exists (
    select 1
    from public.cr_builder_cost_ledger
    where job_id = active_job.id and entry_type = 'charge'
  ) then
    return null;
  end if;

  update public.cr_jobs
  set status = 'failed',
      cancelled_at = now(),
      cancelled_by = current_owner,
      completed_at = now(),
      lease_owner = null,
      lease_expires_at = null,
      progress_stage = 'completed',
      progress_message = 'Generation stopped by you',
      progress_updated_at = now(),
      last_error = 'cancelled_by_owner'
  where id = active_job.id;

  if active_job.kind = 'site_import' then
    update public.cr_builder_sites
    set status = 'failed',
        status_message = 'Creation stopped by you',
        last_error = 'cancelled_by_owner',
        updated_at = now()
    where id = p_site_id;

    insert into public.cr_builder_import_events (
      owner_id,
      site_id,
      job_id,
      event_key,
      stage,
      event_kind,
      title,
      detail,
      progress
    ) values (
      current_owner,
      p_site_id,
      active_job.id,
      'cancelled',
      'completed',
      'failed',
      'Creation stopped by you',
      'Nothing was published. You can start again from the same website whenever you are ready.',
      100
    )
    on conflict (job_id, event_key) do nothing;
  else
    update public.cr_builder_sites
    set status_message = 'The change was stopped · your previous version is unchanged',
        updated_at = now()
    where id = p_site_id;

    update public.cr_builder_messages
    set status = 'failed'
    where job_id = active_job.id and role = 'user';

    insert into public.cr_builder_messages (
      owner_id,
      site_id,
      job_id,
      role,
      content,
      status,
      credit_cost
    )
    select
      current_owner,
      p_site_id,
      active_job.id,
      'assistant',
      'Stopped as requested. Your previous version is unchanged and the credits were returned.',
      'failed',
      0
    where not exists (
      select 1
      from public.cr_builder_messages
      where job_id = active_job.id and role = 'assistant'
    );
  end if;

  perform public.cr_refund_builder_job_credits(active_job.id);

  select provider_cost_microeur into reserved_cost
  from public.cr_builder_cost_ledger
  where job_id = active_job.id
    and site_id = p_site_id
    and entry_type = 'reserve'
  for update;

  if reserved_cost is not null then
    update public.cr_builder_usage_accounts
    set reserved_cost_microeur = greatest(reserved_cost_microeur - reserved_cost, 0),
        updated_at = now()
    where owner_id = current_owner;

    insert into public.cr_builder_cost_ledger (
      owner_id, site_id, job_id, entry_type, provider_cost_microeur
    ) values (
      current_owner, p_site_id, active_job.id, 'charge', 0
    ) on conflict (job_id, entry_type) do nothing;

    insert into public.cr_builder_cost_ledger (
      owner_id, site_id, job_id, entry_type, provider_cost_microeur
    ) values (
      current_owner, p_site_id, active_job.id, 'release', reserved_cost
    ) on conflict (job_id, entry_type) do nothing;
  end if;

  return active_job.kind;
end;
$$;

revoke all on function public.cr_cancel_builder_generation(uuid) from public, anon;
grant execute on function public.cr_cancel_builder_generation(uuid) to authenticated;
