-- Add a metered, evidence-grounded AI explanation layer.
-- Front-End Checklist audits remain deterministic and are the only source of resolution state.

alter table public.cr_jobs
  drop constraint if exists cr_jobs_kind_check;
alter table public.cr_jobs
  add constraint cr_jobs_kind_check
  check (kind in ('audit', 'retention', 'email', 'ai_analysis'));

create table public.cr_ai_usage_accounts (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  allowance_credits bigint not null check (allowance_credits >= 0),
  consumed_credits bigint not null default 0 check (consumed_credits >= 0),
  reserved_credits bigint not null default 0 check (reserved_credits >= 0),
  period_started_at timestamptz not null default now(),
  period_ends_at timestamptz not null default (now() + interval '1 month'),
  updated_at timestamptz not null default now(),
  check (consumed_credits + reserved_credits <= allowance_credits)
);

create table public.cr_ai_tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.cr_projects(id) on delete cascade,
  finding_id uuid not null references public.cr_findings(id) on delete cascade,
  occurrence_id uuid not null references public.cr_occurrences(id) on delete cascade,
  job_id uuid unique references public.cr_jobs(id) on delete set null,
  request_key text not null check (char_length(request_key) between 16 and 200),
  status text not null default 'queued'
    check (status in ('queued', 'running', 'succeeded', 'failed')),
  audience text not null check (audience in ('site_owner', 'freelancer', 'developer')),
  ruleset_version text not null,
  rule_slug text not null,
  rule_hash text not null check (char_length(rule_hash) = 64),
  rule_snapshot jsonb not null check (jsonb_typeof(rule_snapshot) = 'object'),
  prompt_version text not null,
  model text not null,
  result jsonb check (result is null or jsonb_typeof(result) = 'object'),
  provider_response_id text,
  input_tokens integer not null default 0 check (input_tokens >= 0),
  cached_input_tokens integer not null default 0 check (cached_input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  reasoning_tokens integer not null default 0 check (reasoning_tokens >= 0),
  reserved_credits bigint not null default 1000 check (reserved_credits > 0),
  charged_credits bigint not null default 0 check (charged_credits >= 0),
  error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, request_key)
);
create index cr_ai_tasks_project_idx
  on public.cr_ai_tasks(project_id, created_at desc);
create index cr_ai_tasks_finding_idx
  on public.cr_ai_tasks(finding_id, created_at desc);

create table public.cr_ai_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.cr_ai_tasks(id) on delete cascade,
  entry_type text not null check (entry_type in ('reserve', 'charge', 'release')),
  credits bigint not null check (credits >= 0),
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  model text not null,
  created_at timestamptz not null default now(),
  unique (task_id, entry_type)
);

alter table public.cr_ai_usage_accounts enable row level security;
alter table public.cr_ai_tasks enable row level security;
alter table public.cr_ai_credit_ledger enable row level security;

create policy cr_ai_usage_accounts_owner_select
  on public.cr_ai_usage_accounts for select
  using (auth.uid() = owner_id);
create policy cr_ai_tasks_owner_select
  on public.cr_ai_tasks for select
  using (auth.uid() = owner_id);
