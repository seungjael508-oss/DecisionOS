-- 조회 RLS 반복 평가 제거 (Production 미적용, 별도 승인 필요)
-- 원인(2026-10-19 운영 EXPLAIN, 상담사 권한): SELECT 정책의 private.has_project_role / current_project_member_id /
--   is_hwayang_field_member(SECURITY DEFINER, 인라인 불가)가 행마다 project_member·project·organization을 다시 조회
--   → consultation 3,758행 2,631ms, customer 851행 508ms, project_unit·contract·unit_occupancy_status 851행 각 229~247ms,
--     이 테이블들을 읽는 오늘 관리대상 RPC 6,505ms. 비용이 측정된 이 5개 테이블의 SELECT 정책 7개만 바꾼다.
-- 수정: 같은 조건의 "현재 사용자 소속 목록"을 private.current_project_memberships()로 쿼리당 한 번 구하고,
--   대상 SELECT 정책 7개의 조건을 그 목록과의 비교로 바꾼다. 정책 이름·역할(authenticated)·PERMISSIVE·명령은 그대로(ALTER POLICY).
-- 권한 의미는 같다: project_member(project_id, user_id) UNIQUE → 프로젝트당 멤버 행 최대 1개이므로
--   has_project_role(p, R) ⇔ p ∈ {소속 중 역할 ∈ R}, assigned = current_project_member_id(p, COUNSELOR) ⇔ (p, assigned) ∈ {COUNSELOR 소속},
--   is_hwayang_field_member(p) ⇔ p = Stay J ∧ p ∈ {소속}.
-- 쓰기 정책·기존 함수·데이터는 바꾸지 않는다. 오늘 관리대상 판정 결과도 같으므로 처리 기록 조건은 없다.
begin;

do $preflight$
declare
  v_bad text;
begin
  -- 대상 정책 7개의 현재 조건이 운영 원문(2026-10-19 스키마 조립본)와 같아야 한다(다르면 아무것도 바꾸지 않고 중단)
  select string_agg(e.p, ', ') into v_bad
  from (values
    ('consultation','consultation_select','97f1afebb2e0fbc890d2368599ed7e32'),
    ('consultation','consultation_hwayang_field_select','f90a996e56a603f143c7bc1cd7dcb0fc'),
    ('customer','customer_select','eee1cd16ef996d69c6dd16d355bc8fed'),
    ('customer','customer_hwayang_field_select','f90a996e56a603f143c7bc1cd7dcb0fc'),
    ('project_unit','project_unit_select','746b577660adce06f39bb2e6cdcb1231'),
    ('contract','contract_select','746b577660adce06f39bb2e6cdcb1231'),
    ('unit_occupancy_status','unit_occupancy_status_select','746b577660adce06f39bb2e6cdcb1231')
  ) as e(t, p, h)
  left join pg_policies pp on pp.schemaname = 'public' and pp.tablename = e.t and pp.policyname = e.p
  where pp.policyname is null
     or pp.cmd <> 'SELECT' or pp.permissive <> 'PERMISSIVE' or pp.roles::text <> '{authenticated}' or pp.with_check is not null
     or md5(pp.qual) <> e.h;
  if v_bad is not null then
    raise exception 'policy definition is not the expected original state: %; abort', v_bad;
  end if;
  if to_regprocedure('private.current_project_memberships()') is not null then
    raise exception 'private.current_project_memberships already exists; abort';
  end if;
  -- 소속 판정 조건을 복사하므로 원본 함수가 기대한 정의인지 확인
  if (select md5(prosrc) from pg_proc where oid = 'private.current_project_member_id(uuid,public.project_member_role[])'::regprocedure)
     is distinct from 'c13d451391341afbc7857362c647c12a' then
    raise exception 'private.current_project_member_id is not the expected definition; abort';
  end if;
  perform set_config('lock_timeout', '5s', true);
end
$preflight$;

-- private.current_project_member_id와 같은 조건(프로젝트·역할 인자만 없음). 결과는 현재 사용자 자신의 소속뿐이다.
create function private.current_project_memberships()
returns table(project_id uuid, member_id uuid, role public.project_member_role)
language sql
stable
security definer
set search_path to ''
as $function$
  select pm.project_id, pm.id, pm.role
  from public.project_member as pm
  inner join public.project as p on p.id = pm.project_id
  inner join public.organization as o on o.id = p.organization_id
  where pm.user_id = auth.uid()
    and pm.active = true
    and p.status = 'ACTIVE'::public.project_status
    and o.status = 'ACTIVE'::public.organization_status
    and pm.role in (
      'COUNSELOR'::public.project_member_role,
      'PROJECT_ADMIN'::public.project_member_role,
      'CLIENT_MANAGER'::public.project_member_role
    );
$function$;
revoke all on function private.current_project_memberships() from public, anon, authenticated, service_role;
grant execute on function private.current_project_memberships() to authenticated;

alter policy consultation_select on public.consultation using (((project_id in (select m.project_id from private.current_project_memberships() m where m.role = any (array['PROJECT_ADMIN']::public.project_member_role[]))) or (exists (select 1 from public.customer c where c.id = consultation.customer_id and c.project_id = consultation.project_id and ((consultation.project_id, c.assigned_counselor_id) in (select m.project_id, m.member_id from private.current_project_memberships() m where m.role = 'COUNSELOR'::public.project_member_role))))));
alter policy consultation_hwayang_field_select on public.consultation using (((project_id = '1283e198-5043-4027-96d6-edcc7a6686c6'::uuid) and (project_id in (select m.project_id from private.current_project_memberships() m))));
alter policy customer_select on public.customer using ((((project_id, assigned_counselor_id) in (select m.project_id, m.member_id from private.current_project_memberships() m where m.role = 'COUNSELOR'::public.project_member_role)) or (project_id in (select m.project_id from private.current_project_memberships() m where m.role = any (array['PROJECT_ADMIN']::public.project_member_role[])))));
alter policy customer_hwayang_field_select on public.customer using (((project_id = '1283e198-5043-4027-96d6-edcc7a6686c6'::uuid) and (project_id in (select m.project_id from private.current_project_memberships() m))));
alter policy project_unit_select on public.project_unit using ((project_id in (select m.project_id from private.current_project_memberships() m where m.role = any (array['COUNSELOR', 'PROJECT_ADMIN', 'CLIENT_MANAGER']::public.project_member_role[]))));
alter policy contract_select on public.contract using ((project_id in (select m.project_id from private.current_project_memberships() m where m.role = any (array['COUNSELOR', 'PROJECT_ADMIN', 'CLIENT_MANAGER']::public.project_member_role[]))));
alter policy unit_occupancy_status_select on public.unit_occupancy_status using ((project_id in (select m.project_id from private.current_project_memberships() m where m.role = any (array['COUNSELOR', 'PROJECT_ADMIN', 'CLIENT_MANAGER']::public.project_member_role[]))));

commit;
