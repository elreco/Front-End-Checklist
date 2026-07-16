alter table public.cr_schema_migrations enable row level security;
alter table public.cr_stripe_events enable row level security;
alter table public.cr_worker_heartbeats enable row level security;

revoke all privileges on table
  public.cr_schema_migrations,
  public.cr_profiles,
  public.cr_projects,
  public.cr_jobs,
  public.cr_audits,
  public.cr_audit_pages,
  public.cr_findings,
  public.cr_occurrences,
  public.cr_api_tokens,
  public.cr_share_links,
  public.cr_subscriptions,
  public.cr_stripe_events,
  public.cr_idempotency_keys,
  public.cr_worker_heartbeats
from anon, authenticated;

grant select, update on table public.cr_profiles to authenticated;
grant select, insert, update on table public.cr_projects to authenticated;
grant select, insert on table public.cr_jobs to authenticated;
grant select on table
  public.cr_audits,
  public.cr_audit_pages,
  public.cr_findings,
  public.cr_occurrences,
  public.cr_subscriptions,
  public.cr_idempotency_keys
to authenticated;
grant select, insert, update, delete on table
  public.cr_api_tokens,
  public.cr_share_links
to authenticated;

grant all privileges on table
  public.cr_schema_migrations,
  public.cr_profiles,
  public.cr_projects,
  public.cr_jobs,
  public.cr_audits,
  public.cr_audit_pages,
  public.cr_findings,
  public.cr_occurrences,
  public.cr_api_tokens,
  public.cr_share_links,
  public.cr_subscriptions,
  public.cr_stripe_events,
  public.cr_idempotency_keys,
  public.cr_worker_heartbeats
to service_role;
