-- Make every stored check atomic and every active project audit unique.
-- This migration is additive: no historical audit, finding, or project row is removed.

alter table public.cr_audits
  add column if not exists job_id uuid references public.cr_jobs(id) on delete set null;

create unique index if not exists cr_audits_job_idx
  on public.cr_audits(job_id)
  where job_id is not null;

create or replace function public.cr_valid_page_paths(paths text[])
returns boolean
language sql
immutable
strict
set search_path = ''
as $$
  select cardinality(paths) between 1 and 25
    and coalesce(bool_and(
      char_length(path) between 1 and 2048
      and left(path, 1) = '/'
      and left(path, 2) <> '//'
      and position('?' in path) = 0
      and position('#' in path) = 0
    ), false)
  from unnest(paths) as path;
$$;

alter table public.cr_projects
  drop constraint if exists cr_projects_valid_page_paths;
alter table public.cr_projects
  add constraint cr_projects_valid_page_paths
  check (public.cr_valid_page_paths(page_paths)) not valid;

with ranked as (
  select id,
    row_number() over (partition by project_id order by created_at desc, id desc) as position
  from public.cr_jobs
  where kind = 'audit'
    and status in ('queued', 'leased')
    and project_id is not null
)
update public.cr_jobs jobs
set status = 'failed',
    completed_at = now(),
    lease_owner = null,
    lease_expires_at = null,
    last_error = 'Superseded duplicate audit job during queue hardening'
from ranked
where jobs.id = ranked.id and ranked.position > 1;

create unique index if not exists cr_jobs_one_active_audit_per_project_idx
  on public.cr_jobs(project_id)
  where kind = 'audit' and status in ('queued', 'leased') and project_id is not null;

create or replace function public.cr_enqueue_due_audits()
returns integer
language plpgsql security definer set search_path = '' as $$
declare queued_count integer;
begin
  with due as (
    select projects.id, projects.owner_id, projects.page_paths,
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
    returning projects.id, projects.owner_id, projects.page_paths
  )
  insert into public.cr_jobs (
    owner_id,
    project_id,
    kind,
    payload,
    progress_stage,
    progress_current,
    progress_total,
    progress_message,
    progress_updated_at
  )
  select
    owner_id,
    id,
    'audit',
    '{"environment":"production","trigger":"scheduled"}'::jsonb,
    'queued',
    0,
    cardinality(page_paths),
    'Waiting for the website checking service',
    now()
  from advanced
  on conflict (project_id)
    where kind = 'audit' and status in ('queued', 'leased') and project_id is not null
    do nothing;
  get diagnostics queued_count = row_count;
  return queued_count;
end;
$$;

