create table public.subscription (
  subscription_id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project (id) on delete restrict,
  customer_id uuid not null,
  subscription_round varchar not null,
  subscription_type varchar,
  unit_type varchar,
  satisfaction_notes text,
  contract_interest_level varchar,
  subscribed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subscription_id, project_id),
  unique (subscription_id, customer_id, project_id),
  foreign key (customer_id, project_id)
    references public.customer (id, project_id)
    on delete restrict
);

create index idx_subscription_project_customer
  on public.subscription (project_id, customer_id);

create index idx_subscription_project_subscribed_at
  on public.subscription (project_id, subscribed_at desc);

create trigger set_updated_at
  before update on public.subscription
  for each row
  execute function private.set_updated_at();

create table public.contract (
  contract_id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project (id) on delete restrict,
  customer_id uuid not null,
  unit_id uuid not null,
  subscription_id uuid,
  contract_status public.contract_status not null,
  winner_confirmed boolean,
  winner_list_received_at date,
  contract_scheduled_date date,
  visit_date_confirmed boolean not null default false,
  document_status varchar,
  contracted_at timestamptz not null default now(),
  cancellation_reason varchar,
  previous_contract_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contract_id, project_id),
  unique (contract_id, project_id, unit_id),
  foreign key (customer_id, project_id)
    references public.customer (id, project_id)
    on delete restrict,
  foreign key (project_id, unit_id)
    references public.project_unit (project_id, unit_id)
    on delete restrict,
  foreign key (subscription_id, customer_id, project_id)
    references public.subscription (subscription_id, customer_id, project_id)
    on delete restrict,
  foreign key (previous_contract_id, project_id, unit_id)
    references public.contract (contract_id, project_id, unit_id)
    on delete restrict,
  check (
    previous_contract_id is null
    or previous_contract_id <> contract_id
  ),
  check (
    (
      contract_status = 'CANCELLED'
      and cancellation_reason is not null
    )
    or (
      contract_status <> 'CANCELLED'
      and cancellation_reason is null
    )
  )
);

create unique index uq_contract_active_unit
  on public.contract (project_id, unit_id)
  where contract_status = 'ACTIVE';

create index idx_contract_project_customer
  on public.contract (project_id, customer_id);

create index idx_contract_project_unit
  on public.contract (project_id, unit_id);

create index idx_contract_project_status
  on public.contract (project_id, contract_status);

create index idx_contract_previous
  on public.contract (previous_contract_id);

create index idx_contract_project_contracted_at
  on public.contract (project_id, contracted_at desc);

create trigger set_updated_at
  before update on public.contract
  for each row
  execute function private.set_updated_at();
