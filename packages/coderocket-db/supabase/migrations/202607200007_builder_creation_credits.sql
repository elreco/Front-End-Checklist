-- Price website creation with plain-language credits while retaining the stricter internal
-- provider-cost ledger. Credits are charged atomically when work enters the durable queue and
-- automatically refunded when that job reaches a terminal failure.

alter table public.cr_builder_usage_accounts
  add column creation_credit_limit integer not null default 0
    check (creation_credit_limit >= 0),
  add column creation_credits_used integer not null default 0
    check (creation_credits_used >= 0),
  add column credits_period_ends_at timestamptz not null default (now() + interval '1 month');

create table public.cr_builder_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  site_id uuid references public.cr_builder_sites(id) on delete cascade,
  job_id uuid references public.cr_jobs(id) on delete cascade,
  entry_type text not null check (entry_type in ('charge', 'refund', 'topup')),
  credits integer not null check (credits > 0),
  reason text not null check (char_length(reason) between 1 and 120),
  created_at timestamptz not null default now()
);
create unique index cr_builder_credit_ledger_job_entry_idx
  on public.cr_builder_credit_ledger(job_id, entry_type)
  where job_id is not null;
create index cr_builder_credit_ledger_owner_activity_idx
  on public.cr_builder_credit_ledger(owner_id, created_at desc);

alter table public.cr_builder_credit_ledger enable row level security;
create policy cr_builder_credit_ledger_owner_select
  on public.cr_builder_credit_ledger for select
  using (auth.uid() = owner_id);
revoke all privileges on table public.cr_builder_credit_ledger from anon, authenticated;
grant select on table public.cr_builder_credit_ledger to authenticated;
grant all privileges on table public.cr_builder_credit_ledger to service_role;

create or replace function public.cr_charge_builder_job_credits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_plan public.cr_plan_id;
  monthly_credit_limit integer;
  subscription_period_end timestamptz;
  credit_cost integer;
begin
  if new.kind <> 'site_import' or new.builder_site_id is null then return new; end if;

  -- A retry of the same failed first version remains free to the customer.
  if exists (
    select 1
    from public.cr_jobs previous_jobs
    where previous_jobs.builder_site_id = new.builder_site_id
      and previous_jobs.kind = 'site_import'
      and previous_jobs.id <> new.id
  ) then
    return new;
  end if;

  select subscriptions.plan_id, subscriptions.current_period_end
  into current_plan, subscription_period_end
  from public.cr_subscriptions subscriptions
  where subscriptions.owner_id = new.owner_id;
  current_plan := coalesce(current_plan, 'free'::public.cr_plan_id);
  if current_plan = 'free' then raise exception 'A paid website plan is required'; end if;

  monthly_credit_limit := case current_plan when 'agency' then 600 else 100 end;
  credit_cost := 20;
  subscription_period_end := case
    when subscription_period_end > now() then subscription_period_end
    else now() + interval '1 month'
  end;

  update public.cr_builder_usage_accounts
  set creation_credits_used = case
        when creation_credit_limit = 0 or credits_period_ends_at <= now() then credit_cost
        else creation_credits_used + credit_cost
      end,
      creation_credit_limit = monthly_credit_limit,
      credits_period_ends_at = case
        when creation_credit_limit = 0 or credits_period_ends_at <= now()
          then subscription_period_end
        else credits_period_ends_at
      end,
      updated_at = now()
  where owner_id = new.owner_id
    and (
      creation_credit_limit = 0
      or credits_period_ends_at <= now()
      or creation_credit_limit - creation_credits_used >= credit_cost
    );
  if not found then raise exception 'Not enough creation credits'; end if;

  insert into public.cr_builder_credit_ledger (
    owner_id,
    site_id,
    job_id,
    entry_type,
    credits,
    reason
  ) values (
    new.owner_id,
    new.builder_site_id,
    new.id,
    'charge',
    credit_cost,
    'Useful first version'
  );
  return new;
end;
$$;

create trigger cr_jobs_charge_builder_credits
after insert on public.cr_jobs
for each row execute function public.cr_charge_builder_job_credits();

create or replace function public.cr_refund_builder_job_credits(p_job_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  charged_entry public.cr_builder_credit_ledger%rowtype;
begin
  select * into charged_entry
  from public.cr_builder_credit_ledger
  where job_id = p_job_id and entry_type = 'charge'
  for update;
  if charged_entry.id is null then return; end if;
  if exists (
    select 1
    from public.cr_builder_credit_ledger
    where job_id = p_job_id and entry_type = 'refund'
  ) then
    return;
  end if;

  update public.cr_builder_usage_accounts
  set creation_credits_used = greatest(creation_credits_used - charged_entry.credits, 0),
      updated_at = now()
  where owner_id = charged_entry.owner_id;
  insert into public.cr_builder_credit_ledger (
    owner_id,
    site_id,
    job_id,
    entry_type,
    credits,
    reason
  ) values (
    charged_entry.owner_id,
    charged_entry.site_id,
    charged_entry.job_id,
    'refund',
    charged_entry.credits,
    'Creation could not be completed'
  );
end;
$$;

create or replace function public.cr_refund_failed_builder_job_credits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.kind = 'site_import'
    and new.status = 'failed'
    and old.status is distinct from new.status then
    perform public.cr_refund_builder_job_credits(new.id);
  end if;
  return new;
end;
$$;

create trigger cr_jobs_refund_failed_builder_credits
after update of status on public.cr_jobs
for each row execute function public.cr_refund_failed_builder_job_credits();

revoke all on function public.cr_charge_builder_job_credits()
  from public, anon, authenticated;
revoke all on function public.cr_refund_failed_builder_job_credits()
  from public, anon, authenticated;
revoke all on function public.cr_refund_builder_job_credits(uuid)
  from public, anon, authenticated;
grant execute on function public.cr_refund_builder_job_credits(uuid)
  to service_role;

comment on table public.cr_builder_credit_ledger is
  'Customer-visible creation-credit history. Provider prices and model tokens stay in internal ledgers.';
comment on column public.cr_builder_usage_accounts.creation_credit_limit is
  'Monthly plain-language creation credits. This limit never replaces the stricter provider-cost ceiling.';
