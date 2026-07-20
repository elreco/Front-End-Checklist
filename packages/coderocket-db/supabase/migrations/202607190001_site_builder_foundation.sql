-- Add the no-code website recreation product without replacing website health monitoring.
-- Source HTML and executable code are never persisted: only a bounded, versioned site document.

alter table public.cr_jobs
  drop constraint if exists cr_jobs_kind_check;
alter table public.cr_jobs
  add constraint cr_jobs_kind_check
  check (kind in ('audit', 'retention', 'email', 'ai_analysis', 'ai_usage', 'site_import'));

create table public.cr_builder_sites (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  source_url text not null
    check (source_url like 'https://%' and char_length(source_url) between 10 and 2048),
  source_mode text not null check (source_mode in ('owned', 'inspiration')),
  status text not null default 'queued'
    check (status in ('queued', 'analyzing', 'ready', 'failed', 'published')),
  status_message text,
  last_error text,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index cr_builder_sites_owner_idx
  on public.cr_builder_sites(owner_id, created_at desc)
  where archived_at is null;

create table public.cr_site_revisions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  site_id uuid not null references public.cr_builder_sites(id) on delete cascade,
  revision_number integer not null check (revision_number > 0),
  site_document jsonb not null
    check (
      jsonb_typeof(site_document) = 'object'
      and site_document ->> 'version' = '1'
      and jsonb_typeof(site_document -> 'sections') = 'array'
      and jsonb_array_length(site_document -> 'sections') between 1 and 12
      and pg_column_size(site_document) <= 2097152
      and case
        when not (site_document ? 'pages') then true
        when jsonb_typeof(site_document -> 'pages') <> 'array' then false
        else jsonb_array_length(site_document -> 'pages') between 1 and 50
      end
    ),
  created_at timestamptz not null default now(),
  unique (site_id, revision_number)
);
create index cr_site_revisions_site_idx
  on public.cr_site_revisions(site_id, revision_number desc);

alter table public.cr_builder_sites
  add column published_revision_id uuid
    references public.cr_site_revisions(id) on delete set null;

alter table public.cr_jobs
  add column if not exists builder_site_id uuid
    references public.cr_builder_sites(id) on delete cascade;
create index if not exists cr_jobs_builder_site_activity_idx
  on public.cr_jobs(owner_id, builder_site_id, created_at desc);
create unique index cr_jobs_one_active_site_import_idx
  on public.cr_jobs(builder_site_id)
  where kind = 'site_import' and status in ('queued', 'leased');

create table public.cr_builder_usage_accounts (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  variable_cost_limit_microeur bigint not null check (variable_cost_limit_microeur >= 0),
  consumed_cost_microeur bigint not null default 0 check (consumed_cost_microeur >= 0),
  reserved_cost_microeur bigint not null default 0 check (reserved_cost_microeur >= 0),
  imports_used integer not null default 0 check (imports_used >= 0),
  hosted_visit_limit integer not null check (hosted_visit_limit >= 0),
  hosted_visits integer not null default 0 check (hosted_visits >= 0),
  period_started_at timestamptz not null default now(),
  period_ends_at timestamptz not null default (now() + interval '1 month'),
  updated_at timestamptz not null default now(),
  check (
    consumed_cost_microeur + reserved_cost_microeur <= variable_cost_limit_microeur
  )
);

create table public.cr_builder_cost_ledger (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  site_id uuid not null references public.cr_builder_sites(id) on delete cascade,
  job_id uuid not null references public.cr_jobs(id) on delete cascade,
  entry_type text not null check (entry_type in ('reserve', 'charge', 'release')),
  provider_cost_microeur bigint not null check (provider_cost_microeur >= 0),
  created_at timestamptz not null default now(),
  unique (job_id, entry_type)
);

alter table public.cr_builder_sites enable row level security;
alter table public.cr_site_revisions enable row level security;
alter table public.cr_builder_usage_accounts enable row level security;
alter table public.cr_builder_cost_ledger enable row level security;

create policy cr_builder_sites_owner_select
  on public.cr_builder_sites for select
  using (auth.uid() = owner_id);
create policy cr_site_revisions_owner_select
  on public.cr_site_revisions for select
  using (auth.uid() = owner_id);
create policy cr_builder_usage_accounts_owner_select
  on public.cr_builder_usage_accounts for select
  using (auth.uid() = owner_id);
create policy cr_builder_cost_ledger_owner_select
  on public.cr_builder_cost_ledger for select
  using (auth.uid() = owner_id);

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
  reservation := case current_plan when 'agency' then 500000 else 100000 end;
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

