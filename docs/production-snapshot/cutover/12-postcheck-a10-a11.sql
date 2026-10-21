-- [A10·A11 적용 후] 함수·권한·컬럼·제약·트리거 적용 상태 확인 — 읽기 전용(단일 SELECT), 집계값만
-- 실행: Supabase SQL Editor에 전체를 붙여 넣고 Run. INFO를 뺀 판정이 모두 PASS → 적용 완료. FAIL·오류 → 결과표 회신
-- A10 = 20261020100000_counselor_grade_change, A11 = 20261020110000_trade_funding_type. 02-apply(초기 후보 저장) 전에 실행한다.
with c17 as (select oid, prosecdef, proconfig, pg_get_functiondef(oid) d from pg_proc
             where pronamespace = 'public'::regnamespace and proname = 'create_move_in_consultation' and pronargs = 17),
c18 as (select oid from pg_proc where pronamespace = 'public'::regnamespace and proname = 'create_move_in_consultation' and pronargs = 18),
setf as (select oid, prosecdef, proconfig from pg_proc
         where oid = to_regprocedure('public.set_move_in_trade_funding(uuid,uuid,uuid,uuid,text,text,text)')),
rstf as (select oid, prosecdef, proconfig from pg_proc where oid = to_regprocedure('private.reset_trade_funding_on_contract_change()')),
cols as (select column_name, data_type, is_nullable from information_schema.columns
         where table_schema = 'public' and table_name = 'unit_occupancy_status' and column_name like 'trade_funding%'),
chk as (select pg_get_constraintdef(oid) d from pg_constraint
        where conrelid = 'public.contract_status_history'::regclass and conname = 'contract_status_history_field_changed_check'),
trg as (select tgenabled, pg_get_triggerdef(oid) d from pg_trigger
        where tgrelid = 'public.unit_occupancy_status'::regclass and tgname = 'reset_trade_funding_on_contract_change' and not tgisinternal),
c as (
  -- A10
  select 'A10 상담 저장(17): 상담사 D 전환·수동 등급 이력 반영' as item,
    (select (position('v_member_role' in d) > 0 and position('''COUNSELOR''::public.project_member_role' in d) > 0
             and position('수동 변경(상담 저장)' in d) > 0)::text from c17) as value, 'true' as expected
  union all select 'A10 상담 저장(17): A5 부재 규칙 유지',
    (select (position('move_in_absence_contact_type' in d) > 0 and position('v_absence_streak' in d) > 0)::text from c17), 'true'
  union all select 'A10 상담 저장(17): SECURITY DEFINER·search_path 빈 값 유지',
    (select (prosecdef and proconfig @> array['search_path=""'])::text from c17), 'true'
  union all select 'A10 상담 저장(17): authenticated 직접 실행 불가 유지(A5와 같음)',
    (select has_function_privilege('authenticated', oid, 'EXECUTE')::text from c17), 'false'
  union all select 'A10 상담 저장(18): authenticated 실행 가능 유지',
    (select has_function_privilege('authenticated', oid, 'EXECUTE')::text from c18), 'true'
  union all select 'A10 상담 저장(17·18): anon 실행 불가',
    (select (not bool_or(has_function_privilege('anon', oid, 'EXECUTE')))::text from (select oid from c17 union all select oid from c18) f), 'true'
  -- A11 컬럼·제약
  union all select 'A11 자금유형 칸 4개(text·text·uuid·timestamptz, NULL 허용)',
    (select count(*)::text from cols where is_nullable = 'YES' and (column_name, data_type) in (
       ('trade_funding_type', 'text'), ('trade_funding_status', 'text'), ('trade_funding_updated_by', 'uuid'),
       ('trade_funding_updated_at', 'timestamp with time zone'))), '4'
  union all select 'A11 자금유형 제약 3개(유형·상태 CHECK, 수정자 FK)',
    (select count(*)::text from pg_constraint where conrelid = 'public.unit_occupancy_status'::regclass and conname in (
       'unit_occupancy_status_trade_funding_type_check', 'unit_occupancy_status_trade_funding_status_check',
       'unit_occupancy_status_trade_funding_updated_by_fkey') and convalidated), '3'
  union all select 'A11 이력 값 CHECK: 기존 5개 + trade_funding 2개 = 7개',
    (select ((select count(*) from regexp_matches(d, '::character varying', 'g')) = 7
             and position('''legacy_grade''' in d) > 0 and position('''trade_funding_type''' in d) > 0
             and position('''trade_funding_status''' in d) > 0)::text from chk), 'true'
  -- A11 트리거
  union all select 'A11 계약자 변경 시 분류 비움 트리거: BEFORE UPDATE OF contract_id·활성',
    (select (tgenabled = 'O' and position('BEFORE UPDATE OF contract_id' in d) > 0
             and position('private.reset_trade_funding_on_contract_change()' in d) > 0)::text from trg), 'true'
  union all select 'A11 트리거 함수: SECURITY INVOKER·search_path 빈 값',
    (select (not prosecdef and proconfig @> array['search_path=""'])::text from rstf), 'true'
  union all select 'A11 트리거 함수: authenticated·anon 직접 실행 불가',
    (select (not has_function_privilege('authenticated', oid, 'EXECUTE') and not has_function_privilege('anon', oid, 'EXECUTE'))::text from rstf), 'true'
  -- A11 저장 RPC
  union all select 'A11 자금유형 저장 RPC: SECURITY DEFINER·search_path 빈 값',
    (select (prosecdef and proconfig @> array['search_path=""'])::text from setf), 'true'
  union all select 'A11 자금유형 저장 RPC: authenticated 실행 가능',
    (select has_function_privilege('authenticated', oid, 'EXECUTE')::text from setf), 'true'
  union all select 'A11 자금유형 저장 RPC: anon 실행 불가',
    (select (not has_function_privilege('anon', oid, 'EXECUTE'))::text from setf), 'true'
  -- 데이터 무변경(02-apply 전)
  union all select '기존 행 자금유형 값 없음(02-apply 전)',
    (select count(*)::text from public.unit_occupancy_status where trade_funding_type is not null or trade_funding_status is not null), '0'
  union all select '자금유형 변경 이력 없음(02-apply 전)',
    (select count(*)::text from public.contract_status_history where field_changed in ('trade_funding_type', 'trade_funding_status')), '0'
  -- 참고: A11은 테이블 쓰기 권한을 바꾸지 않는다(적용 전 값과 같아야 함)
  union all select '참고: authenticated의 unit_occupancy_status INSERT/UPDATE 권한',
    has_table_privilege('authenticated', 'public.unit_occupancy_status', 'INSERT')::text || '/'
      || has_table_privilege('authenticated', 'public.unit_occupancy_status', 'UPDATE')::text, 'INFO'
)
select item, coalesce(value, '없음') as value, expected,
  case when expected = 'INFO' then 'INFO' when value = expected then 'PASS' else 'FAIL' end as verdict
from c;
