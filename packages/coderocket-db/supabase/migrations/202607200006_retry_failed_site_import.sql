-- Let an owner retry the same failed website without consuming another advertised import.

create or replace function public.cr_retry_site_import(p_site_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_owner uuid := auth.uid();
  current_plan public.cr_plan_id;
  current_period_end timestamptz;
  monthly_cost_limit bigint;
  reservation bigint;
  queued_job_id uuid;
begin
  if current_owner is null then raise exception 'Authentication required'; end if;

  perform 1
  from public.cr_builder_sites
  where id = p_site_id
    and owner_id = current_owner
    and status = 'failed'
    and archived_at is null
  for update;
  if not found then raise exception 'Failed website not found'; end if;

  if exists (
    select 1
    from public.cr_jobs
    where builder_site_id = p_site_id
      and kind = 'site_import'
      and status in ('queued', 'leased')
  ) then
    raise exception 'Website creation is already running';
  end if;

  select subscriptions.plan_id, subscriptions.current_period_end
  into current_plan, current_period_end
  from public.cr_subscriptions subscriptions
  where subscriptions.owner_id = current_owner;
  current_plan := coalesce(current_plan, 'free'::public.cr_plan_id);
  if current_plan = 'free' then raise exception 'A paid website plan is required'; end if;

  current_period_end := case
    when current_period_end > now() then current_period_end
    else now() + interval '1 month'
  end;
  monthly_cost_limit := case current_plan when 'agency' then 40000000 else 6000000 end;
  reservation := case current_plan when 'agency' then 750000 else 250000 end;
  update public.cr_builder_usage_accounts
  set variable_cost_limit_microeur = case
        when period_ends_at <= now() then monthly_cost_limit
        else greatest(
          monthly_cost_limit,
          consumed_cost_microeur + reserved_cost_microeur
        )
      end,
      consumed_cost_microeur = case
        when period_ends_at <= now() then 0 else consumed_cost_microeur
      end,
      reserved_cost_microeur = case
        when period_ends_at <= now() then 0 else reserved_cost_microeur
      end,
      imports_used = case when period_ends_at <= now() then 0 else imports_used end,
      hosted_visit_limit = case current_plan when 'agency' then 250000 else 20000 end,
      hosted_visits = case when period_ends_at <= now() then 0 else hosted_visits end,
      period_started_at = case when period_ends_at <= now() then now() else period_started_at end,
      period_ends_at = case
        when period_ends_at <= now() then current_period_end
        else period_ends_at
      end,
      updated_at = now()
  where owner_id = current_owner;

  update public.cr_builder_usage_accounts
  set reserved_cost_microeur = reserved_cost_microeur + reservation,
      updated_at = now()
  where owner_id = current_owner
    and variable_cost_limit_microeur
      - consumed_cost_microeur
      - reserved_cost_microeur >= reservation;
  if not found then raise exception 'Monthly website creation budget reached'; end if;

  update public.cr_builder_sites
  set status = 'queued',
      status_message = 'Waiting to study the source website',
      last_error = null,
      updated_at = now()
  where id = p_site_id and owner_id = current_owner;

  insert into public.cr_jobs (
    owner_id,
    builder_site_id,
    kind,
    payload,
    progress_stage,
    progress_message
  ) values (
    current_owner,
    p_site_id,
    'site_import',
    jsonb_build_object('siteId', p_site_id),
    'queued',
    'Waiting to study the source website'
  ) returning id into queued_job_id;

  insert into public.cr_builder_cost_ledger (
    owner_id,
    site_id,
    job_id,
    entry_type,
    provider_cost_microeur
  ) values (
    current_owner,
    p_site_id,
    queued_job_id,
    'reserve',
    reservation
  );

  return queued_job_id;
end;
$$;

revoke all on function public.cr_retry_site_import(uuid)
  from public, anon;
grant execute on function public.cr_retry_site_import(uuid)
  to authenticated;
