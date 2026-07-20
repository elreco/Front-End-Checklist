-- Add durable conversational edits, managed collections, and a safe connector catalogue.
-- The default studio stays no-code; provider secrets and generated executable code never enter
-- these owner-readable tables.

alter table public.cr_jobs
  drop constraint if exists cr_jobs_kind_check;
alter table public.cr_jobs
  add constraint cr_jobs_kind_check
  check (kind in (
    'audit',
    'retention',
    'email',
    'ai_analysis',
    'ai_usage',
    'site_import',
    'site_edit'
  ));
create unique index cr_jobs_one_active_site_edit_idx
  on public.cr_jobs(builder_site_id)
  where kind = 'site_edit' and status in ('queued', 'leased');

create table public.cr_builder_messages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  site_id uuid not null references public.cr_builder_sites(id) on delete cascade,
  job_id uuid references public.cr_jobs(id) on delete set null,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 4000),
  status text not null check (status in ('queued', 'working', 'completed', 'failed')),
  credit_cost integer not null default 0 check (credit_cost between 0 and 100),
  created_at timestamptz not null default now()
);
create index cr_builder_messages_site_activity_idx
  on public.cr_builder_messages(owner_id, site_id, created_at);

create table public.cr_builder_collections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  site_id uuid not null references public.cr_builder_sites(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  kind text not null check (kind in ('products', 'contacts', 'bookings', 'content', 'custom')),
  fields jsonb not null check (
    jsonb_typeof(fields) = 'array'
    and jsonb_array_length(fields) between 1 and 20
    and pg_column_size(fields) <= 16384
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_id, name)
);
create table public.cr_builder_records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  site_id uuid not null references public.cr_builder_sites(id) on delete cascade,
  collection_id uuid not null references public.cr_builder_collections(id) on delete cascade,
  values jsonb not null check (
    jsonb_typeof(values) = 'object' and pg_column_size(values) <= 65536
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index cr_builder_records_collection_idx
  on public.cr_builder_records(owner_id, collection_id, created_at desc);

create table public.cr_builder_connections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  site_id uuid not null references public.cr_builder_sites(id) on delete cascade,
  provider text not null check (provider in (
    'coderocket_data',
    'stripe',
    'supabase',
    'calendly',
    'shopify'
  )),
  status text not null check (status in ('available', 'setup', 'connected', 'attention')),
  display_name text check (display_name is null or char_length(display_name) between 1 and 120),
  public_config jsonb not null default '{}'::jsonb check (
    jsonb_typeof(public_config) = 'object' and pg_column_size(public_config) <= 16384
  ),
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_id, provider)
);

alter table public.cr_builder_messages enable row level security;
alter table public.cr_builder_collections enable row level security;
alter table public.cr_builder_records enable row level security;
alter table public.cr_builder_connections enable row level security;

create policy cr_builder_messages_owner_select
  on public.cr_builder_messages for select
  using (auth.uid() = owner_id);
create policy cr_builder_collections_owner_all
  on public.cr_builder_collections for all
  using (
    auth.uid() = owner_id
    and exists (
      select 1 from public.cr_builder_sites sites
      where sites.id = site_id and sites.owner_id = auth.uid() and sites.archived_at is null
    )
  )
  with check (
    auth.uid() = owner_id
    and exists (
      select 1 from public.cr_builder_sites sites
      where sites.id = site_id and sites.owner_id = auth.uid() and sites.archived_at is null
    )
  );
create policy cr_builder_records_owner_all
  on public.cr_builder_records for all
  using (
    auth.uid() = owner_id
    and exists (
      select 1 from public.cr_builder_collections collections
      where collections.id = collection_id
        and collections.site_id = site_id
        and collections.owner_id = auth.uid()
    )
  )
  with check (
    auth.uid() = owner_id
    and exists (
      select 1 from public.cr_builder_collections collections
      where collections.id = collection_id
        and collections.site_id = site_id
        and collections.owner_id = auth.uid()
    )
  );
