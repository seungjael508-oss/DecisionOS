-- 운영 스키마 축소 스텁(검증 전용). 마이그레이션이 참조하는 객체만 최소 정의.
create role anon nologin;
create role authenticated nologin;
create schema auth;
create schema private;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

create type public.contract_status as enum ('ACTIVE','CANCELLED','COMPLETED');
create type public.occupancy_intent as enum ('SELF_MOVE_IN','SALE','JEONSE','MONTHLY_RENT','UNDECIDED');
create type public.funding_status as enum ('NORMAL','LOAN_NEEDED','FUNDING_SHORTAGE','EXISTING_HOME_UNSOLD','UNKNOWN');
create type public.move_in_status as enum ('NOT_CONTACTED','CONTACTED','PLANNED','DELAYED','BALANCE_PAID','MOVED_IN');
create type public.operational_intent as enum ('MOVE_IN','CONSIDERING_MOVE_IN','SALE_TRANSFER','RENT','TERMINATION','ABANDONMENT','UNDECIDED');
create type public.contact_schedule_status as enum ('PENDING','SENT','FAILED','SKIPPED');
create type public.project_member_role as enum ('COUNSELOR','TEAM_LEAD','PROJECT_ADMIN','CLIENT_MANAGER');

create table public.project (id uuid primary key, name text not null);
create table public.project_member (
  id uuid primary key, project_id uuid not null references public.project(id), user_id uuid not null,
  role public.project_member_role not null, active boolean not null default true);
create table public.project_unit (
  unit_id uuid primary key, project_id uuid not null, building_no text, unit_no text, unique (project_id, unit_id));
create table public.customer (id uuid primary key, project_id uuid not null, name text, assigned_counselor_id uuid);
create table public.contract (
  contract_id uuid primary key default gen_random_uuid(), project_id uuid not null, unit_id uuid not null,
  customer_id uuid not null, contract_status public.contract_status not null default 'ACTIVE',
  unique (contract_id, project_id, unit_id));
create unique index contract_one_active on public.contract(project_id, unit_id) where contract_status = 'ACTIVE';
create table public.unit_occupancy_status (
  occupancy_status_id uuid primary key default gen_random_uuid(),
  project_id uuid not null, unit_id uuid not null, contract_id uuid not null,
  legacy_grade text, legacy_grade_as_of timestamptz,
  occupancy_intent public.occupancy_intent not null default 'UNDECIDED',
  funding_status public.funding_status not null default 'UNKNOWN',
  move_in_status public.move_in_status not null default 'NOT_CONTACTED',
  operational_intent public.operational_intent, operational_intent_as_of timestamptz,
  planned_move_in_date date, balance_paid_at timestamptz, actual_move_in_date timestamptz,
  last_contact_at timestamptz, next_contact_at timestamptz, updated_by uuid,
  unique (project_id, unit_id));
create table public.consultation (
  id uuid primary key default gen_random_uuid(), project_id uuid not null, customer_id uuid not null,
  counselor_id uuid not null, consulted_at timestamptz not null, content text not null, created_by uuid not null,
  unit_id uuid, contact_type text, stage text, purpose text, structured_tags jsonb, next_action_at timestamptz,
  channel text);
create table public.contact_schedule (
  id uuid primary key default gen_random_uuid(), project_id uuid not null, customer_id uuid, contract_id uuid,
  unit_id uuid, contact_type text, planned_at timestamptz, status public.contact_schedule_status,
  actual_sent_at timestamptz, result_consultation_id uuid, created_by uuid);
create table public.contract_status_history (
  history_id uuid primary key default gen_random_uuid(), project_id uuid not null, contract_id uuid not null,
  unit_id uuid not null, field_changed character varying not null, previous_value text, new_value text, reason text,
  contact_id uuid, changed_by uuid not null, changed_at timestamptz not null default now(),
  constraint contract_status_history_field_changed_check
    check (field_changed in ('occupancy_intent', 'funding_status', 'move_in_status', 'operational_intent')));
