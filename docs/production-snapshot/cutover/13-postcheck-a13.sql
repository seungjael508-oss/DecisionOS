-- [A13 적용 후] 비밀번호 재설정 세션(amr=recovery) 업무 소속 제외 확인 — 읽기 전용(단일 SELECT), 집계값만
-- 실행: 대상 DB의 SQL Editor에 전체를 붙여 넣고 Run. 판정 8행이 모두 PASS → 적용 완료. FAIL·오류 → 결과표 회신
-- A13 = 20261020120000_recovery_session_membership_block (선행: A8). 적용 전 DB에서 실행하면 원문 md5 2행이 FAIL이다.
-- 실제 차단 동작(복구 세션 조회·저장 거부)은 이 SQL이 아니라 재설정 메일 E2E로 확인한다.
with f as (
  select p.proname, p.prosecdef, p.proconfig, p.oid, md5(replace(p.prosrc, chr(13), '')) as h
  from pg_proc p
  where p.oid in (to_regprocedure('private.current_project_member_id(uuid,public.project_member_role[])'),
                  to_regprocedure('private.current_project_memberships()'))
),
pol as (
  select qual from pg_policies
  where schemaname = 'public' and policyname in ('consultation_select', 'consultation_hwayang_field_select', 'customer_select',
    'customer_hwayang_field_select', 'project_unit_select', 'contract_select', 'unit_occupancy_status_select')
),
c as (
  select 'A13 대상 함수 2개 존재' as item, (select count(*) from f)::text as value, '2' as expected
  union all select 'A13 current_project_member_id 원문 = A13 정의',
    (select (h = '9018c4afd88ecc5a168b027d2239280a')::text from f where proname = 'current_project_member_id'), 'true'
  union all select 'A13 current_project_memberships 원문 = A13 정의',
    (select (h = '47770fc36dd40231401279fb8e5ff16f')::text from f where proname = 'current_project_memberships'), 'true'
  union all select 'A13 함수 2개: SECURITY DEFINER·search_path 빈 값 유지',
    (select count(*) from f where prosecdef and proconfig @> array['search_path=""'])::text, '2'
  union all select 'A13 함수 2개: authenticated 실행 가능 유지',
    (select count(*) from f where has_function_privilege('authenticated', oid, 'EXECUTE'))::text, '2'
  union all select 'A13 함수 2개: anon 실행 불가 유지',
    (select count(*) from f where not has_function_privilege('anon', oid, 'EXECUTE'))::text, '2'
  union all select 'A8 정책 7개 존재(A13은 정책을 바꾸지 않음)', (select count(*) from pol)::text, '7'
  union all select 'A8 정책 7개: 소속 목록 비교 유지',
    (select count(*) from pol where position('private.current_project_memberships()' in qual) > 0)::text, '7'
)
select item, value, expected, case when value = expected then 'PASS' else 'FAIL' end as verdict from c;