create policy cr_ai_credit_ledger_owner_select
  on public.cr_ai_credit_ledger for select
  using (auth.uid() = owner_id);

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
  monthly_allowance bigint;
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
  where subscriptions.owner_id = current_owner;
  current_plan := coalesce(current_plan, 'free'::public.cr_plan_id);
  monthly_allowance := case current_plan
    when 'agency' then 600000
    when 'solo' then 100000
    else 3000
  end;

  insert into public.cr_ai_usage_accounts (owner_id, allowance_credits)
  values (current_owner, monthly_allowance)
  on conflict (owner_id) do nothing;

  update public.cr_ai_usage_accounts
  set allowance_credits = case
        when period_ends_at <= now() then monthly_allowance
        else greatest(monthly_allowance, consumed_credits + reserved_credits)
      end,
      consumed_credits = case when period_ends_at <= now() then 0 else consumed_credits end,
      reserved_credits = case when period_ends_at <= now() then 0 else reserved_credits end,
      period_started_at = case when period_ends_at <= now() then now() else period_started_at end,
      period_ends_at = case when period_ends_at <= now() then now() + interval '1 month' else period_ends_at end,
      updated_at = now()
  where owner_id = current_owner;

  update public.cr_ai_usage_accounts
  set reserved_credits = reserved_credits + reservation,
      updated_at = now()
  where owner_id = current_owner
    and allowance_credits - consumed_credits - reserved_credits >= reservation;
  if not found then raise exception 'AI credit limit reached'; end if;

  insert into public.cr_ai_tasks (
    owner_id, project_id, finding_id, occurrence_id, request_key, audience,
    ruleset_version, rule_slug, rule_hash, rule_snapshot, prompt_version,
    model, reserved_credits
  ) values (
    current_owner, p_project_id, p_finding_id, p_occurrence_id, p_request_key, p_audience,
    p_ruleset_version, p_rule_slug, p_rule_hash, p_rule_snapshot, p_prompt_version,
    p_model, reservation
  ) returning id into task_id;

  insert into public.cr_jobs (owner_id, project_id, kind, payload, progress_stage, progress_message)
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
      set reserved_credits = greatest(reserved_credits - reservation, 0), updated_at = now()
      where owner_id = current_owner;
    end if;
    raise;
end;
$$;

create or replace function public.cr_settle_ai_analysis(
  p_task_id uuid,
  p_succeeded boolean,
  p_result jsonb,
  p_provider_response_id text,
  p_input_tokens integer,
  p_cached_input_tokens integer,
  p_output_tokens integer,
  p_reasoning_tokens integer,
  p_error text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  task public.cr_ai_tasks%rowtype;
  actual_credits bigint;
begin
  select * into task from public.cr_ai_tasks where id = p_task_id for update;
  if task.id is null then raise exception 'AI task not found'; end if;
  if task.status in ('succeeded', 'failed') then return; end if;

  if p_succeeded then
    if jsonb_typeof(p_result) <> 'object' then raise exception 'AI result must be an object'; end if;
    actual_credits := greatest(
      100,
      least(task.reserved_credits, ceil((p_input_tokens + p_output_tokens * 5)::numeric / 25))
    );
  else
    actual_credits := 0;
  end if;

  update public.cr_ai_usage_accounts
  set reserved_credits = greatest(reserved_credits - task.reserved_credits, 0),
      consumed_credits = consumed_credits + actual_credits,
      updated_at = now()
  where owner_id = task.owner_id;

  update public.cr_ai_tasks
  set status = case when p_succeeded then 'succeeded' else 'failed' end,
      result = case when p_succeeded then p_result else null end,
      provider_response_id = p_provider_response_id,
      input_tokens = greatest(p_input_tokens, 0),
      cached_input_tokens = greatest(p_cached_input_tokens, 0),
      output_tokens = greatest(p_output_tokens, 0),
      reasoning_tokens = greatest(p_reasoning_tokens, 0),
      charged_credits = actual_credits,
      error = case when p_succeeded then null else left(p_error, 2000) end,
      completed_at = now(),
      updated_at = now()
  where id = task.id;

  insert into public.cr_ai_credit_ledger (
    owner_id, task_id, entry_type, credits, input_tokens, output_tokens, model
  ) values (
    task.owner_id, task.id, 'charge', actual_credits,
    greatest(p_input_tokens, 0), greatest(p_output_tokens, 0), task.model
  ) on conflict (task_id, entry_type) do nothing;
  insert into public.cr_ai_credit_ledger (owner_id, task_id, entry_type, credits, model)
  values (
    task.owner_id, task.id, 'release', task.reserved_credits - actual_credits, task.model
  ) on conflict (task_id, entry_type) do nothing;
end;
$$;

revoke all on function public.cr_request_ai_analysis(
  uuid, uuid, uuid, text, text, text, text, text, jsonb, text, text
) from public, anon;
grant execute on function public.cr_request_ai_analysis(
  uuid, uuid, uuid, text, text, text, text, text, jsonb, text, text
) to authenticated;

revoke all on function public.cr_settle_ai_analysis(
  uuid, boolean, jsonb, text, integer, integer, integer, integer, text
) from public, anon, authenticated;
grant execute on function public.cr_settle_ai_analysis(
  uuid, boolean, jsonb, text, integer, integer, integer, integer, text
) to service_role;
