create table public.customer_unit_interest (
  interest_id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project (id) on delete restrict,
  customer_id uuid not null,
  unit_id uuid not null,
  interest_level varchar,
  interest_reason text,
  current_status public.customer_unit_interest_status not null default 'ACTIVE',
  first_interested_at timestamptz not null default now(),
  last_interested_at timestamptz not null default now(),
  assigned_counselor_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, customer_id, unit_id),
  foreign key (customer_id, project_id)
    references public.customer (id, project_id)
    on delete restrict,
  foreign key (project_id, unit_id)
    references public.project_unit (project_id, unit_id)
    on delete restrict,
  foreign key (assigned_counselor_id, project_id)
    references public.project_member (id, project_id)
    on delete restrict
);

create index idx_cui_project_status
  on public.customer_unit_interest (project_id, current_status);

create index idx_cui_project_unit_level
  on public.customer_unit_interest (project_id, unit_id, interest_level);

create trigger set_updated_at
  before update on public.customer_unit_interest
  for each row
  execute function private.set_updated_at();
