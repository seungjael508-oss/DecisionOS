-- [A13 적용 전] 대상 DB 상태 확인 — 읽기 전용(단일 SELECT), 집계값만. 실행해도 아무것도 바뀌지 않는다.
-- 실행: 대상 프로젝트(대시보드 URL의 ref를 먼저 확인)의 SQL Editor에 전체를 붙여 넣고 Run.
-- OVERALL = READY → A13 적용 가능(A13 자체 사전 점검이 같은 조건을 다시 확인). ALREADY → 이미 적용됨(적용하지 않음). STOP → 적용하지 않고 결과표 회신.
-- 마지막 INFO 행은 대상 식별 보조용(운영 데이터가 있는 DB인지). 판정에 쓰지 않는다.
with f as (
  select
    (select md5(replace(prosrc, chr(13), '')) from pg_proc
      where oid = to_regprocedure('private.current_project_member_id(uuid,public.project_member_role[])')) as member_id_h,
    (select md5(replace(prosrc, chr(13), '')) from pg_proc
      where oid = to_regprocedure('private.current_project_memberships()')) as memberships_h,
    (select count(*) from pg_policies where schemaname = 'public'
      and policyname in ('consultation_select', 'consultation_hwayang_field_select', 'customer_select', 'customer_hwayang_field_select',
                         'project_unit_select', 'contract_select', 'unit_occupancy_status_select')
      and position('private.current_project_memberships()' in qual) > 0) as a8_policies
),
c as (
  select 1 as ord, 'A8 소속 목록 함수 존재' as item, (memberships_h is not null)::text as value, 'true' as expected from f
  union all select 2, 'A8 정책 7개: 소속 목록 비교', a8_policies::text, '7' from f
  union all select 3, 'current_project_member_id 원문',
    case when member_id_h is null then '없음' when member_id_h = 'c13d451391341afbc7857362c647c12a' then '운영 원문'
      when member_id_h = '9018c4afd88ecc5a168b027d2239280a' then 'A13 적용됨' else '알 수 없는 정의' end, '운영 원문' from f
  union all select 4, 'current_project_memberships 원문',
    case when memberships_h is null then '없음' when memberships_h = 'a365bc18d38dc104b039355fa0aa3133' then 'A8 정의'
      when memberships_h = '47770fc36dd40231401279fb8e5ff16f' then 'A13 적용됨' else '알 수 없는 정의' end, 'A8 정의' from f
),
overall as (
  select 5 as ord, 'OVERALL' as item,
    case when (select bool_and(value = expected) from c) then 'READY'
         when (select value from c where ord = 3) = 'A13 적용됨' and (select value from c where ord = 4) = 'A13 적용됨' then 'ALREADY'
         else 'STOP' end as value, 'READY' as expected
),
info as (
  select 6 as ord, 'INFO 대상 식별: 프로젝트 수 / 고객 수 / Stay J 프로젝트 존재' as item,
    (select count(*) from public.project)::text || ' / ' || (select count(*) from public.customer)::text || ' / '
      || exists (select 1 from public.project where id = '1283e198-5043-4027-96d6-edcc7a6686c6')::text as value, 'INFO' as expected
)
select item, value, expected,
  case when expected = 'INFO' then 'INFO' when item = 'OVERALL' then value when value = expected then 'PASS' else 'FAIL' end as verdict
from (select * from c union all select * from overall union all select * from info) x
order by ord;
