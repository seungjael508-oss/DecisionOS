-- M9A: missing core ledgers + RLS. Reuses Phase 1 helpers only.
-- No new SECURITY DEFINER helpers, RPCs, or TEAM_LEAD in policies.

create table public.entry_pool (
  entry_id uuid primary key default gen_random_uuid(),
  project_id uuid not null
    references public.project (id)
    on delete restrict,
  name_or_nickname varchar,
  phone_normalized varchar not null,
  acquisition_channel varchar,
  region varchar,
  interest_unit_type varchar,
  catalog_view_count integer not null default 0,
  price_view_count integer not null default 0,
  status varchar not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, phone_normalized),
  unique (entry_id, project_id),
  constraint entry_pool_catalog_view_count_check
    check (catalog_view_count >= 0),
  constraint entry_pool_price_view_count_check
    check (price_view_count >= 0),
  constraint entry_pool_status_check
    check (status in ('ACTIVE', 'PROMOTED', 'DORMANT'))
);

create index idx_entry_pool_project_status
  on public.entry_pool (project_id, status);

create index idx_entry_pool_project_channel
  on public.entry_pool (project_id, acquisition_channel);

create trigger set_updated_at
  before update on public.entry_pool
  for each row
  execute function private.set_updated_at();

create table public.contact_schedule (
  schedule_id uuid primary key default gen_random_uuid(),
  project_id uuid not null
    references public.project (id)
    on delete restrict,
  customer_id uuid not null,
  contract_id uuid,
  unit_id uuid,
  contact_type varchar not null,
  planned_at timestamptz not null,
  actual_sent_at timestamptz,
  status public.contact_schedule_status not null default 'PENDING',
  result_consultation_id uuid,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (customer_id, project_id)
    references public.customer (id, project_id)
    on delete restrict,
  foreign key (created_by, project_id)
    references public.project_member (id, project_id)
    on delete restrict,
  foreign key (project_id, unit_id)
    references public.project_unit (project_id, unit_id)
    on delete restrict,
  foreign key (contract_id, project_id)
    references public.contract (contract_id, project_id)
    on delete restrict,
  foreign key (result_consultation_id, project_id)
    references public.consultation (id, project_id)
    on delete restrict,
  constraint contact_schedule_sent_at_check
    check (
      status <> 'SENT'::public.contact_schedule_status
      or actual_sent_at is not null
    )
);

create index idx_contact_schedule_project_status_planned
  on public.contact_schedule (project_id, status, planned_at);

create index idx_contact_schedule_project_customer_planned
  on public.contact_schedule (project_id, customer_id, planned_at);

create index idx_contact_schedule_project_unit_planned
  on public.contact_schedule (project_id, unit_id, planned_at);

create trigger set_updated_at
  before update on public.contact_schedule
  for each row
  execute function private.set_updated_at();

create table public.funnel_event (
  event_id uuid primary key default gen_random_uuid(),
  project_id uuid not null
    references public.project (id)
    on delete restrict,
  customer_id uuid not null,
  event_type varchar not null,
  event_at timestamptz not null default now(),
  source_channel varchar,
  metadata jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  foreign key (customer_id, project_id)
    references public.customer (id, project_id)
    on delete restrict,
  foreign key (created_by, project_id)
    references public.project_member (id, project_id)
    on delete restrict
);

create index idx_funnel_event_project_at
  on public.funnel_event (project_id, event_at desc);

create index idx_funnel_event_project_customer_at
  on public.funnel_event (project_id, customer_id, event_at desc);

create index idx_funnel_event_project_type_at
  on public.funnel_event (project_id, event_type, event_at desc);

create table public.community_notice (
  notice_id uuid primary key default gen_random_uuid(),
  project_id uuid not null
    references public.project (id)
    on delete restrict,
  target_type varchar not null,
  title varchar not null,
  content text not null,
  sent_at timestamptz,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (created_by, project_id)
    references public.project_member (id, project_id)
    on delete restrict,
  constraint community_notice_target_type_check
    check (target_type in ('CONTRACT_HOLDER', 'GENERAL')),
  constraint community_notice_title_nonempty_check
    check (btrim(title) <> ''),
  constraint community_notice_content_nonempty_check
    check (btrim(content) <> '')
);

create index idx_community_notice_project_sent
  on public.community_notice (project_id, sent_at desc);

create index idx_community_notice_project_target
  on public.community_notice (project_id, target_type);

create trigger set_updated_at
  before update on public.community_notice
  for each row
  execute function private.set_updated_at();

alter table public.entry_pool enable row level security;
alter table public.contact_schedule enable row level security;
alter table public.funnel_event enable row level security;
alter table public.community_notice enable row level security;

create policy entry_pool_select
on public.entry_pool
for select
to authenticated
using (
  private.has_project_role(
    project_id,
    array['COUNSELOR', 'PROJECT_ADMIN']::public.project_member_role[]
  )
);

create policy entry_pool_insert
on public.entry_pool
for insert
to authenticated
with check (
  private.has_project_role(
    project_id,
    array['COUNSELOR', 'PROJECT_ADMIN']::public.project_member_role[]
  )
);

create policy entry_pool_update
on public.entry_pool
for update
to authenticated
using (
  private.has_project_role(
    project_id,
    array['COUNSELOR', 'PROJECT_ADMIN']::public.project_member_role[]
  )
)
with check (
  private.has_project_role(
    project_id,
    array['COUNSELOR', 'PROJECT_ADMIN']::public.project_member_role[]
  )
);

create policy contact_schedule_select
on public.contact_schedule
for select
to authenticated
using (
  private.has_project_role(
    project_id,
    array['COUNSELOR', 'PROJECT_ADMIN']::public.project_member_role[]
  )
);

create policy funnel_event_select
on public.funnel_event
for select
to authenticated
using (
  private.has_project_role(
    project_id,
    array['COUNSELOR', 'PROJECT_ADMIN']::public.project_member_role[]
  )
);

create policy community_notice_select
on public.community_notice
for select
to authenticated
using (
  private.has_project_role(
    project_id,
    array['COUNSELOR', 'PROJECT_ADMIN']::public.project_member_role[]
  )
);

create policy community_notice_insert
on public.community_notice
for insert
to authenticated
with check (
  private.has_project_role(
    project_id,
    array['PROJECT_ADMIN']::public.project_member_role[]
  )
);

create policy community_notice_update
on public.community_notice
for update
to authenticated
using (
  private.has_project_role(
    project_id,
    array['PROJECT_ADMIN']::public.project_member_role[]
  )
)
with check (
  private.has_project_role(
    project_id,
    array['PROJECT_ADMIN']::public.project_member_role[]
  )
);

revoke all on table public.entry_pool from public;
revoke all on table public.contact_schedule from public;
revoke all on table public.funnel_event from public;
revoke all on table public.community_notice from public;

do $priv$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on table public.entry_pool from anon';
    execute 'revoke all on table public.contact_schedule from anon';
    execute 'revoke all on table public.funnel_event from anon';
    execute 'revoke all on table public.community_notice from anon';
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on table public.entry_pool from authenticated';
    execute 'revoke all on table public.contact_schedule from authenticated';
    execute 'revoke all on table public.funnel_event from authenticated';
    execute 'revoke all on table public.community_notice from authenticated';

    execute 'grant select, insert, update on table public.entry_pool to authenticated';
    execute 'grant select, insert, update on table public.community_notice to authenticated';
    execute 'grant select on table public.contact_schedule to authenticated';
    execute 'grant select on table public.funnel_event to authenticated';
  end if;
end
$priv$;
