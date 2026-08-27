create schema if not exists private;

create type public.organization_status as enum ('ACTIVE', 'INACTIVE');
create type public.project_status as enum ('ACTIVE', 'CLOSED');
create type public.project_member_role as enum ('COUNSELOR', 'TEAM_LEAD', 'PROJECT_ADMIN');
create type public.customer_status as enum ('ACTIVE', 'ARCHIVED');
create type public.customer_grade as enum ('A', 'B', 'C');
create type public.consultation_ai_status as enum (
  'PENDING',
  'COMPLETED',
  'FAILED',
  'LOW_CONFIDENCE'
);
create type public.consultation_density_level as enum (
  'SIMPLE_INQUIRY',
  'INTEREST',
  'SUBSTANTIVE',
  'ACTION'
);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := statement_timestamp();
  return new;
end;
$$;

create table public.organization (
  id uuid primary key default gen_random_uuid(),
  name varchar(200) not null check (name <> ''),
  status public.organization_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organization (id) on delete restrict,
  name varchar(200) not null check (name <> ''),
  timezone varchar(50) not null default 'Asia/Seoul',
  status public.project_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_project_org on public.project (organization_id);

create table public.project_member (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project (id) on delete restrict,
  user_id uuid not null references auth.users (id) on delete restrict,
  role public.project_member_role not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, user_id),
  unique (id, project_id)
);

create index idx_pm_project_active on public.project_member (project_id, active);
create index idx_pm_user_active_project_role
  on public.project_member (user_id, active, project_id, role);

create table public.customer (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project (id) on delete restrict,
  name varchar(100) not null check (name <> ''),
  phone varchar(20) not null,
  phone_normalized varchar(20) not null check (phone_normalized ~ '^[0-9]+$'),
  status public.customer_status not null default 'ACTIVE',
  grade public.customer_grade not null default 'C',
  suggested_grade public.customer_grade,
  suggested_score smallint check (suggested_score >= 0),
  suggested_grade_reason text,
  suggestion_rule_version varchar(20),
  suggested_at timestamptz,
  source varchar(50),
  assigned_counselor_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, phone_normalized),
  unique (id, project_id),
  foreign key (assigned_counselor_id, project_id)
    references public.project_member (id, project_id)
    on delete restrict
);

create index idx_customer_project_grade on public.customer (project_id, grade);
create index idx_customer_project_phone on public.customer (project_id, phone_normalized);
create index idx_customer_project_status on public.customer (project_id, status);
create index idx_customer_project_assignee
  on public.customer (project_id, assigned_counselor_id);

create table public.consultation (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project (id) on delete restrict,
  customer_id uuid not null,
  counselor_id uuid not null,
  consulted_at timestamptz not null,
  content text not null check (content <> ''),
  content_version integer not null default 1 check (content_version >= 1),
  next_action_at timestamptz,
  grade_after public.customer_grade,
  created_by uuid not null,
  ai_analysis_status public.consultation_ai_status not null default 'PENDING',
  ai_analyzed_content_version integer,
  ai_density_level public.consultation_density_level,
  ai_confidence numeric(3, 2) check (ai_confidence between 0 and 1),
  ai_evidence_summary text,
  ai_analyzed_at timestamptz,
  ai_prompt_version varchar(20),
  ai_retry_count smallint not null default 0 check (ai_retry_count >= 0),
  ai_last_attempted_at timestamptz,
  ai_failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, project_id),
  foreign key (customer_id, project_id)
    references public.customer (id, project_id)
    on delete restrict,
  foreign key (counselor_id, project_id)
    references public.project_member (id, project_id)
    on delete restrict,
  foreign key (created_by, project_id)
    references public.project_member (id, project_id)
    on delete restrict,
  check (
    (
      ai_analysis_status = 'PENDING'
      and ai_density_level is null
      and ai_confidence is null
      and ai_analyzed_at is null
    )
    or (
      ai_analysis_status = 'COMPLETED'
      and ai_density_level is not null
      and ai_confidence is not null
      and ai_analyzed_at is not null
    )
    or (
      ai_analysis_status = 'LOW_CONFIDENCE'
      and ai_confidence is not null
      and ai_confidence < 0.7
      and ai_analyzed_at is not null
    )
    or (
      ai_analysis_status = 'FAILED'
      and ai_density_level is null
      and ai_analyzed_at is null
    )
  )
);

create index idx_consultation_customer_time
  on public.consultation (customer_id, consulted_at desc);
create index idx_consultation_ai_status
  on public.consultation (ai_analysis_status);
create index idx_consultation_project_customer_time
  on public.consultation (project_id, customer_id, consulted_at desc);

create table public.customer_status_log (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project (id) on delete restrict,
  customer_id uuid not null,
  consultation_id uuid,
  grade_before public.customer_grade,
  grade_after public.customer_grade not null,
  suggested_grade_at_time public.customer_grade,
  reason text,
  changed_by uuid not null,
  changed_at timestamptz not null default now(),
  foreign key (customer_id, project_id)
    references public.customer (id, project_id)
    on delete restrict,
  foreign key (consultation_id, project_id)
    references public.consultation (id, project_id)
    on delete restrict,
  foreign key (changed_by, project_id)
    references public.project_member (id, project_id)
    on delete restrict
);

create index idx_status_log_customer_time
  on public.customer_status_log (customer_id, changed_at desc);
create index idx_status_log_project_customer_time
  on public.customer_status_log (project_id, customer_id, changed_at desc);

create trigger set_updated_at
  before update on public.organization
  for each row
  execute function private.set_updated_at();

create trigger set_updated_at
  before update on public.project
  for each row
  execute function private.set_updated_at();

create trigger set_updated_at
  before update on public.project_member
  for each row
  execute function private.set_updated_at();

create trigger set_updated_at
  before update on public.customer
  for each row
  execute function private.set_updated_at();

create trigger set_updated_at
  before update on public.consultation
  for each row
  execute function private.set_updated_at();