create policy cr_builder_connections_owner_all
  on public.cr_builder_connections for all
  using (
    auth.uid() = owner_id
    and exists (
      select 1 from public.cr_builder_sites sites
      where sites.id = site_id and sites.owner_id = auth.uid() and sites.archived_at is null
    )
  )
  with check (
    auth.uid() = owner_id
    and exists (
      select 1 from public.cr_builder_sites sites
      where sites.id = site_id and sites.owner_id = auth.uid() and sites.archived_at is null
    )
  );

revoke all privileges on table public.cr_builder_messages from anon, authenticated;
grant select on table public.cr_builder_messages to authenticated;
grant all privileges on table public.cr_builder_messages to service_role;
revoke all privileges on table public.cr_builder_collections from anon, authenticated;
grant select, insert, update, delete on table public.cr_builder_collections to authenticated;
grant all privileges on table public.cr_builder_collections to service_role;
revoke all privileges on table public.cr_builder_records from anon, authenticated;
grant select, insert, update, delete on table public.cr_builder_records to authenticated;
grant all privileges on table public.cr_builder_records to service_role;
revoke all privileges on table public.cr_builder_connections from anon, authenticated;
grant select, insert, update, delete on table public.cr_builder_connections to authenticated;
grant all privileges on table public.cr_builder_connections to service_role;

create or replace function public.cr_request_site_edit(
  p_site_id uuid,
  p_instruction text
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
  monthly_cost_limit bigint;
  monthly_credit_limit integer;
  credit_cost integer := 6;
  reservation bigint := 150000;
  queued_job_id uuid := gen_random_uuid();
  user_message_id uuid := gen_random_uuid();
begin
  if current_owner is null then raise exception 'Authentication required'; end if;
  if char_length(trim(p_instruction)) not between 2 and 2000 then
    raise exception 'Describe one change in a little more detail';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(current_owner::text, 1));
  perform 1
  from public.cr_builder_sites
  where id = p_site_id
    and owner_id = current_owner
    and status in ('ready', 'published')
    and archived_at is null
  for update;
  if not found then raise exception 'Website is not ready to edit'; end if;
  if not exists (
    select 1 from public.cr_site_revisions
    where site_id = p_site_id and owner_id = current_owner
  ) then
    raise exception 'Website has no editable version';
  end if;

  select subscriptions.plan_id, subscriptions.current_period_end
  into current_plan, current_period_end
  from public.cr_subscriptions subscriptions
  where subscriptions.owner_id = current_owner;
  current_plan := coalesce(current_plan, 'free'::public.cr_plan_id);
  if current_plan = 'free' then raise exception 'A paid website plan is required'; end if;
  monthly_cost_limit := case current_plan when 'agency' then 40000000 else 6000000 end;
  monthly_credit_limit := case current_plan when 'agency' then 600 else 100 end;
  current_period_end := case
    when current_period_end > now() then current_period_end
    else now() + interval '1 month'
  end;

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
      period_started_at = case when period_ends_at <= now() then now() else period_started_at end,
      period_ends_at = case when period_ends_at <= now() then current_period_end else period_ends_at end,
      creation_credit_limit = monthly_credit_limit,
      creation_credits_used = case
        when credits_period_ends_at <= now() then 0 else creation_credits_used
      end,
      credits_period_ends_at = case
        when credits_period_ends_at <= now() then current_period_end
        else credits_period_ends_at
      end,
      updated_at = now()
  where owner_id = current_owner;

  update public.cr_builder_usage_accounts
  set reserved_cost_microeur = reserved_cost_microeur + reservation,
      creation_credits_used = creation_credits_used + credit_cost,
      updated_at = now()
  where owner_id = current_owner
    and creation_credit_limit - creation_credits_used >= credit_cost
    and variable_cost_limit_microeur
      - consumed_cost_microeur
      - reserved_cost_microeur >= reservation;
  if not found then raise exception 'Not enough creation credits'; end if;

  insert into public.cr_jobs (
    id,
    owner_id,
    builder_site_id,
    kind,
    payload,
    progress_stage,
    progress_message
  ) values (
    queued_job_id,
    current_owner,
    p_site_id,
    'site_edit',
    jsonb_build_object('siteId', p_site_id, 'messageId', user_message_id),
    'queued',
    'Your change is safely waiting'
  );
  insert into public.cr_builder_messages (
    id,
    owner_id,
    site_id,
    job_id,
    role,
    content,
    status,
    credit_cost
  ) values (
    user_message_id,
    current_owner,
    p_site_id,
    queued_job_id,
    'user',
    trim(p_instruction),
    'queued',
    credit_cost
  );
  insert into public.cr_builder_cost_ledger (
    owner_id, site_id, job_id, entry_type, provider_cost_microeur
  ) values (
    current_owner, p_site_id, queued_job_id, 'reserve', reservation
  );
  insert into public.cr_builder_credit_ledger (
    owner_id, site_id, job_id, entry_type, credits, reason
  ) values (
    current_owner, p_site_id, queued_job_id, 'charge', credit_cost, 'Guided website change'
  );
  return queued_job_id;
