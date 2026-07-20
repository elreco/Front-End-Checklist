-- Let a novice add one optional outcome to the URL-first creation form. The importer always saves
-- the faithful first version before this request becomes a normal recoverable Studio edit.

alter table public.cr_builder_sites
  add column initial_instruction text
    check (
      initial_instruction is null
      or char_length(initial_instruction) between 2 and 2000
    ),
  add column initial_instruction_handled_at timestamptz;

create or replace function public.cr_request_site_import(
  p_source_url text,
  p_name text,
  p_source_mode text,
  p_initial_instruction text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  site_id uuid;
  safe_instruction text := nullif(trim(p_initial_instruction), '');
begin
  if safe_instruction is not null
    and char_length(safe_instruction) not between 2 and 2000 then
    raise exception 'Invalid initial website instruction';
  end if;
  site_id := public.cr_request_site_import(p_source_url, p_name, p_source_mode);
  update public.cr_builder_sites
  set initial_instruction = safe_instruction,
      status_message = case
        when safe_instruction is null then status_message
        else 'Waiting to study the source website · your extra request is saved'
      end
  where id = site_id and owner_id = auth.uid();
  return site_id;
end;
$$;

create or replace function public.cr_queue_initial_site_instruction(p_site_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_site public.cr_builder_sites%rowtype;
  current_owner uuid;
  current_plan public.cr_plan_id;
  current_period_end timestamptz;
  monthly_cost_limit bigint;
  monthly_credit_limit integer;
  credit_cost integer := 6;
  reservation bigint := 150000;
  queued_job_id uuid := gen_random_uuid();
  user_message_id uuid := gen_random_uuid();
begin
  select sites.owner_id into current_owner
  from public.cr_builder_sites sites
  where sites.id = p_site_id and sites.archived_at is null;
  if current_owner is null then raise exception 'Website not found'; end if;

  perform pg_advisory_xact_lock(hashtextextended(current_owner::text, 1));
  select * into source_site
  from public.cr_builder_sites
  where id = p_site_id and owner_id = current_owner and archived_at is null
  for update;
  if source_site.initial_instruction is null
    or source_site.initial_instruction_handled_at is not null then
    return null;
  end if;
  if source_site.status not in ('ready', 'published') then
    raise exception 'Website is not ready for its initial request';
  end if;
  if not exists (
    select 1 from public.cr_site_revisions
    where site_id = p_site_id and owner_id = current_owner
  ) then
    raise exception 'Website has no editable version';
  end if;

  select subscriptions.plan_id, subscriptions.current_period_end
  into current_plan, current_period_end
  from public.cr_subscriptions subscriptions
  where subscriptions.owner_id = current_owner;
  current_plan := coalesce(current_plan, 'free'::public.cr_plan_id);
  if current_plan = 'free' then raise exception 'A paid website plan is required'; end if;
  monthly_cost_limit := case current_plan when 'agency' then 40000000 else 6000000 end;
  monthly_credit_limit := case current_plan when 'agency' then 600 else 100 end;
  current_period_end := case
    when current_period_end > now() then current_period_end
    else now() + interval '1 month'
  end;

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
      period_started_at = case when period_ends_at <= now() then now() else period_started_at end,
      period_ends_at = case when period_ends_at <= now() then current_period_end else period_ends_at end,
      creation_credit_limit = monthly_credit_limit,
      creation_credits_used = case
        when credits_period_ends_at <= now() then 0 else creation_credits_used
      end,
      credits_period_ends_at = case
        when credits_period_ends_at <= now() then current_period_end
        else credits_period_ends_at
      end,
      updated_at = now()
  where owner_id = current_owner;

  update public.cr_builder_usage_accounts
  set reserved_cost_microeur = reserved_cost_microeur + reservation,
      creation_credits_used = creation_credits_used + credit_cost,
      updated_at = now()
  where owner_id = current_owner
    and creation_credit_limit - creation_credits_used >= credit_cost
    and variable_cost_limit_microeur
      - consumed_cost_microeur
      - reserved_cost_microeur >= reservation;

  if not found then
    insert into public.cr_builder_messages (
      owner_id, site_id, role, content, status, credit_cost
    ) values (
      current_owner,
      p_site_id,
      'user',
      source_site.initial_instruction,
      'failed',
      0
    );
    insert into public.cr_builder_messages (
      owner_id, site_id, role, content, status, credit_cost
    ) values (
      current_owner,
      p_site_id,
      'assistant',
      'Your faithful first version is ready, but the extra request could not start within this month''s protected limit. No extra credits were used. You can send it again from the Studio.',
      'failed',
      0
    );
    update public.cr_builder_sites
    set initial_instruction_handled_at = now(),
        status_message = 'Your first version is ready · send the extra request again in the Studio',
        updated_at = now()
    where id = p_site_id;
    return null;
  end if;

  insert into public.cr_jobs (
    id,
    owner_id,
    builder_site_id,
    kind,
    payload,
    progress_stage,
    progress_message
  ) values (
    queued_job_id,
    current_owner,
    p_site_id,
    'site_edit',
    jsonb_build_object('siteId', p_site_id, 'messageId', user_message_id),
    'queued',
    'Your extra request is safely waiting'
  );
  insert into public.cr_builder_messages (
    id,
    owner_id,
    site_id,
    job_id,
    role,
    content,
    status,
    credit_cost
  ) values (
    user_message_id,
    current_owner,
    p_site_id,
    queued_job_id,
    'user',
    source_site.initial_instruction,
    'queued',
    credit_cost
  );
  insert into public.cr_builder_cost_ledger (
    owner_id, site_id, job_id, entry_type, provider_cost_microeur
  ) values (
    current_owner, p_site_id, queued_job_id, 'reserve', reservation
  );
  insert into public.cr_builder_credit_ledger (
    owner_id, site_id, job_id, entry_type, credits, reason
  ) values (
    current_owner, p_site_id, queued_job_id, 'charge', credit_cost, 'Initial guided website change'
  );
  update public.cr_builder_sites
  set initial_instruction_handled_at = now(),
      status_message = 'Your first version is ready · applying your extra request',
      updated_at = now()
  where id = p_site_id;
  return queued_job_id;
end;
$$;

revoke all on function public.cr_request_site_import(text, text, text, text)
  from public, anon;
grant execute on function public.cr_request_site_import(text, text, text, text)
  to authenticated;
revoke all on function public.cr_queue_initial_site_instruction(uuid)
  from public, anon, authenticated;
grant execute on function public.cr_queue_initial_site_instruction(uuid)
  to service_role;

comment on column public.cr_builder_sites.initial_instruction is
  'Optional owner-authored outcome queued only after the faithful imported revision is durable.';
comment on function public.cr_queue_initial_site_instruction(uuid) is
  'Queues one normal bounded and recoverable Studio edit; never source code or hidden implementation instructions.';
