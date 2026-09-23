-- CLIENT_MANAGER 역할에 화양 현장운영(PROJECT_ADMIN과 거의 동일한 SELECT 범위)을 연다.
-- 계약 생성/해지/명의변경/고객 마스터 수정/원장 import RPC는 이 파일에서 손대지 않는다
-- (private.require_project_admin, private.require_customer_write_access는 그대로 유지).

-- 1) 공통 backstop에 CLIENT_MANAGER를 추가한다. 실제 노출 범위는 각 정책이 넘기는
--    p_allowed_roles 배열이 결정하므로, 이 자체로는 아무 테이블도 넓어지지 않는다.
create or replace function private.current_project_member_id(
  p_project_id uuid,
  p_allowed_roles public.project_member_role[]
)
returns uuid language sql stable security definer set search_path = '' as $$
  select pm.id
  from public.project_member as pm
  inner join public.project as p on p.id = pm.project_id
  inner join public.organization as o on o.id = p.organization_id
  where pm.project_id = p_project_id
    and pm.user_id = auth.uid()
    and pm.active = true
    and p.status = 'ACTIVE'::public.project_status
    and o.status = 'ACTIVE'::public.organization_status
    and pm.role = any (p_allowed_roles)
    and pm.role in (
      'COUNSELOR'::public.project_member_role,
      'PROJECT_ADMIN'::public.project_member_role,
      'CLIENT_MANAGER'::public.project_member_role
    )
  limit 1;
$$;

-- 2) 쓰기 RPC 공통 진입점. 계약/명의변경 RPC는 이 위에 private.require_project_admin을
--    별도로 호출하므로 여기서 CLIENT_MANAGER를 더해도 계약 admin 전용 게이트는 그대로 막힌다.
create or replace function private.write_rpc_actor(p_project_id uuid)
returns uuid language plpgsql stable security definer set search_path = ''
as $$
declare v_member_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  v_member_id := private.current_project_member_id(
    p_project_id,
    array[
      'COUNSELOR'::public.project_member_role,
      'PROJECT_ADMIN'::public.project_member_role,
      'CLIENT_MANAGER'::public.project_member_role
    ]
  );
  if v_member_id is null then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return v_member_id;
end;
$$;

-- 3) 화양 현장 공동판정 helper. customer/consultation/unit_deal SELECT, 상담 등록,
--    입주현황 갱신, 보고서/중개업소 RPC의 화양 우회 분기가 모두 이 함수 하나로 CLIENT_MANAGER까지 넓어진다.
create or replace function private.is_hwayang_field_member(p_project_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_project_id = '1283e198-5043-4027-96d6-edcc7a6686c6'::uuid
    and private.current_project_member_id(p_project_id,
      array['COUNSELOR','PROJECT_ADMIN','CLIENT_MANAGER']::public.project_member_role[]) is not null;
$$;

-- 4) 상담사 배정/현장 인력 표시이름 전용 게이트. private.require_project_admin은
--    계약/명의변경/원장 import 등 admin 전용 RPC에서 계속 쓰이므로 절대 수정하지 않는다.
create or replace function private.require_field_manage_access(
  p_project_id uuid,
  p_member_id uuid
) returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.has_project_role(
    p_project_id,
    array['PROJECT_ADMIN', 'CLIENT_MANAGER']::public.project_member_role[]
  ) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_member_id is null then
    raise exception 'not authorized' using errcode = '42501';
  end if;
end;
$$;
revoke all on function private.require_field_manage_access(uuid, uuid) from public, anon, authenticated;

-- 5) 로그인 직후 접근 확인(requireMoveInAccess)에 필요한 조회 범위만 넓힌다.
--    project_member는 본인 row(COUNSELOR)는 그대로 두고, 관리형 role 쪽에 CLIENT_MANAGER를 더한다.
--    project_member에는 INSERT/UPDATE/DELETE 정책이 없으므로(권한 변경은 이 화면 밖에서만 가능)
--    SELECT를 넓혀도 멤버십/역할 관리 권한이 생기지 않는다.
drop policy organization_select on public.organization;
create policy organization_select on public.organization for select using (
  exists (
    select 1 from public.project as p where p.organization_id = organization.id
      and private.has_project_role(
        p.id,
        array['COUNSELOR', 'PROJECT_ADMIN', 'CLIENT_MANAGER']::public.project_member_role[]
      )
  )
);

drop policy project_select on public.project;
create policy project_select on public.project for select using (
  private.has_project_role(
    id,
    array['COUNSELOR', 'PROJECT_ADMIN', 'CLIENT_MANAGER']::public.project_member_role[]
  )
);

drop policy project_member_select on public.project_member;
create policy project_member_select on public.project_member for select using (
  id = private.current_project_member_id(project_id, array['COUNSELOR']::public.project_member_role[])
  or private.has_project_role(
    project_id,
    array['PROJECT_ADMIN', 'CLIENT_MANAGER']::public.project_member_role[]
  )
);

-- 6) 실제 이동입주 화면(동호수 관리/배치도, 매도임대관리, 시장동향, 보고서, 중개업소 관리)이
--    직접 읽는 테이블만 넓힌다. customer_unit_interest/subscription/contract_status_history/
--    report_template/cs_ticket/entry_pool/contact_schedule/funnel_event/community_notice는
--    현재 이동입주 UI가 사용하지 않으므로 건드리지 않는다.
drop policy project_unit_select on public.project_unit;
create policy project_unit_select
on public.project_unit
for select
to authenticated
using (
  private.has_project_role(
    project_id,
    array['COUNSELOR', 'PROJECT_ADMIN', 'CLIENT_MANAGER']::public.project_member_role[]
  )
);

drop policy contract_select on public.contract;
create policy contract_select
on public.contract
for select
to authenticated
using (
  private.has_project_role(
    project_id,
    array['COUNSELOR', 'PROJECT_ADMIN', 'CLIENT_MANAGER']::public.project_member_role[]
  )
);

drop policy unit_occupancy_status_select on public.unit_occupancy_status;
create policy unit_occupancy_status_select
on public.unit_occupancy_status
for select
to authenticated
using (
  private.has_project_role(
    project_id,
    array['COUNSELOR', 'PROJECT_ADMIN', 'CLIENT_MANAGER']::public.project_member_role[]
  )
);

drop policy market_data_select on public.market_data;
create policy market_data_select
on public.market_data
for select
to authenticated
using (
  private.has_project_role(
    project_id,
    array['COUNSELOR', 'PROJECT_ADMIN', 'CLIENT_MANAGER']::public.project_member_role[]
  )
);

drop policy report_select on public.report;
create policy report_select
on public.report
for select
to authenticated
using (
  private.has_project_role(
    project_id,
    array['COUNSELOR', 'PROJECT_ADMIN', 'CLIENT_MANAGER']::public.project_member_role[]
  )
);

drop policy brokerage_office_select on public.brokerage_office;
create policy brokerage_office_select
on public.brokerage_office
for select
to authenticated
using (
  private.has_project_role(
    project_id,
    array['COUNSELOR', 'PROJECT_ADMIN', 'CLIENT_MANAGER']::public.project_member_role[]
  )
);

drop policy brokerage_contact_select on public.brokerage_contact;
create policy brokerage_contact_select
on public.brokerage_contact
for select
to authenticated
using (
  private.has_project_role(
    project_id,
    array['COUNSELOR', 'PROJECT_ADMIN', 'CLIENT_MANAGER']::public.project_member_role[]
  )
);
