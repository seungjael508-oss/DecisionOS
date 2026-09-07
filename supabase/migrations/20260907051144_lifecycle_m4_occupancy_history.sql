create table public.unit_occupancy_status (
  occupancy_status_id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project (id) on delete restrict,
  unit_id uuid not null,
  contract_id uuid not null,
  occupancy_intent public.occupancy_intent not null default 'UNDECIDED',
  funding_status public.funding_status not null default 'UNKNOWN',
  move_in_status public.move_in_status not null default 'NOT_CONTACTED',
  planned_move_in_date date,
  balance_paid_at timestamptz,
  actual_move_in_date timestamptz,
  last_contact_at timestamptz,
  next_contact_at timestamptz,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contract_id),
  unique (project_id, unit_id),
  foreign key (contract_id, project_id, unit_id)
    references public.contract (contract_id, project_id, unit_id)
    on delete restrict,
  foreign key (project_id, unit_id)
    references public.project_unit (project_id, unit_id)
    on delete restrict,
  foreign key (updated_by, project_id)
    references public.project_member (id, project_id)
    on delete restrict,
  check (
    move_in_status <> 'BALANCE_PAID'
    or balance_paid_at is not null
  ),
  check (
    move_in_status <> 'MOVED_IN'
    or actual_move_in_date is not null
  )
);

create index idx_uos_project_move_in
  on public.unit_occupancy_status (project_id, move_in_status);

create index idx_uos_project_intent
  on public.unit_occupancy_status (project_id, occupancy_intent);

create index idx_uos_project_funding
  on public.unit_occupancy_status (project_id, funding_status);

create index idx_uos_project_next_contact
  on public.unit_occupancy_status (project_id, next_contact_at);

create trigger set_updated_at
  before update on public.unit_occupancy_status
  for each row
  execute function private.set_updated_at();

create table public.contract_status_history (
  history_id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project (id) on delete restrict,
  contract_id uuid not null,
  unit_id uuid not null,
  field_changed varchar not null,
  previous_value text,
  new_value text,
  reason text,
  contact_id uuid,
  changed_by uuid not null,
  changed_at timestamptz not null default now(),
  foreign key (contract_id, project_id, unit_id)
    references public.contract (contract_id, project_id, unit_id)
    on delete restrict,
  foreign key (project_id, unit_id)
    references public.project_unit (project_id, unit_id)
    on delete restrict,
  foreign key (changed_by, project_id)
    references public.project_member (id, project_id)
    on delete restrict,
  check (
    field_changed in (
      'occupancy_intent',
      'funding_status',
      'move_in_status'
    )
  )
);

create index idx_csh_project_unit_changed
  on public.contract_status_history (project_id, unit_id, changed_at desc);

create index idx_csh_project_contract_changed
  on public.contract_status_history (project_id, contract_id, changed_at desc);

create index idx_csh_project_field_changed
  on public.contract_status_history (project_id, field_changed, changed_at desc);