end;
$$;

create or replace function public.cr_settle_site_edit(
  p_site_id uuid,
  p_job_id uuid,
  p_succeeded boolean,
  p_site_document jsonb,
  p_provider_cost_microeur bigint,
  p_reply text,
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
  if reserved_cost is null then raise exception 'Website edit reservation not found'; end if;
  if exists (
    select 1 from public.cr_builder_cost_ledger
    where job_id = p_job_id and entry_type = 'charge'
  ) then
    return;
  end if;
  if actual_cost > reserved_cost then
    raise exception 'Provider cost exceeded the reserved margin budget';
  end if;

  if p_succeeded then
    if jsonb_typeof(p_site_document) <> 'object'
      or p_site_document ->> 'version' <> '1'
      or jsonb_typeof(p_site_document -> 'sections') <> 'array'
      or jsonb_array_length(p_site_document -> 'sections') not between 1 and 12
      or pg_column_size(p_site_document) > 2097152 then
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
    update public.cr_builder_messages
    set status = 'completed'
    where job_id = p_job_id and role = 'user';
    insert into public.cr_builder_messages (
      owner_id, site_id, job_id, role, content, status, credit_cost
    ) values (
      source_site.owner_id,
      p_site_id,
      p_job_id,
      'assistant',
      left(trim(p_reply), 4000),
      'completed',
      0
    );
    update public.cr_builder_sites
    set status_message = 'Your latest change is ready', updated_at = now()
    where id = p_site_id;
  else
    update public.cr_builder_messages
    set status = 'failed'
    where job_id = p_job_id and role = 'user';
    insert into public.cr_builder_messages (
      owner_id, site_id, job_id, role, content, status, credit_cost
    ) values (
      source_site.owner_id,
      p_site_id,
      p_job_id,
      'assistant',
      'I could not complete that change safely. Your previous version is unchanged and the credits were returned.',
      'failed',
      0
    );
    perform public.cr_refund_builder_job_credits(p_job_id);
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

revoke all on function public.cr_request_site_edit(uuid, text) from public, anon;
grant execute on function public.cr_request_site_edit(uuid, text) to authenticated;
revoke all on function public.cr_settle_site_edit(
  uuid, uuid, boolean, jsonb, bigint, text, text
) from public, anon, authenticated;
grant execute on function public.cr_settle_site_edit(
  uuid, uuid, boolean, jsonb, bigint, text, text
) to service_role;

do $$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'cr_builder_messages'
  ) then
    alter publication supabase_realtime add table public.cr_builder_messages;
  end if;
end;
$$;

comment on table public.cr_builder_messages is
  'Owner-visible plain-language website conversation. Never model prompts, hidden reasoning, tokens, or source code.';
comment on table public.cr_builder_collections is
  'Managed no-code data shapes for products, contacts, bookings, and page content.';
comment on column public.cr_builder_connections.public_config is
  'Non-secret connector labels and public identifiers only. Credentials belong in encrypted service storage.';
