-- CS ticket is a work-issue ledger, not a contact log.
-- customer_id is the subject. Matching contract/consultation/unit to that
-- customer is a required create/update RPC check before opening writes.
-- Do not add parent UNIQUE/FK on M1-M7 tables for that match.

create table public.cs_ticket (
  cs_ticket_id uuid primary key default gen_random_uuid(),
  project_id uuid not null
    references public.project (id)
    on delete restrict,
  customer_id uuid not null,
  unit_id uuid,
  contract_id uuid,
  source_consultation_id uuid,
  category varchar not null,
  priority varchar not null default 'NORMAL',
  status varchar not null default 'OPEN',
  title varchar not null,
  description text not null,
  resolution text,
  assigned_to uuid,
  created_by uuid not null,
  opened_at timestamptz not null default now(),
  due_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cs_ticket_id, project_id),
  foreign key (customer_id, project_id)
    references public.customer (id, project_id)
    on delete restrict,
  foreign key (project_id, unit_id)
    references public.project_unit (project_id, unit_id)
    on delete restrict,
  foreign key (contract_id, project_id)
    references public.contract (contract_id, project_id)
    on delete restrict,
  foreign key (source_consultation_id, project_id)
    references public.consultation (id, project_id)
    on delete restrict,
  foreign key (assigned_to, project_id)
    references public.project_member (id, project_id)
    on delete restrict,
  foreign key (created_by, project_id)
    references public.project_member (id, project_id)
    on delete restrict,
  constraint cs_ticket_category_nonempty_check
    check (btrim(category) <> ''),
  constraint cs_ticket_title_nonempty_check
    check (btrim(title) <> ''),
  constraint cs_ticket_description_nonempty_check
    check (btrim(description) <> ''),
  constraint cs_ticket_resolution_nonempty_check
    check (resolution is null or btrim(resolution) <> ''),
  constraint cs_ticket_status_check
    check (status in ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
  constraint cs_ticket_priority_check
    check (priority in ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  constraint cs_ticket_status_completeness_check
    check (
      (
        status in ('OPEN', 'IN_PROGRESS')
        and resolved_at is null
        and closed_at is null
      )
      or (
        status = 'RESOLVED'
        and resolved_at is not null
        and closed_at is null
        and resolution is not null
      )
      or (
        status = 'CLOSED'
        and resolved_at is not null
        and closed_at is not null
        and resolution is not null
      )
    ),
  constraint cs_ticket_due_at_check
    check (due_at is null or due_at >= opened_at),
  constraint cs_ticket_resolved_at_check
    check (resolved_at is null or resolved_at >= opened_at),
  constraint cs_ticket_closed_at_check
    check (closed_at is null or closed_at >= resolved_at)
);

create index idx_cs_ticket_project_status_opened
  on public.cs_ticket (project_id, status, opened_at desc);

create index idx_cs_ticket_project_assignee_status_opened
  on public.cs_ticket (project_id, assigned_to, status, opened_at desc);

create index idx_cs_ticket_project_customer_opened
  on public.cs_ticket (project_id, customer_id, opened_at desc);

create trigger set_updated_at
  before update on public.cs_ticket
  for each row
  execute function private.set_updated_at();

revoke all on table public.cs_ticket from public;

do $priv$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on table public.cs_ticket from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on table public.cs_ticket from authenticated';
  end if;
end
$priv$;

alter table public.cs_ticket enable row level security;
