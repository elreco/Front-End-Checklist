-- Pause one failed website recreation while its owner opens the same isolated browser that the
-- worker will resume. The live link and reconnect endpoint remain AES-GCM encrypted at rest.

alter table public.cr_builder_sites
  drop constraint if exists cr_builder_sites_status_check;
alter table public.cr_builder_sites
  add constraint cr_builder_sites_status_check
  check (status in (
    'queued',
    'analyzing',
    'waiting_for_access',
    'ready',
    'failed',
    'published'
  ));

create table public.cr_builder_browser_handoffs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  site_id uuid not null unique references public.cr_builder_sites(id) on delete cascade,
  job_id uuid not null unique references public.cr_jobs(id) on delete cascade,
  target_url text not null
    check (target_url like 'https://%' and char_length(target_url) between 10 and 2048),
  encrypted_session text
    check (
      encrypted_session is null
      or char_length(encrypted_session) between 40 and 30000
    ),
  status text not null default 'ready'
    check (status in (
      'ready',
      'confirmed',
      'consuming',
      'completed',
      'failed',
      'expired',
      'cancelled'
    )),
  last_verified_at timestamptz,
  last_error text check (last_error is null or char_length(last_error) <= 500),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status in ('ready', 'confirmed', 'consuming') and encrypted_session is not null)
    or (
      status in ('completed', 'failed', 'expired', 'cancelled')
      and encrypted_session is null
    )
  )
);

create index cr_builder_browser_handoffs_owner_idx
  on public.cr_builder_browser_handoffs(owner_id, updated_at desc);
create index cr_builder_browser_handoffs_expiry_idx
  on public.cr_builder_browser_handoffs(expires_at)
  where status in ('ready', 'confirmed', 'consuming');

alter table public.cr_builder_browser_handoffs enable row level security;
create policy cr_builder_browser_handoffs_owner_select
  on public.cr_builder_browser_handoffs for select
  using (auth.uid() = owner_id);

revoke all privileges on table public.cr_builder_browser_handoffs from anon, authenticated;
grant select on table public.cr_builder_browser_handoffs to authenticated;
grant all privileges on table public.cr_builder_browser_handoffs to service_role;