create or replace function public.cr_persist_audit(
  p_owner_id uuid,
  p_project_id uuid,
  p_job_id uuid,
  p_environment public.cr_audit_environment,
  p_trigger public.cr_audit_trigger,
  p_ruleset_version text,
  p_baseline_audit_id uuid,
  p_commit_sha text,
  p_branch text,
  p_pull_request text,
  p_gate public.cr_gate_status,
  p_started_at timestamptz,
  p_pages jsonb,
  p_findings jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  audit_id uuid;
  checked_count integer;
  new_count integer;
  persistent_count integer;
  resolved_count integer;
  blocking_count integer;
begin
  if jsonb_typeof(p_pages) <> 'array' or jsonb_typeof(p_findings) <> 'array' then
    raise exception 'Audit pages and findings must be JSON arrays';
  end if;
  if not exists (
    select 1 from public.cr_projects
    where id = p_project_id and owner_id = p_owner_id and archived_at is null
  ) then
    raise exception 'Project is unavailable';
  end if;
  if p_job_id is not null then
    select id into audit_id from public.cr_audits where job_id = p_job_id;
    if audit_id is not null then return audit_id; end if;
  end if;

  select count(*) filter (where reachable)
  into checked_count
  from jsonb_to_recordset(p_pages) as page(reachable boolean);

  select
    count(*) filter (where status = 'new'),
    count(*) filter (where status = 'persistent'),
    count(*) filter (where status = 'resolved'),
    count(*) filter (
      where status = 'new'
        and priority in ('critical', 'high')
        and p_gate = 'failed'
    )
  into new_count, persistent_count, resolved_count, blocking_count
  from jsonb_to_recordset(p_findings)
    as finding(status public.cr_finding_status, priority public.cr_priority);

  insert into public.cr_audits (
    owner_id,
    project_id,
    job_id,
    environment,
    trigger,
    status,
    gate_status,
    ruleset_version,
    baseline_audit_id,
    commit_sha,
    branch,
    pull_request,
    new_count,
    persistent_count,
    resolved_count,
    blocking_count,
    requested_page_count,
    checked_page_count,
    started_at,
    completed_at
  ) values (
    p_owner_id,
    p_project_id,
    p_job_id,
    p_environment,
    p_trigger,
    'succeeded',
    p_gate,
    p_ruleset_version,
    p_baseline_audit_id,
    p_commit_sha,
    p_branch,
    p_pull_request,
    coalesce(new_count, 0),
    coalesce(persistent_count, 0),
    coalesce(resolved_count, 0),
    coalesce(blocking_count, 0),
    jsonb_array_length(p_pages),
    coalesce(checked_count, 0),
    p_started_at,
    clock_timestamp()
  ) returning id into audit_id;

  insert into public.cr_audit_pages (
    owner_id,
    audit_id,
    url,
    normalized_path,
    reachable,
    http_status,
    duration_ms,
    error
  )
  select
    p_owner_id,
    audit_id,
    page.url,
    page.normalized_path,
    page.reachable,
    page.http_status,
    page.duration_ms,
    page.error
  from jsonb_to_recordset(p_pages) as page(
    url text,
    normalized_path text,
    reachable boolean,
    http_status integer,
    duration_ms integer,
    error text
  );

  insert into public.cr_findings (
    owner_id,
    project_id,
    fingerprint,
    normalized_path,
    rule_slug,
    title,
    priority,
    category,
    source,
    occurrence_key,
    first_seen_audit_id,
    last_seen_audit_id,
    resolved_at,
    updated_at
  )
  select
    p_owner_id,
    p_project_id,
    finding.fingerprint,
    finding.normalized_path,
    finding.rule_slug,
    finding.title,
    finding.priority,
    finding.category,
    finding.source,
    finding.occurrence_key,
    audit_id,
    audit_id,
    case when finding.status = 'resolved' then clock_timestamp() else null end,
    clock_timestamp()
  from jsonb_to_recordset(p_findings) as finding(
    fingerprint text,
    normalized_path text,
    rule_slug text,
    title text,
    priority public.cr_priority,
    category text,
    source text,
    occurrence_key text,
    status public.cr_finding_status,
    message text
  )
  on conflict (project_id, fingerprint) do update
  set normalized_path = excluded.normalized_path,
      rule_slug = excluded.rule_slug,
      title = excluded.title,
      priority = excluded.priority,
      category = excluded.category,
      source = excluded.source,
      occurrence_key = excluded.occurrence_key,
      last_seen_audit_id = excluded.last_seen_audit_id,
      resolved_at = excluded.resolved_at,
      updated_at = excluded.updated_at;

  insert into public.cr_occurrences (owner_id, audit_id, finding_id, status, message)
  select
    p_owner_id,
    audit_id,
    stored.id,
    finding.status,
    finding.message
  from jsonb_to_recordset(p_findings) as finding(
    fingerprint text,
    status public.cr_finding_status,
    message text
  )
  join public.cr_findings stored
    on stored.project_id = p_project_id and stored.fingerprint = finding.fingerprint;

  return audit_id;
end;
$$;

create or replace function public.cr_finish_job(p_job_id uuid, p_worker_id text)
returns void language sql security definer set search_path = '' as $$
  update public.cr_jobs
  set status = 'succeeded',
      completed_at = now(),
      lease_expires_at = null,
      lease_owner = null,
      progress_stage = 'completed',
      progress_updated_at = now()
  where id = p_job_id and lease_owner = p_worker_id;
$$;

revoke all on function public.cr_persist_audit(
  uuid,
  uuid,
  uuid,
  public.cr_audit_environment,
  public.cr_audit_trigger,
  text,
  uuid,
  text,
  text,
  text,
  public.cr_gate_status,
  timestamptz,
  jsonb,
  jsonb
) from public, anon, authenticated;
grant execute on function public.cr_persist_audit(
  uuid,
  uuid,
  uuid,
  public.cr_audit_environment,
  public.cr_audit_trigger,
  text,
  uuid,
  text,
  text,
  text,
  public.cr_gate_status,
  timestamptz,
  jsonb,
  jsonb
) to service_role;
