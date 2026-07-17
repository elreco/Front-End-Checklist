-- Add verifiable evidence and an owner-controlled workflow to CodeRocket findings.
-- Existing audits and findings remain open and keep their current history.

alter table public.cr_occurrences
  add column if not exists evidence jsonb not null default '{}'::jsonb
    check (jsonb_typeof(evidence) = 'object');

alter table public.cr_findings
  add column if not exists workflow_status text not null default 'open'
    check (workflow_status in ('open', 'acknowledged', 'muted')),
  add column if not exists workflow_note text,
  add column if not exists workflow_updated_at timestamptz;

comment on column public.cr_occurrences.evidence is
  'Deterministic HTML, response-header, or network evidence captured for this occurrence.';
comment on column public.cr_findings.workflow_status is
  'Owner-controlled review state. It does not alter the deterministic audit result.';

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
    message text,
    evidence jsonb
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

  insert into public.cr_occurrences (owner_id, audit_id, finding_id, status, message, evidence)
  select
    p_owner_id,
    audit_id,
    stored.id,
    finding.status,
    finding.message,
    coalesce(finding.evidence, '{}'::jsonb)
  from jsonb_to_recordset(p_findings) as finding(
    fingerprint text,
    status public.cr_finding_status,
    message text,
    evidence jsonb
  )
  join public.cr_findings stored
    on stored.project_id = p_project_id and stored.fingerprint = finding.fingerprint;

  return audit_id;
end;
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
