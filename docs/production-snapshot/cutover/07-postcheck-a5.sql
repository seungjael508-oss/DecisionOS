-- [A5 적용 후] 장기 부재 조회 함수·권한 확인 — 읽기 전용(단일 SELECT), 집계값만
-- 모든 행 verdict = PASS 여야 승격한다. INFO는 참고값(판정 제외).
-- 실행: Supabase 운영 프로젝트 > SQL Editor > New query에 이 파일 전체를 붙여 넣고 Run(쓰기 문 없음, 데이터 변경 없음)
-- 판정: 결과 11행 = 판정 9행 + INFO 2행. 판정 9행이 모두 PASS → A5 적용 완료
--       FAIL이 하나라도 있음 → A5 미적용 또는 일부만 적용. 승격하지 말고 결과표를 그대로 회신
--       실행 오류(예: function does not exist, more than one row returned) → 승격하지 말고 오류 문구를 회신
-- 회신: item·value·verdict 열 그대로(고객 식별 정보 없음)
with f as (
  select p.oid, p.proname, p.pronargs, p.pronamespace::regnamespace::text as nsp, p.prosecdef, p.prolang::regclass,
         pg_get_functiondef(p.oid) as def
  from pg_proc p
  where (p.pronamespace = 'public'::regnamespace and p.proname in ('get_move_in_absence_candidates', 'create_move_in_consultation', 'get_move_in_today_queue'))
     or (p.pronamespace = 'private'::regnamespace and p.proname in ('move_in_absence_contact_type', 'move_in_absence_candidates_full_view'))
),
c as (
  select '보조 함수 2개 존재' as item,
         (select count(*) from f where nsp = 'private')::text as value, '2' as expected
  union all select '후보 함수: 빠른 경로 분기 포함',
         (select (position('move_in_absence_candidates_full_view' in def) > 0)::text from f where proname = 'get_move_in_absence_candidates'), 'true'
  union all select '후보 함수: SECURITY INVOKER 유지',
         (select (not prosecdef)::text from f where proname = 'get_move_in_absence_candidates'), 'true'
  union all select '빠른 경로 함수: SECURITY DEFINER + 권한 재확인',
         (select (prosecdef and position('is_hwayang_field_member' in def) > 0)::text from f where proname = 'move_in_absence_candidates_full_view'), 'true'
  union all select '상담 저장 RPC(17): 새 접촉 유형 규칙 적용',
         (select (position('move_in_absence_contact_type' in def) > 0 and position('v_absence_streak' in def) > 0)::text
          from f where nsp = 'public' and proname = 'create_move_in_consultation' and pronargs = 17), 'true'
  union all select '상담 저장 RPC(17) authenticated 실행 차단 유지',
         (select bool_or(has_function_privilege('authenticated', oid, 'EXECUTE'))::text from pg_proc where pronamespace = 'public'::regnamespace and proname = 'create_move_in_consultation' and pronargs = 17), 'false'
  union all select '상담 저장 RPC(18) authenticated 실행 허용 유지',
         (select bool_and(has_function_privilege('authenticated', oid, 'EXECUTE'))::text from pg_proc where pronamespace = 'public'::regnamespace and proname = 'create_move_in_consultation' and pronargs = 18), 'true'
  union all select '후보·보조·오늘 관리대상: authenticated 실행 가능',
         (select bool_and(has_function_privilege('authenticated', oid, 'EXECUTE'))::text from f where proname <> 'create_move_in_consultation'), 'true'
  union all select '후보·보조·오늘 관리대상·상담 저장: anon 실행 불가',
         (select (not bool_or(has_function_privilege('anon', oid, 'EXECUTE')))::text from f), 'true'
  union all select 'Stay J 연속 부재 3회+ 세대(참고: 13:09 진단 화면 기준 9, 이후 상담으로 달라질 수 있음)',
         (select count(*)::text from public.get_move_in_absence_candidates('1283e198-5043-4027-96d6-edcc7a6686c6')), 'INFO'
  union all select '장기 부재 자동 D 이력 건수(참고: A5는 데이터를 바꾸지 않음)',
         (select count(*)::text from public.contract_status_history where field_changed = 'legacy_grade' and reason = '장기 부재중(연속 3회)'), 'INFO'
)
select item, value, expected, case when expected = 'INFO' then 'INFO' when value = expected then 'PASS' else 'FAIL' end as verdict from c;
