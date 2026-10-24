-- [A14 적용 전] 문제세대 적색 표기·입주 잠금 — 대상 DB 상태 확인. 읽기 전용(단일 SELECT), 집계값만. 실행해도 아무것도 바뀌지 않는다.
-- 실행: 대상 프로젝트(대시보드 URL의 ref를 먼저 확인)의 SQL Editor에 전체를 붙여 넣고 Run.
-- OVERALL = READY → A14 적용 가능(A14 자체 사전 점검이 같은 조건을 다시 확인). ALREADY → 이미 적용됨(적용하지 않음). STOP → 적용하지 않고 결과표 회신.
with f as (
  select
    (select count(*) from information_schema.columns
      where table_schema = 'public' and table_name = 'unit_occupancy_status'
        and column_name in ('problem_flags', 'problem_lock_released', 'problem_note', 'problem_updated_by', 'problem_updated_at')) as problem_cols,
    (select count(*) from information_schema.columns
      where table_schema = 'public' and table_name = 'unit_occupancy_status'
        and column_name in ('trade_funding_type', 'trade_funding_status', 'trade_funding_updated_by', 'trade_funding_updated_at')) as a11_cols,
    (select pg_get_constraintdef(oid) from pg_constraint
      where conrelid = 'public.contract_status_history'::regclass and conname = 'contract_status_history_field_changed_check') as history_def,
    to_regprocedure('public.set_move_in_problem_household(uuid,uuid,uuid,uuid,text[],boolean,text,text)') is not null as rpc_exists,
    to_regprocedure('private.write_rpc_actor(uuid)') is not null
      and to_regprocedure('private.require_project_admin(uuid,uuid)') is not null as helpers_exist
),
c as (
  select 1 as ord, 'A11 자금조달 분류 칸 4개' as item, a11_cols::text as value, '4' as expected from f
  union all select 2, '필수 함수(write_rpc_actor·require_project_admin)', helpers_exist::text, 'true' from f
  union all select 3, '이력 값 CHECK = A11 정의(7개, problem 없음)',
    case when history_def is null then '없음'
         when position('problem_flags' in history_def) > 0 then 'A14 적용됨'
         when position('trade_funding_status' in history_def) > 0
              and (select count(*) from regexp_matches(history_def, '::character varying', 'g')) = 7 then 'A11 정의'
         else '알 수 없는 정의' end, 'A11 정의' from f
  union all select 4, '문제세대 칸(0이어야 적용 가능)', problem_cols::text, '0' from f
  union all select 5, '문제세대 저장 RPC 존재', rpc_exists::text, 'false' from f
),
overall as (
  select 6 as ord, 'OVERALL' as item,
    case when (select bool_and(value = expected) from c) then 'READY'
         when (select value from c where ord = 4) = '5' and (select value from c where ord = 5) = 'true'
              and (select value from c where ord = 3) = 'A14 적용됨' then 'ALREADY'
         else 'STOP' end as value, 'READY' as expected
),
info as (
  select 7 as ord, 'INFO 대상 식별: 프로젝트 수 / 고객 수 / Stay J 프로젝트 존재' as item,
    (select count(*) from public.project)::text || ' / ' || (select count(*) from public.customer)::text || ' / '
      || exists (select 1 from public.project where id = '1283e198-5043-4027-96d6-edcc7a6686c6')::text as value, 'INFO' as expected
)
select item, value, expected,
  case when expected = 'INFO' then 'INFO' when item = 'OVERALL' then value when value = expected then 'PASS' else 'FAIL' end as verdict
from (select * from c union all select * from overall union all select * from info) x
order by ord;
