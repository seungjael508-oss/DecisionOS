create type public.contract_status as enum ('ACTIVE', 'CANCELLED', 'COMPLETED');

create type public.occupancy_intent as enum (
  'SELF_MOVE_IN',
  'SALE',
  'JEONSE',
  'MONTHLY_RENT',
  'UNDECIDED'
);

create type public.funding_status as enum (
  'NORMAL',
  'LOAN_NEEDED',
  'FUNDING_SHORTAGE',
  'EXISTING_HOME_UNSOLD',
  'UNKNOWN'
);

create type public.move_in_status as enum (
  'NOT_CONTACTED',
  'CONTACTED',
  'PLANNED',
  'DELAYED',
  'BALANCE_PAID',
  'MOVED_IN'
);

create type public.customer_unit_interest_status as enum (
  'ACTIVE',
  'HOLD',
  'LOST',
  'CONTRACTED',
  'UNIT_SOLD_TO_OTHER'
);

create type public.report_phase as enum ('SALES', 'UNSOLD', 'MOVE_IN');

create type public.report_type as enum (
  'MORNING_MEETING',
  'EVENING_MEETING',
  'DAILY',
  'WEEKLY',
  'MONTHLY',
  'CLIENT',
  'EXECUTIVE'
);

create type public.report_template_source_type as enum (
  'PHOTO',
  'SCREENSHOT',
  'EXCEL',
  'MANUAL'
);

create type public.contact_schedule_status as enum (
  'PENDING',
  'SENT',
  'FAILED',
  'SKIPPED'
);

create table public.project_unit (
  unit_id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project (id) on delete restrict,
  building_no varchar not null,
  unit_no varchar not null,
  unit_type varchar,
  floor integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, building_no, unit_no),
  unique (project_id, unit_id)
);

create index idx_project_unit_project_type
  on public.project_unit (project_id, unit_type);

create trigger set_updated_at
  before update on public.project_unit
  for each row
  execute function private.set_updated_at();
