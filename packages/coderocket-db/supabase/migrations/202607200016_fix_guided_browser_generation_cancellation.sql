-- Make the existing guided-browser stop action a complete website-generation cancellation.
-- It closes the encrypted session, settles only the browser cost already incurred, returns any
-- visible creation credits, and uses the same owner-requested terminal state as every other stop.

create or replace function public.cr_cancel_builder_browser_handoff(
  p_owner_id uuid,
  p_site_id uuid,
  p_provider_cost_microeur bigint
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  queued_job_id uuid;
  reserved_cost bigint;
  actual_cost bigint := greatest(p_provider_cost_microeur, 0);
begin
  select job_id into queued_job_id
  from public.cr_builder_browser_handoffs
  where site_id = p_site_id
    and owner_id = p_owner_id
    and status = 'ready'
    and encrypted_session is not null
  for update;
  if queued_job_id is null then raise exception 'Guided browser session not found'; end if;

  select provider_cost_microeur into reserved_cost
  from public.cr_builder_cost_ledger
  where job_id = queued_job_id
    and site_id = p_site_id
    and owner_id = p_owner_id
    and entry_type = 'reserve'
  for update;
  if reserved_cost is null then raise exception 'Website import reservation not found'; end if;
  if actual_cost > reserved_cost then
    raise exception 'Provider cost exceeded the reserved margin budget';
  end if;

  update public.cr_builder_browser_handoffs
  set encrypted_session = null,
      status = 'cancelled',
      last_error = null,
      updated_at = now()
  where site_id = p_site_id and owner_id = p_owner_id;

  update public.cr_builder_sites
  set status = 'failed',
      status_message = 'Creation stopped by you',
      last_error = 'cancelled_by_owner',
      updated_at = now()
  where id = p_site_id
    and owner_id = p_owner_id
    and status = 'waiting_for_access';

  update public.cr_jobs
  set status = 'failed',
      cancelled_at = now(),
      cancelled_by = p_owner_id,
      completed_at = now(),
      last_error = 'cancelled_by_owner',
      lease_owner = null,
      lease_expires_at = null,
      progress_stage = 'completed',
      progress_message = 'Creation stopped by you',
      progress_updated_at = now()
  where id = queued_job_id
    and owner_id = p_owner_id
    and builder_site_id = p_site_id
    and kind = 'site_import'
    and status = 'queued'
    and cancelled_at is null;
  if not found then raise exception 'Website creation job is unavailable'; end if;

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
    p_owner_id,
    p_site_id,
    queued_job_id,
    'cancelled',
    'completed',
    'failed',
    'Creation stopped by you',
    'Nothing was published. You can start again from the same website whenever you are ready.',
    100
  )
  on conflict (job_id, event_key) do nothing;

  perform public.cr_refund_builder_job_credits(queued_job_id);

  update public.cr_builder_usage_accounts
  set reserved_cost_microeur = greatest(reserved_cost_microeur - reserved_cost, 0),
      consumed_cost_microeur = consumed_cost_microeur + actual_cost,
      updated_at = now()
  where owner_id = p_owner_id;

  insert into public.cr_builder_cost_ledger (
    owner_id, site_id, job_id, entry_type, provider_cost_microeur
  ) values (
    p_owner_id, p_site_id, queued_job_id, 'charge', actual_cost
  ) on conflict (job_id, entry_type) do nothing;

  insert into public.cr_builder_cost_ledger (
    owner_id, site_id, job_id, entry_type, provider_cost_microeur
  ) values (
    p_owner_id, p_site_id, queued_job_id, 'release', reserved_cost - actual_cost
  ) on conflict (job_id, entry_type) do nothing;
end;
$$;

revoke all on function public.cr_cancel_builder_browser_handoff(uuid, uuid, bigint)
  from public, anon, authenticated;
grant execute on function public.cr_cancel_builder_browser_handoff(uuid, uuid, bigint)
  to service_role;
