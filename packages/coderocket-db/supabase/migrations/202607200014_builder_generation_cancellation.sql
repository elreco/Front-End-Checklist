-- Let an owner stop either a first website creation or a prompt-driven iteration. Cancellation is
-- atomic with cost release, credit refund, and the guarantee that no late worker may save a version.

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

  -- A completed settlement may briefly precede the worker's terminal job update. Do not label a
  -- version as cancelled after it has already been saved atomically.
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

-- A lost or cancelled lease can never be renewed or marked as successfully completed.
create or replace function public.cr_renew_job_lease(
  p_job_id uuid,
  p_worker_id text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.cr_jobs
  set lease_expires_at = now() + interval '5 minutes'
  where id = p_job_id
    and status = 'leased'
    and lease_owner = p_worker_id
    and cancelled_at is null;
  return found;
end;
$$;

create or replace function public.cr_finish_job(p_job_id uuid, p_worker_id text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.cr_jobs
  set status = 'succeeded',
      completed_at = now(),
      lease_expires_at = null
  where id = p_job_id
    and status = 'leased'
    and lease_owner = p_worker_id
    and cancelled_at is null;
$$;

revoke all on function public.cr_renew_job_lease(uuid, text)
  from public, anon, authenticated;
grant execute on function public.cr_renew_job_lease(uuid, text)
  to service_role;
revoke all on function public.cr_finish_job(uuid, text)
  from public, anon, authenticated;
grant execute on function public.cr_finish_job(uuid, text)
  to service_role;

-- Lock and verify the job in the same transaction that writes the initial revision.
create or replace function public.cr_settle_site_import(
  p_site_id uuid,
  p_job_id uuid,
  p_succeeded boolean,
  p_site_document jsonb,
  p_provider_cost_microeur bigint,
  p_error text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_site public.cr_builder_sites%rowtype;
  reserved_cost bigint;
  next_revision integer;
  actual_cost bigint := greatest(p_provider_cost_microeur, 0);
  active_job boolean;
begin
  select * into source_site
  from public.cr_builder_sites
  where id = p_site_id
  for update;
  if source_site.id is null then raise exception 'Website not found'; end if;

  select true into active_job
  from public.cr_jobs
  where id = p_job_id
    and builder_site_id = p_site_id
    and owner_id = source_site.owner_id
    and kind = 'site_import'
    and status = 'leased'
    and cancelled_at is null
  for update;
  if p_succeeded and active_job is distinct from true then
    raise exception 'Website generation is no longer active';
  end if;

  select provider_cost_microeur into reserved_cost
  from public.cr_builder_cost_ledger
  where job_id = p_job_id and site_id = p_site_id and entry_type = 'reserve';
  if reserved_cost is null then raise exception 'Website import reservation not found'; end if;
  if exists (
    select 1 from public.cr_builder_cost_ledger
    where job_id = p_job_id and site_id = p_site_id and entry_type = 'charge'
  ) then return; end if;
  if actual_cost > reserved_cost then
    raise exception 'Provider cost exceeded the reserved margin budget';
  end if;

  if p_succeeded then
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
    select coalesce(max(revision_number), 0) + 1 into next_revision
    from public.cr_site_revisions
    where site_id = p_site_id;
    insert into public.cr_site_revisions (
      owner_id, site_id, revision_number, site_document
    ) values (
      source_site.owner_id, p_site_id, next_revision, p_site_document
    );
    update public.cr_builder_sites
    set status = 'ready',
        status_message = 'Your first version is ready',
        last_error = null,
        updated_at = now()
    where id = p_site_id;
  else
    update public.cr_builder_sites
    set status = 'failed',
        status_message = 'The source website could not be recreated',
        last_error = left(p_error, 2000),
        updated_at = now()
    where id = p_site_id;
  end if;

  update public.cr_builder_usage_accounts
  set reserved_cost_microeur = greatest(reserved_cost_microeur - reserved_cost, 0),
      consumed_cost_microeur = consumed_cost_microeur + actual_cost,
      updated_at = now()
  where owner_id = source_site.owner_id;
  insert into public.cr_builder_cost_ledger (
    owner_id, site_id, job_id, entry_type, provider_cost_microeur
  ) values (
    source_site.owner_id, p_site_id, p_job_id, 'charge', actual_cost
  ) on conflict (job_id, entry_type) do nothing;
  insert into public.cr_builder_cost_ledger (
    owner_id, site_id, job_id, entry_type, provider_cost_microeur
  ) values (
    source_site.owner_id, p_site_id, p_job_id, 'release', reserved_cost - actual_cost
  ) on conflict (job_id, entry_type) do nothing;
end;
$$;

revoke all on function public.cr_settle_site_import(
  uuid, uuid, boolean, jsonb, bigint, text
) from public, anon, authenticated;
grant execute on function public.cr_settle_site_import(
  uuid, uuid, boolean, jsonb, bigint, text
) to service_role;

-- Apply the same late-write protection to prompt-driven revisions.
create or replace function public.cr_settle_site_edit(
  p_site_id uuid,
  p_job_id uuid,
  p_succeeded boolean,
  p_site_document jsonb,
  p_provider_cost_microeur bigint,
  p_reply text,
  p_error text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_site public.cr_builder_sites%rowtype;
  reserved_cost bigint;
  next_revision integer;
  actual_cost bigint := greatest(p_provider_cost_microeur, 0);
  active_job boolean;
begin
  select * into source_site
  from public.cr_builder_sites
  where id = p_site_id
  for update;
  if source_site.id is null then raise exception 'Website not found'; end if;

  select true into active_job
  from public.cr_jobs
  where id = p_job_id
    and builder_site_id = p_site_id
    and owner_id = source_site.owner_id
    and kind = 'site_edit'
    and status = 'leased'
    and cancelled_at is null
  for update;
  if p_succeeded and active_job is distinct from true then
    raise exception 'Website generation is no longer active';
  end if;

  select provider_cost_microeur into reserved_cost
  from public.cr_builder_cost_ledger
  where job_id = p_job_id and site_id = p_site_id and entry_type = 'reserve';
  if reserved_cost is null then raise exception 'Website edit reservation not found'; end if;
  if exists (
    select 1 from public.cr_builder_cost_ledger
    where job_id = p_job_id and entry_type = 'charge'
  ) then
    return;
  end if;
  if actual_cost > reserved_cost then
    raise exception 'Provider cost exceeded the reserved margin budget';
  end if;

  if p_succeeded then
    if jsonb_typeof(p_site_document) <> 'object'
      or p_site_document ->> 'version' <> '1'
      or jsonb_typeof(p_site_document -> 'sections') <> 'array'
      or jsonb_array_length(p_site_document -> 'sections') not between 1 and 12
      or pg_column_size(p_site_document) > 2097152 then
      raise exception 'Invalid site document';
    end if;
    select coalesce(max(revision_number), 0) + 1 into next_revision
    from public.cr_site_revisions
    where site_id = p_site_id;
    insert into public.cr_site_revisions (
      owner_id, site_id, revision_number, site_document
    ) values (
      source_site.owner_id, p_site_id, next_revision, p_site_document
    );
    update public.cr_builder_messages
    set status = 'completed'
    where job_id = p_job_id and role = 'user';
    insert into public.cr_builder_messages (
      owner_id, site_id, job_id, role, content, status, credit_cost
    ) values (
      source_site.owner_id,
      p_site_id,
      p_job_id,
      'assistant',
      left(trim(p_reply), 4000),
      'completed',
      0
    );
    update public.cr_builder_sites
    set status_message = 'Your latest change is ready', updated_at = now()
    where id = p_site_id;
  else
    update public.cr_builder_messages
    set status = 'failed'
    where job_id = p_job_id and role = 'user';
    insert into public.cr_builder_messages (
      owner_id, site_id, job_id, role, content, status, credit_cost
    ) values (
      source_site.owner_id,
      p_site_id,
      p_job_id,
      'assistant',
      'I could not complete that change safely. Your previous version is unchanged and the credits were returned.',
      'failed',
      0
    );
    perform public.cr_refund_builder_job_credits(p_job_id);
  end if;

  update public.cr_builder_usage_accounts
  set reserved_cost_microeur = greatest(reserved_cost_microeur - reserved_cost, 0),
      consumed_cost_microeur = consumed_cost_microeur + actual_cost,
      updated_at = now()
  where owner_id = source_site.owner_id;
  insert into public.cr_builder_cost_ledger (
    owner_id, site_id, job_id, entry_type, provider_cost_microeur
  ) values (
    source_site.owner_id, p_site_id, p_job_id, 'charge', actual_cost
  ) on conflict (job_id, entry_type) do nothing;
  insert into public.cr_builder_cost_ledger (
    owner_id, site_id, job_id, entry_type, provider_cost_microeur
  ) values (
    source_site.owner_id, p_site_id, p_job_id, 'release', reserved_cost - actual_cost
  ) on conflict (job_id, entry_type) do nothing;
end;
$$;

revoke all on function public.cr_settle_site_edit(
  uuid, uuid, boolean, jsonb, bigint, text, text
) from public, anon, authenticated;
grant execute on function public.cr_settle_site_edit(
  uuid, uuid, boolean, jsonb, bigint, text, text
) to service_role;
