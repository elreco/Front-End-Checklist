-- Keep long website recreations owned by one worker while retaining five-minute crash recovery.

create or replace function public.cr_renew_job_lease(
  p_job_id uuid,
  p_worker_id text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.cr_jobs
  set lease_expires_at = now() + interval '5 minutes'
  where id = p_job_id
    and status = 'leased'
    and lease_owner = p_worker_id;
  return found;
end;
$$;

revoke all on function public.cr_renew_job_lease(uuid, text)
  from public, anon, authenticated;
grant execute on function public.cr_renew_job_lease(uuid, text)
  to service_role;
