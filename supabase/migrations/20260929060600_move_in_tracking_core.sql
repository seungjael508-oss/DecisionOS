-- Clean rebuild from the approved behavioral specification.
-- No policy rows or master-grade data are seeded in this migration.

alter table public.unit_occupancy_status
  add column if not exists legacy_grade text,
  add column if not exists legacy_grade_as_of timestamptz;

alter table public.unit_occupancy_status
  drop constraint if exists unit_occupancy_status_legacy_grade_check;

alter table public.unit_occupancy_status
  add constraint unit_occupancy_status_legacy_grade_check
  check (legacy_grade is null or legacy_grade in ('A', 'B', 'C', 'D', '부재', '상담거절'));

create table public.move_in_tracking_policy (
  policy_id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project(id) on delete restrict,
  reason_code text not null check (reason_code in ('D_GRADE_STALE', 'C_GRADE_STALE', 'ABSENCE_RETRY')),
  stale_after interval not null check (stale_after > interval '0 seconds'),
  active boolean not null default true,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, reason_code),
  foreign key (created_by, project_id)
    references public.project_member(id, project_id) on delete restrict
);

create table public.move_in_tracking_disposition (
  disposition_id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project(id) on delete restrict,
  unit_id uuid not null,
  contract_id uuid not null,
  tracking_date date not null,
  source_fingerprint text not null check (length(source_fingerprint) between 1 and 128),
  action text not null check (action in ('COMPLETE', 'SNOOZE')),
  snoozed_until timestamptz,
  note text,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, unit_id, tracking_date, source_fingerprint),
  foreign key (project_id, unit_id)
    references public.project_unit(project_id, unit_id) on delete restrict,
  foreign key (contract_id, project_id, unit_id)
    references public.contract(contract_id, project_id, unit_id) on delete restrict,
  foreign key (created_by, project_id)
    references public.project_member(id, project_id) on delete restrict,
  check (
    (action = 'COMPLETE' and snoozed_until is null)
    or (action = 'SNOOZE' and snoozed_until is not null)
  )
);

create table public.move_in_tracking_exclusion (
  exclusion_id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project(id) on delete restrict,
  unit_id uuid not null,
  contract_id uuid not null,
  active boolean not null default true,
  reason text not null check (length(btrim(reason)) between 1 and 500),
  approved_by uuid not null,
  approved_at timestamptz not null default now(),
  revoked_by uuid,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, unit_id, contract_id),
  foreign key (project_id, unit_id)
    references public.project_unit(project_id, unit_id) on delete restrict,
  foreign key (contract_id, project_id, unit_id)
    references public.contract(contract_id, project_id, unit_id) on delete restrict,
  foreign key (approved_by, project_id)
    references public.project_member(id, project_id) on delete restrict,
  foreign key (revoked_by, project_id)
    references public.project_member(id, project_id) on delete restrict,
  check ((active and revoked_at is null and revoked_by is null) or (not active and revoked_at is not null and revoked_by is not null))
);

create index idx_move_in_tracking_policy_active
  on public.move_in_tracking_policy(project_id, reason_code)
  where active;
create index idx_move_in_tracking_disposition_lookup
  on public.move_in_tracking_disposition(project_id, unit_id, tracking_date, source_fingerprint);
create index idx_move_in_tracking_disposition_snooze
  on public.move_in_tracking_disposition(project_id, snoozed_until)
  where action = 'SNOOZE';
create index idx_move_in_tracking_exclusion_active
  on public.move_in_tracking_exclusion(project_id, unit_id, contract_id)
  where active;

create trigger set_updated_at
  before update on public.move_in_tracking_policy
  for each row execute function private.set_updated_at();
create trigger set_updated_at
  before update on public.move_in_tracking_disposition
  for each row execute function private.set_updated_at();
create trigger set_updated_at
  before update on public.move_in_tracking_exclusion
  for each row execute function private.set_updated_at();

alter table public.move_in_tracking_policy enable row level security;
alter table public.move_in_tracking_disposition enable row level security;
alter table public.move_in_tracking_exclusion enable row level security;

revoke all on table public.move_in_tracking_policy from public, anon;
revoke all on table public.move_in_tracking_disposition from public, anon;
revoke all on table public.move_in_tracking_exclusion from public, anon;
revoke insert, update, delete on table public.move_in_tracking_policy from authenticated;
revoke insert, update, delete on table public.move_in_tracking_disposition from authenticated;
revoke insert, update, delete on table public.move_in_tracking_exclusion from authenticated;
grant select on table public.move_in_tracking_policy to authenticated;
grant select on table public.move_in_tracking_disposition to authenticated;
grant select on table public.move_in_tracking_exclusion to authenticated;

create policy move_in_tracking_policy_select
on public.move_in_tracking_policy
for select to authenticated
using (private.has_project_role(project_id, array['COUNSELOR', 'PROJECT_ADMIN', 'CLIENT_MANAGER']::public.project_member_role[]));

create policy move_in_tracking_disposition_select
on public.move_in_tracking_disposition
for select to authenticated
using (private.has_project_role(project_id, array['COUNSELOR', 'PROJECT_ADMIN', 'CLIENT_MANAGER']::public.project_member_role[]));

create policy move_in_tracking_exclusion_select
on public.move_in_tracking_exclusion
for select to authenticated
using (private.has_project_role(project_id, array['COUNSELOR', 'PROJECT_ADMIN', 'CLIENT_MANAGER']::public.project_member_role[]));

create function public.set_move_in_tracking_exclusion(
  p_project_id uuid,
  p_unit_id uuid,
  p_active boolean,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid;
  v_contract public.contract%rowtype;
  v_reason text;
  v_exclusion_id uuid;
begin
  v_member_id := private.write_rpc_actor(p_project_id);
  perform private.require_project_admin(p_project_id, v_member_id);

  select * into v_contract
  from public.contract c
  where c.project_id = p_project_id
    and c.unit_id = p_unit_id
    and c.contract_status = 'ACTIVE'::public.contract_status
  for update;

  if not found then
    raise exception 'active contract not found' using errcode = '23514';
  end if;

  v_reason := nullif(btrim(coalesce(p_reason, '')), '');
  if p_active and v_reason is null then
    raise exception 'exclusion reason is required' using errcode = '23514';
  end if;

  insert into public.move_in_tracking_exclusion (
    project_id, unit_id, contract_id, active, reason, approved_by, revoked_by, revoked_at
  ) values (
    p_project_id, p_unit_id, v_contract.contract_id, p_active,
    coalesce(v_reason, 'revoked'), v_member_id,
    case when p_active then null else v_member_id end,
    case when p_active then null else now() end
  )
  on conflict (project_id, unit_id, contract_id) do update
  set active = excluded.active,
      reason = case when excluded.active then excluded.reason else move_in_tracking_exclusion.reason end,
      approved_by = case when excluded.active then excluded.approved_by else move_in_tracking_exclusion.approved_by end,
      approved_at = case when excluded.active then now() else move_in_tracking_exclusion.approved_at end,
      revoked_by = case when excluded.active then null else excluded.revoked_by end,
      revoked_at = case when excluded.active then null else excluded.revoked_at end
  returning exclusion_id into v_exclusion_id;

  return v_exclusion_id;
end;
$$;

revoke all on function public.set_move_in_tracking_exclusion(uuid, uuid, boolean, text) from public, anon;
grant execute on function public.set_move_in_tracking_exclusion(uuid, uuid, boolean, text) to authenticated;
