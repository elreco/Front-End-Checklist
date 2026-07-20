-- Repair site imports claimed by a worker version deployed before website recreation existed.
-- No provider request started, so release the full cost reservation and return the import allowance.

do $$
declare
  failed_job record;
begin
  for failed_job in
    select
      jobs.id,
      jobs.owner_id,
      jobs.builder_site_id
    from public.cr_jobs jobs
    where jobs.kind = 'site_import'
      and jobs.status = 'failed'
      and jobs.attempts >= 3
      and jobs.last_error = 'Unsupported worker job kind: site_import'
      and jobs.builder_site_id is not null
      and not exists (
        select 1
        from public.cr_builder_cost_ledger ledger
        where ledger.job_id = jobs.id
          and ledger.entry_type = 'charge'
      )
  loop
    perform public.cr_settle_site_import(
      failed_job.builder_site_id,
      failed_job.id,
      false,
      '{}'::jsonb,
      0,
      'The creation service needed an update before it could study this website.'
    );

    update public.cr_builder_usage_accounts
    set imports_used = greatest(imports_used - 1, 0),
        updated_at = now()
    where owner_id = failed_job.owner_id;

    insert into public.cr_builder_import_events (
      owner_id,
      site_id,
      job_id,
      event_key,
      stage,
      event_kind,
      title,
      detail,
      progress
    ) values (
      failed_job.owner_id,
      failed_job.builder_site_id,
      failed_job.id,
      'failed',
      'completed',
      'failed',
      'Creation stopped before the website was studied',
      'The creation service needed an update. Nothing was published or counted against your website allowance.',
      100
    )
    on conflict (job_id, event_key) do nothing;
  end loop;
end;
$$;
