-- Evolve CodeRocket from a release-only gate into an honest website health monitor.
-- This migration is intentionally additive so legacy CodeRocket data remains untouched.

alter type public.cr_gate_status add value if not exists 'inconclusive';

alter table public.cr_audits
  add column if not exists requested_page_count integer not null default 0,
  add column if not exists checked_page_count integer not null default 0;

alter table public.cr_findings
  add column if not exists category text not null default 'quality'
    check (category in ('availability', 'search', 'accessibility', 'performance', 'security', 'quality')),
  add column if not exists source text not null default 'frontend_checklist'
    check (source in ('frontend_checklist', 'http')),
  add column if not exists occurrence_key text not null default 'primary';

alter table public.cr_profiles
  add column if not exists audience text not null default 'site_owner'
    check (audience in ('site_owner', 'freelancer', 'agency'));

comment on column public.cr_audits.requested_page_count is
  'Number of configured pages CodeRocket attempted to check.';
comment on column public.cr_audits.checked_page_count is
  'Number of requested pages that returned auditable HTML.';
comment on column public.cr_findings.category is
  'Plain-language website health area shown to the customer.';
comment on column public.cr_findings.source is
  'Deterministic check engine that produced the finding.';
comment on column public.cr_findings.occurrence_key is
  'Stable identity for repeated occurrences of the same rule on one page.';
comment on column public.cr_profiles.audience is
  'Plain-language onboarding path used to tailor guidance without creating workspaces or seats.';
