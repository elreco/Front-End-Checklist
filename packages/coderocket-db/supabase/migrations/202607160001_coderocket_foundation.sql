create extension if not exists pgcrypto;

create type public.cr_plan_id as enum ('free', 'solo', 'agency');
create type public.cr_job_status as enum ('queued', 'leased', 'succeeded', 'failed');

create table public.cr_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cr_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('site_import')),
  payload jsonb not null default '{}'::jsonb,
  status public.cr_job_status not null default 'queued',
  run_after timestamptz not null default now(),
  lease_owner text,
  lease_expires_at timestamptz,
  attempts integer not null default 0 check (attempts between 0 and 3),
  last_error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index cr_jobs_claim_idx on public.cr_jobs(status, run_after, created_at);

create table public.cr_subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  plan_id public.cr_plan_id not null default 'free',
  status text not null default 'free',
  current_period_end timestamptz,
  grace_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.cr_stripe_events (
  event_id text primary key,
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz not null default now()
);

create table public.cr_worker_heartbeats (
  worker_id text primary key,
  process_version text not null,
  last_seen_at timestamptz not null default now()
);

create or replace function public.cr_create_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.cr_profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email))
  on conflict (id) do nothing;
  insert into public.cr_subscriptions (owner_id) values (new.id)
  on conflict (owner_id) do nothing;
  return new;
end;
$$;
create trigger cr_on_auth_user_created
after insert on auth.users for each row execute procedure public.cr_create_profile();

insert into public.cr_profiles (id, display_name)
select id, coalesce(raw_user_meta_data ->> 'full_name', email) from auth.users
on conflict (id) do nothing;
insert into public.cr_subscriptions (owner_id)
select id from auth.users on conflict (owner_id) do nothing;

create or replace function public.cr_claim_jobs(p_worker_id text, p_limit integer default 5)
returns setof public.cr_jobs
language plpgsql security definer set search_path = '' as $$
begin
  return query
  with selected as (
    select id from public.cr_jobs
    where attempts < 3
      and run_after <= now()
      and (status = 'queued' or (status = 'leased' and lease_expires_at < now()))
    order by run_after, created_at
    for update skip locked
    limit least(greatest(p_limit, 1), 20)
  )
  update public.cr_jobs jobs
  set status = 'leased', lease_owner = p_worker_id,
      lease_expires_at = now() + interval '5 minutes', attempts = attempts + 1
  from selected where jobs.id = selected.id
  returning jobs.*;
end;
$$;

create or replace function public.cr_finish_job(p_job_id uuid, p_worker_id text)
returns void language sql security definer set search_path = '' as $$
  update public.cr_jobs set status = 'succeeded', completed_at = now(), lease_expires_at = null
  where id = p_job_id and lease_owner = p_worker_id;
$$;

create or replace function public.cr_retry_job(
  p_job_id uuid, p_worker_id text, p_error text, p_delay_seconds integer
)
returns void language sql security definer set search_path = '' as $$
  update public.cr_jobs
  set status = case
        when attempts >= 3 then 'failed'::public.cr_job_status
        else 'queued'::public.cr_job_status
      end,
      last_error = left(p_error, 2000),
      run_after = now() + make_interval(secs => p_delay_seconds),
      lease_expires_at = null,
      lease_owner = null,
      completed_at = case when attempts >= 3 then now() else null end
  where id = p_job_id and lease_owner = p_worker_id;
$$;

alter table public.cr_profiles enable row level security;
alter table public.cr_jobs enable row level security;
alter table public.cr_subscriptions enable row level security;
alter table public.cr_stripe_events enable row level security;
alter table public.cr_worker_heartbeats enable row level security;

create policy cr_profiles_owner
  on public.cr_profiles for all
  using (auth.uid() = id) with check (auth.uid() = id);
create policy cr_jobs_owner_select
  on public.cr_jobs for select using (auth.uid() = owner_id);
create policy cr_subscriptions_owner
  on public.cr_subscriptions for select using (auth.uid() = owner_id);

revoke all privileges on table public.cr_jobs from anon, authenticated;
grant select on table public.cr_jobs to authenticated;
grant all privileges on table public.cr_jobs to service_role;
revoke all privileges on table public.cr_stripe_events from public, anon, authenticated;
revoke all privileges on table public.cr_worker_heartbeats from public, anon, authenticated;
grant all privileges on table public.cr_stripe_events to service_role;
grant all privileges on table public.cr_worker_heartbeats to service_role;

revoke all on function public.cr_claim_jobs(text, integer) from public, anon, authenticated;
revoke all on function public.cr_finish_job(uuid, text) from public, anon, authenticated;
revoke all on function public.cr_retry_job(uuid, text, text, integer) from public, anon, authenticated;
grant execute on function public.cr_claim_jobs(text, integer) to service_role;
grant execute on function public.cr_finish_job(uuid, text) to service_role;
grant execute on function public.cr_retry_job(uuid, text, text, integer) to service_role;
