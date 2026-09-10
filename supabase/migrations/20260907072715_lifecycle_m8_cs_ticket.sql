-- M8: CS_TICKET is a contract/unit work ledger, not customer_type state.
-- No RLS, RPC, workflow, attachments, or contract-status trigger.

-- Parent key so CS_TICKET can require the ticket customer to be the
-- contract customer (same project/unit), not merely any customer on the project.
alter table public.contract
  add constraint contract_id_customer_id_project_id_unit_id_key
  unique (contract_id, customer_id, project_id, unit_id);

create table public.cs_ticket (
  ticket_id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  contract_id uuid not null,
  unit_id uuid not null,
  customer_id uuid not null,
  category varchar not null,
  title varchar not null,
  description text not null,
  status varchar not null default 'OPEN',
  priority varchar not null default 'MEDIUM',
  assigned_to uuid,
  resolved_at timestamptz,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (
    contract_id,
    customer_id,
    project_id,
    unit_id
  )
    references public.contract (
      contract_id,
      customer_id,
      project_id,
      unit_id
    )
    on delete restrict,
  foreign key (created_by, project_id)
    references public.project_member (id, project_id)
    on delete restrict,
  foreign key (assigned_to, project_id)
    references public.project_member (id, project_id)
    on delete restrict,
  constraint cs_ticket_category_nonempty_check
    check (btrim(category) <> ''),
  constraint cs_ticket_title_nonempty_check
    check (btrim(title) <> ''),
  constraint cs_ticket_description_nonempty_check
    check (btrim(description) <> ''),
  constraint cs_ticket_status_check
    check (status in ('OPEN', 'RESOLVED', 'CLOSED')),
  constraint cs_ticket_priority_check
    check (priority in ('LOW', 'MEDIUM', 'HIGH')),
  constraint cs_ticket_resolved_at_check
    check (
      status <> 'RESOLVED'
      or resolved_at is not null
    )
);

create index idx_cs_ticket_project_status
  on public.cs_ticket (project_id, status);

create index idx_cs_ticket_project_unit_status
  on public.cs_ticket (project_id, unit_id, status);

create index idx_cs_ticket_project_contract
  on public.cs_ticket (project_id, contract_id);

create index idx_cs_ticket_project_assigned_status
  on public.cs_ticket (project_id, assigned_to, status);

create index idx_cs_ticket_project_created_at
  on public.cs_ticket (project_id, created_at desc);

create trigger set_updated_at
  before update on public.cs_ticket
  for each row
  execute function private.set_updated_at();
