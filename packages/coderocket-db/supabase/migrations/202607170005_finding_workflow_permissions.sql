-- Allow owners to change only the review metadata attached to their findings.

grant update (workflow_status, workflow_note, workflow_updated_at)
on table public.cr_findings
to authenticated;

create policy cr_findings_owner_update
on public.cr_findings
for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);