create table public.move_in_tracking_exclusion (
  project_id uuid, unit_id uuid, contract_id uuid, active boolean);
create table public.move_in_tracking_policy (
  project_id uuid, reason_code text, stale_after interval, active boolean not null default true, created_by uuid);
create table public.move_in_tracking_disposition (
  disposition_id uuid primary key default gen_random_uuid(), project_id uuid, unit_id uuid, contract_id uuid,
  tracking_date date, source_fingerprint text, action text, snoozed_until timestamptz);

-- 프로젝트 멤버만 자기 프로젝트 점유상태를 본다(운영 RLS 축약)
alter table public.unit_occupancy_status enable row level security;
create policy uos_member on public.unit_occupancy_status for select to authenticated using (
  exists (select 1 from public.project_member m where m.project_id = unit_occupancy_status.project_id
    and m.user_id = auth.uid() and m.active));
grant usage on schema public, auth to authenticated;
grant select on all tables in schema public to authenticated;
grant execute on function auth.uid() to authenticated;

create function private.write_rpc_actor(p_project_id uuid) returns uuid language plpgsql security definer set search_path to '' as $$
declare v uuid; begin
  select m.id into v from public.project_member m where m.project_id = p_project_id and m.user_id = auth.uid() and m.active;
  if v is null then raise exception 'not a project member' using errcode = '42501'; end if;
  return v; end $$;
-- 운영 정의와 같은 2인자(p_project_id, p_member_id): 역할은 auth.uid() 기준으로 확인하고 member_id 누락은 거부
create function private.require_project_admin(p_project_id uuid, p_member_id uuid) returns void language plpgsql security definer set search_path to '' as $$
begin
  if not exists (select 1 from public.project_member m where m.project_id = p_project_id and m.user_id = auth.uid()
     and m.active and m.role = 'PROJECT_ADMIN') then
    raise exception 'not authorized' using errcode = '42501'; end if;
  if p_member_id is null then
    raise exception 'not authorized' using errcode = '42501'; end if; end $$;
create function private.require_field_customer_write_access(p_project_id uuid, p_customer_id uuid, p_member_id uuid) returns void
language plpgsql security definer set search_path to '' as $$
begin
  if not exists (select 1 from public.customer c where c.id = p_customer_id and c.project_id = p_project_id) then
    raise exception 'customer not in project' using errcode = '42501'; end if;
  if exists (select 1 from public.project_member m where m.id = p_member_id and m.role = 'COUNSELOR')
     and not exists (select 1 from public.customer c where c.id = p_customer_id and c.assigned_counselor_id = p_member_id) then
    raise exception 'customer not assigned' using errcode = '42501'; end if; end $$;
create function public.update_unit_occupancy_status(
  p_project_id uuid, p_unit_id uuid, p_contract_id uuid, p_occupancy_intent public.occupancy_intent default null,
  p_funding_status public.funding_status default null, p_move_in_status public.move_in_status default null,
  p_planned_move_in_date date default null, p_balance_paid_at timestamptz default null,
  p_actual_move_in_date timestamptz default null, p_last_contact_at timestamptz default null,
  p_next_contact_at timestamptz default null, p_clear_next_contact_at boolean default false,
  p_contact_id uuid default null, p_reason text default null) returns void
language plpgsql security definer set search_path to '' as $$
begin
  update public.unit_occupancy_status set
    occupancy_intent = coalesce(p_occupancy_intent, occupancy_intent),
    funding_status = coalesce(p_funding_status, funding_status),
    move_in_status = coalesce(p_move_in_status, move_in_status),
    last_contact_at = coalesce(p_last_contact_at, last_contact_at),
    next_contact_at = case when p_clear_next_contact_at then null else coalesce(p_next_contact_at, next_contact_at) end
  where project_id = p_project_id and unit_id = p_unit_id and contract_id = p_contract_id; end $$;
