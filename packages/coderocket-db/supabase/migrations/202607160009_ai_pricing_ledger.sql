-- Snapshot provider pricing and CodeRocket's billing multiplier on every AI task.
-- Amounts use micro-US dollars so settlement stays integer-only and replay-safe.

create table public.cr_ai_model_pricing (
  model text primary key,
  pricing_version text not null,
  input_microusd_per_million bigint not null check (input_microusd_per_million >= 0),
  cached_input_microusd_per_million bigint not null
    check (cached_input_microusd_per_million >= 0),
  output_microusd_per_million bigint not null check (output_microusd_per_million >= 0),
  charge_multiplier_bps integer not null default 30000
    check (charge_multiplier_bps >= 10000),
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.cr_ai_model_pricing enable row level security;

insert into public.cr_ai_model_pricing (
  model,
  pricing_version,
  input_microusd_per_million,
  cached_input_microusd_per_million,
  output_microusd_per_million,
  charge_multiplier_bps
) values (
  'gpt-5.6-terra',
  'openai-2026-07-09',
  2500000,
  250000,
  15000000,
  30000
) on conflict (model) do update set
  pricing_version = excluded.pricing_version,
  input_microusd_per_million = excluded.input_microusd_per_million,
  cached_input_microusd_per_million = excluded.cached_input_microusd_per_million,
  output_microusd_per_million = excluded.output_microusd_per_million,
  charge_multiplier_bps = excluded.charge_multiplier_bps,
  active = true,
  updated_at = now();

alter table public.cr_ai_tasks
  add column pricing_version text not null default 'openai-2026-07-09',
  add column input_microusd_per_million bigint not null default 2500000
    check (input_microusd_per_million >= 0),
  add column cached_input_microusd_per_million bigint not null default 250000
    check (cached_input_microusd_per_million >= 0),
  add column output_microusd_per_million bigint not null default 15000000
    check (output_microusd_per_million >= 0),
  add column charge_multiplier_bps integer not null default 30000
    check (charge_multiplier_bps >= 10000),
  add column provider_cost_microusd bigint not null default 0
    check (provider_cost_microusd >= 0),
  add column customer_charge_microusd bigint not null default 0
    check (customer_charge_microusd >= 0),
  add column billing_currency text not null default 'USD'
    check (billing_currency = 'USD');

alter table public.cr_ai_credit_ledger
  add column pricing_version text,
  add column charge_multiplier_bps integer check (charge_multiplier_bps >= 10000),
  add column provider_cost_microusd bigint not null default 0
    check (provider_cost_microusd >= 0),
  add column customer_charge_microusd bigint not null default 0
    check (customer_charge_microusd >= 0),
  add column billing_currency text not null default 'USD'
    check (billing_currency = 'USD');

create or replace function public.cr_snapshot_ai_task_pricing()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  pricing public.cr_ai_model_pricing%rowtype;
begin
  select * into pricing
  from public.cr_ai_model_pricing
  where model = new.model and active = true;
  if pricing.model is null then
    raise exception 'Unsupported AI model pricing';
  end if;

  new.pricing_version := pricing.pricing_version;
  new.input_microusd_per_million := pricing.input_microusd_per_million;
  new.cached_input_microusd_per_million := pricing.cached_input_microusd_per_million;
  new.output_microusd_per_million := pricing.output_microusd_per_million;
  new.charge_multiplier_bps := pricing.charge_multiplier_bps;
  new.billing_currency := 'USD';
  return new;
end;
$$;

revoke all on function public.cr_snapshot_ai_task_pricing() from public, anon, authenticated;

drop trigger if exists cr_ai_tasks_snapshot_pricing on public.cr_ai_tasks;
create trigger cr_ai_tasks_snapshot_pricing
before insert on public.cr_ai_tasks
for each row execute function public.cr_snapshot_ai_task_pricing();

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
  safe_input_tokens bigint := greatest(p_input_tokens, 0);
  safe_cached_input_tokens bigint;
  safe_output_tokens bigint := greatest(p_output_tokens, 0);
  uncached_input_tokens bigint;
  provider_cost bigint := 0;
  customer_charge bigint := 0;
begin
  select * into task from public.cr_ai_tasks where id = p_task_id for update;
  if task.id is null then raise exception 'AI task not found'; end if;
  if task.status in ('succeeded', 'failed') then return; end if;

  safe_cached_input_tokens := least(greatest(p_cached_input_tokens, 0), safe_input_tokens);
  uncached_input_tokens := safe_input_tokens - safe_cached_input_tokens;

  if p_succeeded then
    if jsonb_typeof(p_result) <> 'object' then raise exception 'AI result must be an object'; end if;
    actual_credits := greatest(
      100,
      least(task.reserved_credits, ceil((safe_input_tokens + safe_output_tokens * 5)::numeric / 25))
    );
    provider_cost := ceil((
      uncached_input_tokens * task.input_microusd_per_million
      + safe_cached_input_tokens * task.cached_input_microusd_per_million
      + safe_output_tokens * task.output_microusd_per_million
    )::numeric / 1000000);
    customer_charge := ceil(provider_cost::numeric * task.charge_multiplier_bps / 10000);
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
      input_tokens = safe_input_tokens,
      cached_input_tokens = safe_cached_input_tokens,
      output_tokens = safe_output_tokens,
      reasoning_tokens = greatest(p_reasoning_tokens, 0),
      charged_credits = actual_credits,
      provider_cost_microusd = provider_cost,
      customer_charge_microusd = customer_charge,
      error = case when p_succeeded then null else left(p_error, 2000) end,
      completed_at = now(),
      updated_at = now()
  where id = task.id;

  insert into public.cr_ai_credit_ledger (
    owner_id, task_id, entry_type, credits, input_tokens, output_tokens, model,
    pricing_version, charge_multiplier_bps, provider_cost_microusd,
    customer_charge_microusd, billing_currency
  ) values (
    task.owner_id, task.id, 'charge', actual_credits, safe_input_tokens,
    safe_output_tokens, task.model, task.pricing_version, task.charge_multiplier_bps,
    provider_cost, customer_charge, task.billing_currency
  ) on conflict (task_id, entry_type) do nothing;

  insert into public.cr_ai_credit_ledger (
    owner_id, task_id, entry_type, credits, model, pricing_version,
    charge_multiplier_bps, billing_currency
  ) values (
    task.owner_id, task.id, 'release', task.reserved_credits - actual_credits,
    task.model, task.pricing_version, task.charge_multiplier_bps, task.billing_currency
  ) on conflict (task_id, entry_type) do nothing;
end;
$$;

revoke all on function public.cr_settle_ai_analysis(
  uuid, boolean, jsonb, text, integer, integer, integer, integer, text
) from public, anon, authenticated;
grant execute on function public.cr_settle_ai_analysis(
  uuid, boolean, jsonb, text, integer, integer, integer, integer, text
) to service_role;
