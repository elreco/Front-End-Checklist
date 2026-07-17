-- Bill paid AI overage through Stripe without changing deterministic audit results.
-- Existing included credits stay free; only the part above the plan allowance is metered.

alter table public.cr_jobs
  drop constraint if exists cr_jobs_kind_check;
alter table public.cr_jobs
  add constraint cr_jobs_kind_check
  check (kind in ('audit', 'retention', 'email', 'ai_analysis', 'ai_usage'));

alter table public.cr_ai_usage_accounts
  add column if not exists included_credits bigint not null default 3000
    check (included_credits >= 0),
  add column if not exists overage_cap_microeur bigint not null default 0
    check (overage_cap_microeur >= 0),
  add column if not exists billed_overage_microeur bigint not null default 0
    check (billed_overage_microeur >= 0);

alter table public.cr_ai_tasks
  add column if not exists billable_overage_microeur bigint not null default 0
    check (billable_overage_microeur >= 0),
  add column if not exists stripe_meter_event_identifier text,
  add column if not exists stripe_billing_job_id uuid unique
    references public.cr_jobs(id) on delete set null,
  add column if not exists billing_reported_at timestamptz;

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
  monthly_overage_cap bigint;
  task_id uuid;
  queued_job_id uuid;
  reservation bigint := 1000;
begin
  if current_owner is null then
    raise exception 'Authentication required';
  end if;
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
  monthly_overage_cap := case current_plan
    when 'agency' then 100000000
    when 'solo' then 20000000
    else 0
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
    included_credits,
    overage_cap_microeur
  )
  values (
    current_owner,
    monthly_allowance,
    monthly_included,
    monthly_overage_cap
  )
  on conflict (owner_id) do nothing;

  update public.cr_ai_usage_accounts
  set allowance_credits = case
        when period_ends_at <= now() then monthly_allowance
        else greatest(monthly_allowance, consumed_credits + reserved_credits)
      end,
      included_credits = monthly_included,
      overage_cap_microeur = monthly_overage_cap,
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
      current_plan <> 'free'
      or included_credits - consumed_credits - reserved_credits >= reservation
    )
    and (
      overage_cap_microeur = 0
      or billed_overage_microeur < overage_cap_microeur
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
exception
  when others then
    if task_id is null then
      update public.cr_ai_usage_accounts
      set reserved_credits = greatest(reserved_credits - reservation, 0),
          updated_at = now()
      where owner_id = current_owner;
    end if;
    raise;
end;
$$;

create or replace function public.cr_prepare_ai_usage_billing(p_task_id uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  task public.cr_ai_tasks%rowtype;
  usage_account public.cr_ai_usage_accounts%rowtype;
  current_plan public.cr_plan_id;
  credits_before bigint;
  overage_credits bigint;
  calculated_charge bigint;
  remaining_cap bigint;
  queued_job_id uuid;
  event_identifier text;
begin
  select * into task
  from public.cr_ai_tasks
  where id = p_task_id
  for update;
  if task.id is null then raise exception 'AI task not found'; end if;
  if task.status <> 'succeeded' or task.charged_credits = 0 then return 0; end if;
  if task.stripe_billing_job_id is not null then return task.billable_overage_microeur; end if;

  select * into usage_account
  from public.cr_ai_usage_accounts
  where owner_id = task.owner_id
  for update;

  select subscriptions.plan_id into current_plan
  from public.cr_subscriptions subscriptions
  where subscriptions.owner_id = task.owner_id
    and (
      subscriptions.status in ('active', 'trialing')
      or (
        subscriptions.status = 'past_due'
        and subscriptions.grace_period_end > now()
      )
    );
  if current_plan not in ('solo', 'agency') then return 0; end if;

  credits_before := greatest(usage_account.consumed_credits - task.charged_credits, 0);
  overage_credits :=
    greatest(usage_account.consumed_credits - usage_account.included_credits, 0)
    - greatest(credits_before - usage_account.included_credits, 0);
  if overage_credits <= 0 then return 0; end if;

  calculated_charge := ceil(
    task.customer_charge_microusd::numeric
    * overage_credits
    / task.charged_credits
  );
  remaining_cap := greatest(
    usage_account.overage_cap_microeur - usage_account.billed_overage_microeur,
    0
  );
  calculated_charge := least(calculated_charge, remaining_cap);
  if calculated_charge <= 0 then return 0; end if;

  event_identifier := 'coderocket-ai-' || task.id::text;
  insert into public.cr_jobs (
    owner_id,
    project_id,
    kind,
    payload,
    progress_stage,
    progress_message
  )
  values (
    task.owner_id,
    task.project_id,
    'ai_usage',
    jsonb_build_object('taskId', task.id),
    'queued',
    'Recording AI usage'
  ) returning id into queued_job_id;

  update public.cr_ai_tasks
  set billable_overage_microeur = calculated_charge,
      stripe_meter_event_identifier = event_identifier,
      stripe_billing_job_id = queued_job_id,
      updated_at = now()
  where id = task.id;

  update public.cr_ai_usage_accounts
  set billed_overage_microeur = billed_overage_microeur + calculated_charge,
      updated_at = now()
  where owner_id = task.owner_id;

  return calculated_charge;
end;
$$;

revoke all on function public.cr_request_ai_analysis(
  uuid, uuid, uuid, text, text, text, text, text, jsonb, text, text
) from public, anon;
grant execute on function public.cr_request_ai_analysis(
  uuid, uuid, uuid, text, text, text, text, text, jsonb, text, text
) to authenticated;

revoke all on function public.cr_prepare_ai_usage_billing(uuid)
from public, anon, authenticated;
grant execute on function public.cr_prepare_ai_usage_billing(uuid)
to service_role;