create or replace function public.cr_record_published_site_visit(p_slug text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  site_owner uuid;
  current_plan public.cr_plan_id;
  current_period_end timestamptz;
  monthly_cost_limit bigint;
  monthly_visit_limit integer;
begin
  select sites.owner_id into site_owner
  from public.cr_builder_sites sites
  where sites.slug = p_slug
    and sites.status = 'published'
    and sites.published_revision_id is not null
    and sites.archived_at is null;
  if site_owner is null then return false; end if;
  select subscriptions.plan_id, subscriptions.current_period_end
  into current_plan, current_period_end
  from public.cr_subscriptions subscriptions
  where subscriptions.owner_id = site_owner;
  current_plan := coalesce(current_plan, 'free'::public.cr_plan_id);
  current_period_end := case
    when current_period_end > now() then current_period_end
    else now() + interval '1 month'
  end;
  if current_plan = 'free' then return false; end if;
  monthly_cost_limit := case current_plan when 'agency' then 40000000 else 6000000 end;
  monthly_visit_limit := case current_plan when 'agency' then 250000 else 20000 end;

  insert into public.cr_builder_usage_accounts (
    owner_id,
    variable_cost_limit_microeur,
    hosted_visit_limit,
    period_ends_at
  ) values (
    site_owner,
    monthly_cost_limit,
    monthly_visit_limit,
    current_period_end
  ) on conflict (owner_id) do nothing;

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
      hosted_visit_limit = monthly_visit_limit,
      hosted_visits = case when period_ends_at <= now() then 0 else hosted_visits end,
      period_started_at = case when period_ends_at <= now() then now() else period_started_at end,
      period_ends_at = case
        when period_ends_at <= now()
          then current_period_end
        else period_ends_at
      end,
      updated_at = now()
  where owner_id = site_owner;

  update public.cr_builder_usage_accounts
  set hosted_visits = hosted_visits + 1, updated_at = now()
  where owner_id = site_owner and hosted_visits < hosted_visit_limit;
  return found;
end;
$$;

create or replace function public.cr_settle_site_import(
  p_site_id uuid,
  p_job_id uuid,
  p_succeeded boolean,
  p_site_document jsonb,
  p_provider_cost_microeur bigint,
  p_error text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_site public.cr_builder_sites%rowtype;
  reserved_cost bigint;
  next_revision integer;
  actual_cost bigint := greatest(p_provider_cost_microeur, 0);
begin
  select * into source_site
  from public.cr_builder_sites
  where id = p_site_id
  for update;
  if source_site.id is null then raise exception 'Website not found'; end if;

  select provider_cost_microeur into reserved_cost
  from public.cr_builder_cost_ledger
  where job_id = p_job_id and site_id = p_site_id and entry_type = 'reserve';
  if reserved_cost is null then raise exception 'Website import reservation not found'; end if;
  if exists (
    select 1 from public.cr_builder_cost_ledger
    where job_id = p_job_id and site_id = p_site_id and entry_type = 'charge'
  ) then return; end if;
  if actual_cost > reserved_cost then
    raise exception 'Provider cost exceeded the reserved margin budget';
  end if;

  if p_succeeded then
    if jsonb_typeof(p_site_document) <> 'object'
      or p_site_document ->> 'version' <> '1'
      or jsonb_typeof(p_site_document -> 'sections') <> 'array'
      or jsonb_array_length(p_site_document -> 'sections') not between 1 and 12
      or pg_column_size(p_site_document) > 2097152
      or case
        when not (p_site_document ? 'pages') then false
        when jsonb_typeof(p_site_document -> 'pages') <> 'array' then true
        else jsonb_array_length(p_site_document -> 'pages') not between 1 and 50
      end then
      raise exception 'Invalid site document';
    end if;
    select coalesce(max(revision_number), 0) + 1 into next_revision
    from public.cr_site_revisions
    where site_id = p_site_id;
    insert into public.cr_site_revisions (
      owner_id, site_id, revision_number, site_document
    ) values (
      source_site.owner_id, p_site_id, next_revision, p_site_document
    );
    update public.cr_builder_sites
    set status = 'ready',
        status_message = 'Your first version is ready',
        last_error = null,
        updated_at = now()
    where id = p_site_id;
  else
    update public.cr_builder_sites
    set status = 'failed',
        status_message = 'The source website could not be recreated',
        last_error = left(p_error, 2000),
        updated_at = now()
    where id = p_site_id;
  end if;

  update public.cr_builder_usage_accounts
  set reserved_cost_microeur = greatest(reserved_cost_microeur - reserved_cost, 0),
      consumed_cost_microeur = consumed_cost_microeur + actual_cost,
      updated_at = now()
  where owner_id = source_site.owner_id;
  insert into public.cr_builder_cost_ledger (
    owner_id, site_id, job_id, entry_type, provider_cost_microeur
  ) values (
    source_site.owner_id, p_site_id, p_job_id, 'charge', actual_cost
  ) on conflict (job_id, entry_type) do nothing;
  insert into public.cr_builder_cost_ledger (
    owner_id, site_id, job_id, entry_type, provider_cost_microeur
  ) values (
    source_site.owner_id, p_site_id, p_job_id, 'release', reserved_cost - actual_cost
  ) on conflict (job_id, entry_type) do nothing;
end;
$$;

create or replace function public.cr_update_builder_site_content(
  p_site_id uuid,
  p_site_document jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_owner uuid := auth.uid();
  next_revision integer;
  revision_id uuid;
begin
  if current_owner is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(p_site_document) <> 'object'
    or p_site_document ->> 'version' <> '1'
    or jsonb_typeof(p_site_document -> 'sections') <> 'array'
    or jsonb_array_length(p_site_document -> 'sections') not between 1 and 12
    or pg_column_size(p_site_document) > 2097152
    or case
      when not (p_site_document ? 'pages') then false
      when jsonb_typeof(p_site_document -> 'pages') <> 'array' then true
      else jsonb_array_length(p_site_document -> 'pages') not between 1 and 50
    end then
    raise exception 'Invalid site document';
  end if;
  perform 1 from public.cr_builder_sites
  where id = p_site_id and owner_id = current_owner and archived_at is null
  for update;
  if not found then raise exception 'Website not found'; end if;
  select coalesce(max(revision_number), 0) + 1 into next_revision
  from public.cr_site_revisions
  where site_id = p_site_id;
  insert into public.cr_site_revisions (
    owner_id, site_id, revision_number, site_document
  ) values (
    current_owner, p_site_id, next_revision, p_site_document
  ) returning id into revision_id;
  update public.cr_builder_sites
  set status = 'ready', status_message = 'Your changes are ready', updated_at = now()
  where id = p_site_id and owner_id = current_owner;
  return revision_id;
end;
$$;

create or replace function public.cr_publish_builder_site(p_site_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_owner uuid := auth.uid();
  latest_revision_id uuid;
  public_slug text;
begin
  if current_owner is null then raise exception 'Authentication required'; end if;
  perform 1 from public.cr_builder_sites
  where id = p_site_id and owner_id = current_owner and archived_at is null
  for update;
  if not found then raise exception 'Website not found'; end if;
  select revisions.id into latest_revision_id
  from public.cr_site_revisions revisions
  where revisions.site_id = p_site_id and revisions.owner_id = current_owner
  order by revisions.revision_number desc
  limit 1;
  if latest_revision_id is null then raise exception 'Website has no version to publish'; end if;
  update public.cr_builder_sites
  set published_revision_id = latest_revision_id,
      published_at = now(),
      status = 'published',
      status_message = 'Your website is online',
      updated_at = now()
  where id = p_site_id and owner_id = current_owner and archived_at is null
  returning slug into public_slug;
  if public_slug is null then raise exception 'Website not found'; end if;
  return public_slug;
end;
$$;

revoke all on function public.cr_request_site_import(text, text, text)
  from public, anon;
grant execute on function public.cr_request_site_import(text, text, text)
  to authenticated;
revoke all on function public.cr_update_builder_site_content(uuid, jsonb)
  from public, anon;
grant execute on function public.cr_update_builder_site_content(uuid, jsonb)
  to authenticated;
revoke all on function public.cr_publish_builder_site(uuid)
  from public, anon;
grant execute on function public.cr_publish_builder_site(uuid)
  to authenticated;
revoke all on function public.cr_settle_site_import(
  uuid, uuid, boolean, jsonb, bigint, text
) from public, anon, authenticated;
grant execute on function public.cr_settle_site_import(
  uuid, uuid, boolean, jsonb, bigint, text
) to service_role;
revoke all on function public.cr_record_published_site_visit(text)
  from public, anon, authenticated;
grant execute on function public.cr_record_published_site_visit(text)
  to service_role;

comment on column public.cr_site_revisions.site_document is
  'Bounded component data only. Never raw HTML, JavaScript, credentials, or executable source.';
comment on column public.cr_builder_usage_accounts.variable_cost_limit_microeur is
  'Hard monthly provider-cost ceiling. Work must reserve budget before it can enter the queue.';
