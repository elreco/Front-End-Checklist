-- Reserve enough cost for one bounded responsive visual study while preserving every advertised
-- monthly import entitlement inside the existing €6 Launch and €40 Studio ceilings.

create or replace function public.cr_request_site_import(
  p_source_url text,
  p_name text,
  p_source_mode text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_owner uuid := auth.uid();
  current_plan public.cr_plan_id;
  current_period_end timestamptz;
  maximum_sites integer;
  maximum_imports integer;
  monthly_cost_limit bigint;
  active_sites integer;
  reservation bigint;
  site_id uuid := gen_random_uuid();
  queued_job_id uuid;
  site_slug text;
begin
  if current_owner is null then raise exception 'Authentication required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(current_owner::text, 0));
  if p_source_url not like 'https://%'
    or char_length(p_source_url) not between 10 and 2048
    or char_length(trim(p_name)) not between 1 and 120
    or p_source_mode not in ('owned', 'inspiration') then
    raise exception 'Invalid website import request';
  end if;

  select subscriptions.plan_id, subscriptions.current_period_end
  into current_plan, current_period_end
  from public.cr_subscriptions subscriptions
  where subscriptions.owner_id = current_owner;
  current_plan := coalesce(current_plan, 'free'::public.cr_plan_id);
  current_period_end := case
    when current_period_end > now() then current_period_end
    else now() + interval '1 month'
  end;
  if current_plan = 'free' then
    raise exception 'A paid website plan is required';
  end if;

  maximum_sites := case current_plan when 'agency' then 10 else 1 end;
  maximum_imports := case current_plan when 'agency' then 50 else 5 end;
  reservation := case current_plan when 'agency' then 750000 else 250000 end;
  monthly_cost_limit := case current_plan
    when 'agency' then 40000000
    else 6000000
  end;

  select count(*) into active_sites
  from public.cr_builder_sites
  where owner_id = current_owner and archived_at is null;
  if active_sites >= maximum_sites then raise exception 'Website limit reached'; end if;

  insert into public.cr_builder_usage_accounts (
    owner_id,
    variable_cost_limit_microeur,
    hosted_visit_limit,
    period_ends_at
  ) values (
    current_owner,
    monthly_cost_limit,
    case current_plan when 'agency' then 250000 else 20000 end,
    current_period_end
  )
  on conflict (owner_id) do nothing;

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
        when period_ends_at <= now()
          then current_period_end
        else period_ends_at
      end,
      updated_at = now()
  where owner_id = current_owner;

  update public.cr_builder_usage_accounts
  set reserved_cost_microeur = reserved_cost_microeur + reservation,
      imports_used = imports_used + 1,
      updated_at = now()
  where owner_id = current_owner
    and imports_used < maximum_imports
    and variable_cost_limit_microeur
      - consumed_cost_microeur
      - reserved_cost_microeur >= reservation;
  if not found then raise exception 'Monthly website creation limit reached'; end if;

  site_slug := trim(both '-' from left(
    regexp_replace(lower(trim(p_name)), '[^a-z0-9]+', '-', 'g'),
    48
  ));
  if site_slug = '' then site_slug := 'website'; end if;
  site_slug := site_slug || '-' || left(replace(site_id::text, '-', ''), 8);

  insert into public.cr_builder_sites (
    id, owner_id, name, slug, source_url, source_mode, status, status_message
  ) values (
    site_id, current_owner, trim(p_name), site_slug, p_source_url, p_source_mode,
    'queued', 'Waiting to study the source website'
  );

  insert into public.cr_jobs (
    owner_id, builder_site_id, kind, payload, progress_stage, progress_message
  ) values (
    current_owner,
    site_id,
    'site_import',
    jsonb_build_object('siteId', site_id),
    'queued',
    'Waiting to study the source website'
  ) returning id into queued_job_id;

  insert into public.cr_builder_cost_ledger (
    owner_id, site_id, job_id, entry_type, provider_cost_microeur
  ) values (
    current_owner, site_id, queued_job_id, 'reserve', reservation
  );
  return site_id;
end;
$$;
