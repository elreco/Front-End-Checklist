-- Make paid AI overage an explicit, user-controlled monthly budget.

alter table public.cr_ai_usage_accounts
  add column if not exists overage_enabled boolean not null default false;

-- Preserve the behavior of existing paid accounts while making new accounts opt in.
update public.cr_ai_usage_accounts
set overage_enabled = overage_cap_microeur > 0
where overage_enabled = false and overage_cap_microeur > 0;

create or replace function public.cr_update_ai_spending_settings(
  p_enabled boolean,
  p_cap_microeur bigint
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_owner uuid := auth.uid();
  current_plan public.cr_plan_id;
  stripe_customer text;
  subscription_period_end timestamptz;
  monthly_included bigint;
  monthly_allowance bigint;
  normalized_cap bigint;
begin
  if current_owner is null then raise exception 'Authentication required'; end if;
  if p_cap_microeur < 0 or p_cap_microeur > 500000000 then
    raise exception 'Invalid AI spending limit';
  end if;
  if p_enabled and p_cap_microeur < 1000000 then
    raise exception 'Enabled AI spending requires at least one euro';
  end if;

  select subscriptions.plan_id,
         subscriptions.stripe_customer_id,
         subscriptions.current_period_end
  into current_plan, stripe_customer, subscription_period_end
  from public.cr_subscriptions subscriptions
  where subscriptions.owner_id = current_owner
    and (
      subscriptions.status in ('active', 'trialing')
      or (
        subscriptions.status = 'past_due'
        and subscriptions.grace_period_end > now()
      )
    );

  if current_plan not in ('solo', 'agency') or stripe_customer is null then
    raise exception 'A connected paid Stripe subscription is required';
  end if;

  monthly_included := case current_plan
    when 'agency' then 600000
    else 100000
  end;
  monthly_allowance := case current_plan
    when 'agency' then 50600000
    else 10100000
  end;
  normalized_cap := case when p_enabled then p_cap_microeur else 0 end;
  if subscription_period_end is null or subscription_period_end <= now() then
    subscription_period_end := now() + interval '1 month';
  end if;

  insert into public.cr_ai_usage_accounts (
    owner_id,
    allowance_credits,
    included_credits,
    overage_enabled,
    overage_cap_microeur,
    period_ends_at
  )
  values (
    current_owner,
    monthly_allowance,
    monthly_included,
    p_enabled,
    normalized_cap,
    subscription_period_end
  )
  on conflict (owner_id) do update
  set allowance_credits = case
        when cr_ai_usage_accounts.period_ends_at <= now() then monthly_allowance
        else greatest(
          monthly_allowance,
          cr_ai_usage_accounts.consumed_credits + cr_ai_usage_accounts.reserved_credits
        )
      end,
      included_credits = monthly_included,
      overage_enabled = p_enabled,
      overage_cap_microeur = normalized_cap,
      consumed_credits = case
        when cr_ai_usage_accounts.period_ends_at <= now() then 0
        else cr_ai_usage_accounts.consumed_credits
      end,
      reserved_credits = case
        when cr_ai_usage_accounts.period_ends_at <= now() then 0
        else cr_ai_usage_accounts.reserved_credits
      end,
      billed_overage_microeur = case
        when cr_ai_usage_accounts.period_ends_at <= now() then 0
        else cr_ai_usage_accounts.billed_overage_microeur
      end,
      period_started_at = case
        when cr_ai_usage_accounts.period_ends_at <= now() then now()
        else cr_ai_usage_accounts.period_started_at
      end,
      period_ends_at = case
        when cr_ai_usage_accounts.period_ends_at <= now() then subscription_period_end
        else cr_ai_usage_accounts.period_ends_at
      end,
      updated_at = now();
end;
$$;

revoke all on function public.cr_update_ai_spending_settings(boolean, bigint)
from public, anon;
grant execute on function public.cr_update_ai_spending_settings(boolean, bigint)
to authenticated;

create or replace function public.cr_request_ai_analysis(
  p_project_id uuid,
  p_finding_id uuid,
  p_occurrence_id uuid,
  p_request_key text,
  p_audience text,
  p_ruleset_version text,
  p_rule_slug text,
  p_rule_hash text,
  p_rule_snapshot jsonb,
  p_prompt_version text,
  p_model text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_owner uuid := auth.uid();
  current_plan public.cr_plan_id;
  monthly_included bigint;
  monthly_allowance bigint;
  task_id uuid;
  queued_job_id uuid;
  reservation bigint := 1000;
begin
  if current_owner is null then raise exception 'Authentication required'; end if;
  if p_audience not in ('site_owner', 'freelancer', 'developer') then
    raise exception 'Unsupported audience';
  end if;
  if char_length(p_request_key) not between 16 and 200
    or char_length(p_rule_hash) <> 64
    or jsonb_typeof(p_rule_snapshot) <> 'object' then
    raise exception 'Invalid AI analysis request';
  end if;
  if not exists (
    select 1
    from public.cr_findings findings
    join public.cr_occurrences occurrences on occurrences.finding_id = findings.id
    join public.cr_projects projects on projects.id = findings.project_id
    where findings.id = p_finding_id
      and findings.project_id = p_project_id
      and findings.owner_id = current_owner
      and occurrences.id = p_occurrence_id
      and occurrences.owner_id = current_owner
      and projects.owner_id = current_owner
      and projects.archived_at is null
      and findings.resolved_at is null
  ) then
    raise exception 'Finding is unavailable';
  end if;

  select id into task_id
  from public.cr_ai_tasks
  where owner_id = current_owner and request_key = p_request_key;
  if task_id is not null then return task_id; end if;

  select coalesce(subscriptions.plan_id, 'free'::public.cr_plan_id)
  into current_plan
  from public.cr_subscriptions subscriptions
  where subscriptions.owner_id = current_owner
    and (
      subscriptions.status in ('active', 'trialing')
      or (
        subscriptions.status = 'past_due'
        and subscriptions.grace_period_end > now()
      )
    );
  current_plan := coalesce(current_plan, 'free'::public.cr_plan_id);

  monthly_included := case current_plan
    when 'agency' then 600000
    when 'solo' then 100000
    else 3000
  end;
  -- The monetary cap is authoritative. This larger credit ceiling only prevents
  -- unbounded reservations if a provider returns unexpectedly cheap responses.
  monthly_allowance := case current_plan
    when 'agency' then 50600000
    when 'solo' then 10100000
    else monthly_included
  end;

  insert into public.cr_ai_usage_accounts (
    owner_id,
    allowance_credits,
    included_credits
  )
  values (current_owner, monthly_allowance, monthly_included)
  on conflict (owner_id) do nothing;

  update public.cr_ai_usage_accounts
  set allowance_credits = case
        when period_ends_at <= now() then monthly_allowance
        else greatest(monthly_allowance, consumed_credits + reserved_credits)
      end,
      included_credits = monthly_included,
      consumed_credits = case when period_ends_at <= now() then 0 else consumed_credits end,
      reserved_credits = case when period_ends_at <= now() then 0 else reserved_credits end,
      billed_overage_microeur = case
        when period_ends_at <= now() then 0
        else billed_overage_microeur
      end,
      period_started_at = case when period_ends_at <= now() then now() else period_started_at end,
      period_ends_at = case
        when period_ends_at <= now() then now() + interval '1 month'
        else period_ends_at
      end,
      updated_at = now()
  where owner_id = current_owner;

  update public.cr_ai_usage_accounts
  set reserved_credits = reserved_credits + reservation,
      updated_at = now()
  where owner_id = current_owner
    and allowance_credits - consumed_credits - reserved_credits >= reservation
    and (
      included_credits - consumed_credits - reserved_credits >= reservation
      or (
        current_plan <> 'free'
        and overage_enabled
        and overage_cap_microeur > 0
        and billed_overage_microeur < overage_cap_microeur
      )
    );
  if not found then raise exception 'AI credit or spending limit reached'; end if;

  insert into public.cr_ai_tasks (
    owner_id, project_id, finding_id, occurrence_id, request_key, audience,
    ruleset_version, rule_slug, rule_hash, rule_snapshot, prompt_version,
    model, reserved_credits
  ) values (
    current_owner, p_project_id, p_finding_id, p_occurrence_id, p_request_key, p_audience,
    p_ruleset_version, p_rule_slug, p_rule_hash, p_rule_snapshot, p_prompt_version,
    p_model, reservation
  ) returning id into task_id;

  insert into public.cr_jobs (
    owner_id,
    project_id,
    kind,
    payload,
    progress_stage,
    progress_message
  )
  values (
    current_owner,
    p_project_id,
    'ai_analysis',
    jsonb_build_object('taskId', task_id),
    'queued',
    'Waiting to explain this finding'
  ) returning id into queued_job_id;

  update public.cr_ai_tasks set job_id = queued_job_id where id = task_id;
  insert into public.cr_ai_credit_ledger (owner_id, task_id, entry_type, credits, model)
  values (current_owner, task_id, 'reserve', reservation, p_model);
  return task_id;
end;
$$;

revoke all on function public.cr_request_ai_analysis(
  uuid, uuid, uuid, text, text, text, text, text, jsonb, text, text
) from public, anon;
grant execute on function public.cr_request_ai_analysis(
  uuid, uuid, uuid, text, text, text, text, text, jsonb, text, text
) to authenticated;
