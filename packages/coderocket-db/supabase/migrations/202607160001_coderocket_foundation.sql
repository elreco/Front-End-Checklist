create extension if not exists pgcrypto;

create type public.cr_plan_id as enum ('free', 'solo', 'agency');
create type public.cr_audit_environment as enum ('production', 'preview');
create type public.cr_audit_trigger as enum ('manual', 'scheduled', 'ci');
create type public.cr_audit_status as enum ('queued', 'running', 'succeeded', 'failed');
create type public.cr_finding_status as enum ('new', 'persistent', 'resolved');
create type public.cr_gate_status as enum ('passed', 'failed', 'needs_baseline');
create type public.cr_priority as enum ('critical', 'high', 'medium', 'low');
create type public.cr_job_status as enum ('queued', 'leased', 'succeeded', 'failed');

create table public.cr_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cr_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  production_url text not null check (production_url like 'https://%'),
  page_paths text[] not null default array['/']::text[],
  schedule_enabled boolean not null default true,
  next_audit_at timestamptz not null default now(),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index cr_projects_owner_idx on public.cr_projects(owner_id) where archived_at is null;

create table public.cr_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.cr_projects(id) on delete cascade,
  kind text not null check (kind in ('audit', 'retention', 'email')),
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

create table public.cr_audits (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.cr_projects(id) on delete cascade,
  environment public.cr_audit_environment not null,
  trigger public.cr_audit_trigger not null,
  status public.cr_audit_status not null default 'queued',
  gate_status public.cr_gate_status,
  ruleset_version text not null,
  baseline_audit_id uuid references public.cr_audits(id) on delete set null,
  commit_sha text,
  branch text,
  pull_request text,
  new_count integer not null default 0,
  persistent_count integer not null default 0,
  resolved_count integer not null default 0,
  blocking_count integer not null default 0,
  error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index cr_audits_project_idx on public.cr_audits(project_id, created_at desc);

create table public.cr_audit_pages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  audit_id uuid not null references public.cr_audits(id) on delete cascade,
  url text not null,
  normalized_path text not null,
  reachable boolean not null,
  http_status integer,
  duration_ms integer,
  error text,
  created_at timestamptz not null default now(),
  unique (audit_id, normalized_path)
);

create table public.cr_findings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.cr_projects(id) on delete cascade,
  fingerprint text not null,
  normalized_path text not null,
  rule_slug text not null,
  title text not null,
  priority public.cr_priority not null,
  first_seen_audit_id uuid not null references public.cr_audits(id) on delete cascade,
  last_seen_audit_id uuid not null references public.cr_audits(id) on delete cascade,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, fingerprint)
);

create table public.cr_occurrences (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  audit_id uuid not null references public.cr_audits(id) on delete cascade,
  finding_id uuid not null references public.cr_findings(id) on delete cascade,
  status public.cr_finding_status not null,
  message text not null,
  created_at timestamptz not null default now(),
  unique (audit_id, finding_id)
);

create table public.cr_api_tokens (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.cr_projects(id) on delete cascade,
  name text not null,
  prefix text not null,
  token_hash text not null unique,
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.cr_share_links (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  audit_id uuid not null references public.cr_audits(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

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

create table public.cr_idempotency_keys (
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.cr_projects(id) on delete cascade,
  key text not null,
  response jsonb,
  created_at timestamptz not null default now(),
  primary key (project_id, key)
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

create or replace function public.cr_enqueue_due_audits()
returns integer
language plpgsql security definer set search_path = '' as $$
declare queued_count integer;
begin
  with due as (
    select projects.id, projects.owner_id,
      case when coalesce(subscriptions.plan_id, 'free'::public.cr_plan_id) = 'free'
        then interval '7 days' else interval '1 day' end as cadence
    from public.cr_projects projects
    left join public.cr_subscriptions subscriptions on subscriptions.owner_id = projects.owner_id
    where projects.archived_at is null
      and projects.schedule_enabled
      and projects.next_audit_at <= now()
    for update of projects skip locked
    limit 50
  ), advanced as (
    update public.cr_projects projects
    set next_audit_at = now() + due.cadence
    from due where projects.id = due.id
    returning projects.id, projects.owner_id
  )
  insert into public.cr_jobs (owner_id, project_id, kind, payload)
  select owner_id, id, 'audit', '{"environment":"production","trigger":"scheduled"}'::jsonb
  from advanced;
  get diagnostics queued_count = row_count;
  return queued_count;
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
  set status = case when attempts >= 3 then 'failed'::public.cr_job_status else 'queued'::public.cr_job_status end,
      last_error = left(p_error, 2000), run_after = now() + make_interval(secs => p_delay_seconds),
      lease_expires_at = null, lease_owner = null,
      completed_at = case when attempts >= 3 then now() else null end
  where id = p_job_id and lease_owner = p_worker_id;
$$;

alter table public.cr_profiles enable row level security;
alter table public.cr_projects enable row level security;
alter table public.cr_jobs enable row level security;
alter table public.cr_audits enable row level security;
alter table public.cr_audit_pages enable row level security;
alter table public.cr_findings enable row level security;
alter table public.cr_occurrences enable row level security;
alter table public.cr_api_tokens enable row level security;
alter table public.cr_share_links enable row level security;
alter table public.cr_subscriptions enable row level security;
alter table public.cr_idempotency_keys enable row level security;

create policy cr_profiles_owner on public.cr_profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy cr_projects_owner on public.cr_projects for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy cr_jobs_owner_select on public.cr_jobs for select using (auth.uid() = owner_id);
create policy cr_jobs_owner_insert_audit on public.cr_jobs for insert with check (auth.uid() = owner_id and kind = 'audit');
create policy cr_audits_owner on public.cr_audits for select using (auth.uid() = owner_id);
create policy cr_audit_pages_owner on public.cr_audit_pages for select using (auth.uid() = owner_id);
create policy cr_findings_owner on public.cr_findings for select using (auth.uid() = owner_id);
create policy cr_occurrences_owner on public.cr_occurrences for select using (auth.uid() = owner_id);
create policy cr_api_tokens_owner on public.cr_api_tokens for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy cr_share_links_owner on public.cr_share_links for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy cr_subscriptions_owner on public.cr_subscriptions for select using (auth.uid() = owner_id);
create policy cr_idempotency_owner on public.cr_idempotency_keys for select using (auth.uid() = owner_id);

revoke all on function public.cr_claim_jobs(text, integer) from public, anon, authenticated;
revoke all on function public.cr_enqueue_due_audits() from public, anon, authenticated;
revoke all on function public.cr_finish_job(uuid, text) from public, anon, authenticated;
revoke all on function public.cr_retry_job(uuid, text, text, integer) from public, anon, authenticated;
grant execute on function public.cr_claim_jobs(text, integer) to service_role;
grant execute on function public.cr_enqueue_due_audits() to service_role;
grant execute on function public.cr_finish_job(uuid, text) to service_role;
grant execute on function public.cr_retry_job(uuid, text, text, integer) to service_role;