create or replace function public.cr_begin_builder_browser_handoff(
  p_site_id uuid,
  p_target_url text,
  p_encrypted_session text,
  p_expires_at timestamptz
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
  monthly_cost_limit bigint;
  reservation bigint;
  current_source_url text;
  source_origin text;
  queued_job_id uuid;
begin
  if current_owner is null then raise exception 'Authentication required'; end if;
  if p_target_url not like 'https://%'
    or char_length(p_target_url) not between 10 and 2048
    or char_length(p_encrypted_session) not between 40 and 30000
    or p_expires_at <= now() + interval '1 minute'
    or p_expires_at > now() + interval '11 minutes' then
    raise exception 'Invalid secure browser session';
  end if;

  select source_url into current_source_url
  from public.cr_builder_sites
  where id = p_site_id
    and owner_id = current_owner
    and source_mode = 'owned'
    and status = 'failed'
    and archived_at is null
  for update;
  if current_source_url is null then raise exception 'Failed owned website not found'; end if;

  source_origin := substring(current_source_url from '^(https://[^/]+)');
  if source_origin is null
    or not (p_target_url = source_origin or p_target_url like source_origin || '/%') then
    raise exception 'The private page must belong to the same website';
  end if;
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

  insert into public.cr_jobs (
    owner_id,
    builder_site_id,
    kind,
    payload,
    run_after,
    progress_stage,
    progress_message
  ) values (
    current_owner,
    p_site_id,
    'site_import',
    jsonb_build_object('siteId', p_site_id, 'access', 'browser_handoff'),
    p_expires_at,
    'queued',
    'Waiting for you to open the website'
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

  insert into public.cr_builder_browser_handoffs (
    owner_id,
    site_id,
    job_id,
    target_url,
    encrypted_session,
    status,
    expires_at,
    updated_at
  ) values (
    current_owner,
    p_site_id,
    queued_job_id,
    p_target_url,
    p_encrypted_session,
    'ready',
    p_expires_at,
    now()
  )
  on conflict (site_id) do update
  set job_id = excluded.job_id,
      target_url = excluded.target_url,
      encrypted_session = excluded.encrypted_session,
      status = 'ready',
      last_verified_at = null,
      last_error = null,
      expires_at = excluded.expires_at,
      updated_at = now()
  where public.cr_builder_browser_handoffs.owner_id = current_owner;

  update public.cr_builder_sites
  set status = 'waiting_for_access',
      status_message = 'Waiting for you to open the website',
      last_error = null,
      updated_at = now()
  where id = p_site_id and owner_id = current_owner;

  return queued_job_id;
end;
$$;

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
    and entry_type = 'reserve';
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
      status_message = 'The guided browser was closed safely',
      last_error = 'The guided browser was closed before CodeRocket continued',
      updated_at = now()
  where id = p_site_id
    and owner_id = p_owner_id
    and status = 'waiting_for_access';
  update public.cr_jobs
  set status = 'failed',
      last_error = 'The owner closed the guided browser',
      lease_owner = null,
      lease_expires_at = null,
      progress_stage = 'completed',
      progress_message = 'The guided browser was closed safely',
      progress_updated_at = now(),
      updated_at = now()
  where id = queued_job_id
    and owner_id = p_owner_id
    and builder_site_id = p_site_id
    and kind = 'site_import'
    and status = 'queued';
  if not found then raise exception 'Website creation job is unavailable'; end if;

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

create or replace function public.cr_confirm_builder_browser_handoff(p_site_id uuid)
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
  select job_id into queued_job_id
  from public.cr_builder_browser_handoffs
  where site_id = p_site_id
    and owner_id = current_owner
    and status = 'ready'
    and encrypted_session is not null
    and expires_at > now()
  for update;
  if queued_job_id is null then raise exception 'The secure browser session expired'; end if;

  update public.cr_builder_browser_handoffs
  set status = 'confirmed', updated_at = now()
  where site_id = p_site_id and owner_id = current_owner;
  update public.cr_builder_sites
  set status = 'queued',
      status_message = 'Waiting to continue from your secure browser',
      updated_at = now()
  where id = p_site_id
    and owner_id = current_owner
    and status = 'waiting_for_access';
  if not found then raise exception 'Website is not waiting for access'; end if;
  update public.cr_jobs
  set run_after = now(),
      progress_message = 'Waiting to continue from your secure browser',
      progress_updated_at = now()
  where id = queued_job_id
    and owner_id = current_owner
    and builder_site_id = p_site_id
    and kind = 'site_import'
    and status = 'queued';
  if not found then raise exception 'Website creation job is unavailable'; end if;
  return queued_job_id;
end;
$$;

revoke all on function public.cr_begin_builder_browser_handoff(
  uuid,
  text,
  text,
  timestamptz
) from public, anon;
grant execute on function public.cr_begin_builder_browser_handoff(
  uuid,
  text,
  text,
  timestamptz
) to authenticated;
revoke all on function public.cr_confirm_builder_browser_handoff(uuid)
  from public, anon;
grant execute on function public.cr_confirm_builder_browser_handoff(uuid)
  to authenticated;
revoke all on function public.cr_cancel_builder_browser_handoff(uuid, uuid, bigint)
  from public, anon, authenticated;
grant execute on function public.cr_cancel_builder_browser_handoff(uuid, uuid, bigint)
  to service_role;

comment on table public.cr_builder_browser_handoffs is
  'Short-lived owner-controlled Browserless sessions for authorised website imports.';
comment on column public.cr_builder_browser_handoffs.encrypted_session is
  'AES-GCM envelope containing a temporary live URL and token-free reconnect endpoint.';
