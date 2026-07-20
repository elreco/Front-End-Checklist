-- Keep an older worker deployment from consuming an import or leaving provider cost reserved.

create or replace function public.cr_refund_incompatible_site_import()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.kind = 'site_import'
    and new.status = 'failed'
    and new.attempts >= 3
    and new.last_error = 'Unsupported worker job kind: site_import'
    and new.builder_site_id is not null
    and not exists (
      select 1
      from public.cr_builder_cost_ledger ledger
      where ledger.job_id = new.id
        and ledger.entry_type = 'charge'
    ) then
    perform public.cr_settle_site_import(
      new.builder_site_id,
      new.id,
      false,
      '{}'::jsonb,
      0,
      'The creation service needed an update before it could study this website.'
    );

    update public.cr_builder_usage_accounts
    set imports_used = greatest(imports_used - 1, 0),
        updated_at = now()
    where owner_id = new.owner_id;

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
      new.owner_id,
      new.builder_site_id,
      new.id,
      'failed',
      'completed',
      'failed',
      'Creation stopped before the website was studied',
      'The creation service needed an update. Nothing was published or counted against your website allowance.',
      100
    )
    on conflict (job_id, event_key) do nothing;
  end if;
  return new;
end;
$$;

create trigger cr_jobs_refund_incompatible_site_import
after update of status, last_error on public.cr_jobs
for each row execute function public.cr_refund_incompatible_site_import();

revoke all on function public.cr_refund_incompatible_site_import()
  from public, anon, authenticated;
