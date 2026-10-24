-- [A14 적용 후] 문제세대 적색 표기·입주 잠금 — 적용 결과 확인. 읽기 전용(단일 SELECT), 집계값만.
-- 실행: A14 적용한 같은 프로젝트의 SQL Editor에 전체를 붙여 넣고 Run. OVERALL = PASS여야 앱 코드를 배포한다.
with c as (
  select 1 as ord, '문제세대 칸 5개' as item,
    (select count(*) from information_schema.columns
      where table_schema = 'public' and table_name = 'unit_occupancy_status'
        and column_name in ('problem_flags', 'problem_lock_released', 'problem_note', 'problem_updated_by', 'problem_updated_at'))::text as value, '5' as expected
  union all select 2, '저장 RPC 존재·authenticated 실행 권한',
    (to_regprocedure('public.set_move_in_problem_household(uuid,uuid,uuid,uuid,text[],boolean,text,text)') is not null
      and has_function_privilege('authenticated', 'public.set_move_in_problem_household(uuid,uuid,uuid,uuid,text[],boolean,text,text)', 'EXECUTE'))::text, 'true'
  union all select 3, 'anon 실행 권한 없음',
    has_function_privilege('anon', 'public.set_move_in_problem_household(uuid,uuid,uuid,uuid,text[],boolean,text,text)', 'EXECUTE')::text, 'false'
  union all select 4, '트리거 2개(입주 잠금·계약자 변경 초기화)',
    (select count(*) from pg_trigger where tgrelid = 'public.unit_occupancy_status'::regclass and not tgisinternal
      and tgname in ('enforce_problem_household_lock', 'reset_problem_household_on_contract_change'))::text, '2'
  union all select 5, '이력 값 CHECK에 problem_flags·problem_lock_released',
    (select position('problem_flags' in pg_get_constraintdef(oid)) > 0 and position('problem_lock_released' in pg_get_constraintdef(oid)) > 0
      from pg_constraint where conrelid = 'public.contract_status_history'::regclass
        and conname = 'contract_status_history_field_changed_check')::text, 'true'
  union all select 6, '기존 행 값 변경 없음(지정된 문제세대 0)',
    (select count(*) from public.unit_occupancy_status where cardinality(problem_flags) > 0 or problem_lock_released)::text, '0'
),
overall as (
  select 7 as ord, 'OVERALL' as item,
    case when (select bool_and(value = expected) from c) then 'PASS' else 'FAIL' end as value, 'PASS' as expected
)
select item, value, expected, case when value = expected then 'PASS' else 'FAIL' end as verdict
from (select * from c union all select * from overall) x
order by ord;
