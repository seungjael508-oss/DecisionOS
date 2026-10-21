-- [A6 적용 후] 오늘 관리대상 업무 처리(완료·다음 관리일·다음 방문일) 함수·권한 확인 — 읽기 전용(단일 SELECT), 집계값만
-- 모든 행 verdict = PASS 여야 승격한다. INFO는 참고값(판정 제외).
-- 실행: Supabase 운영 프로젝트 > SQL Editor > New query에 이 파일 전체를 붙여 넣고 Run(쓰기 문 없음, 데이터 변경 없음)
-- 판정: 결과 15행 = 판정 13행 + INFO 2행. 판정 13행이 모두 PASS → A6(문자 판정 수정본, 2026-10-19) 적용 완료
--       FAIL이 하나라도 있음 → A6 미적용 또는 일부만 적용. 승격하지 말고 결과표를 그대로 회신
--       실행 오류 → 승격하지 말고 오류 문구를 회신
-- 회신: item·value·verdict 열 그대로(고객 식별 정보 없음)
with f as (
  select p.oid, p.proname, p.pronargs, p.pronamespace::regnamespace::text as nsp, p.prosecdef,
         pg_get_functiondef(p.oid) as def
  from pg_proc p
  where (p.pronamespace = 'public'::regnamespace and p.proname in ('get_move_in_today_queue', 'complete_or_snooze_move_in_tracking', 'record_move_in_visit_result'))
     or (p.pronamespace = 'private'::regnamespace and p.proname in ('move_in_today_queue', 'move_in_absence_candidates_for_unit'))
),
c as (
  select '보조 함수 2개 존재(세대 지정 오늘 관리대상·부재 횟수)' as item,
         (select count(*) from f where nsp = 'private')::text as value, '2' as expected
  union all select '보조 함수 2개: 호출자 권한(SECURITY INVOKER)',
         (select (count(*) = 2 and not bool_or(prosecdef))::text from f where nsp = 'private'), 'true'
  union all select '세대 지정 오늘 관리대상: 다음 관리일 도래 사유 포함',
         (select (position('NEXT_CONTACT_DUE' in def) > 0)::text from f where nsp = 'private' and proname = 'move_in_today_queue'), 'true'
  union all select '세대 지정 오늘 관리대상: 문자는 실제 접촉 아님(수정본)',
         (select (position('latest_message_at' in def) > 0 and position('move_in_absence_contact_type' in def) > 0)::text from f where nsp = 'private' and proname = 'move_in_today_queue'), 'true'
  union all select '오늘 관리대상(2인자): 새 본문을 부르는 래퍼',
         (select (position('private.move_in_today_queue(' in def) > 0)::text from f where nsp = 'public' and proname = 'get_move_in_today_queue'), 'true'
  union all select '완료 처리 RPC: 세대만 판정(전체 재계산 없음)',
         (select (position('private.move_in_today_queue(p_project_id, now(), p_unit_id)' in def) > 0
                  and position('get_move_in_today_queue(p_project_id, now())' in def) = 0)::text
          from f where proname = 'complete_or_snooze_move_in_tracking'), 'true'
  union all select '완료 처리 RPC: SECURITY DEFINER 유지',
         (select prosecdef::text from f where proname = 'complete_or_snooze_move_in_tracking'), 'true'
  union all select '방문 결과 RPC(7인자, 다음 방문일) 존재·SECURITY DEFINER',
         (select (count(*) = 1 and bool_and(prosecdef))::text from f where proname = 'record_move_in_visit_result' and pronargs = 7), 'true'
  union all select '방문 결과 RPC(6인자): 7인자를 부르는 래퍼',
         (select (position('record_move_in_visit_result(p_project_id, p_visit_target_id' in def) > 0 and position('null::timestamptz' in def) > 0)::text
          from f where proname = 'record_move_in_visit_result' and pronargs = 6), 'true'
  union all select '방문 결과 RPC 6·7인자: authenticated 실행 가능',
         (select (count(*) = 2 and bool_and(has_function_privilege('authenticated', oid, 'EXECUTE')))::text from f where proname = 'record_move_in_visit_result'), 'true'
  union all select '오늘 관리대상·완료 처리·보조 함수: authenticated 실행 가능',
         (select (count(*) = 4 and bool_and(has_function_privilege('authenticated', oid, 'EXECUTE')))::text from f where proname <> 'record_move_in_visit_result'), 'true'
  -- 기존 2개(오늘 관리대상·완료 처리)의 ACL은 A6이 바꾸지 않으므로 판정에서 뺀다(07·04에서 확인)
  union all select 'A6 추가·권한 지정 함수(보조 2·방문 결과 6·7인자): anon 실행 불가',
         (select (count(*) = 4 and not bool_or(has_function_privilege('anon', oid, 'EXECUTE')))::text from f where nsp = 'private' or proname = 'record_move_in_visit_result'), 'true'
  union all select '대상 함수 개수(오늘 관리대상 1·완료 1·방문 결과 2·보조 2)',
         (select count(*)::text from f), '6'
  union all select '오늘(KST) 처리 기록 건수(참고: 적용 직후 0이 정상, 현장 처리 시작 후 증가)',
         (select count(*)::text from public.move_in_tracking_disposition where tracking_date = (now() at time zone 'Asia/Seoul')::date), 'INFO'
  union all select 'Stay J 오늘 관리대상 세대 수(참고)',
         (select count(*)::text from public.get_move_in_today_queue('1283e198-5043-4027-96d6-edcc7a6686c6', now())), 'INFO'
)
select item, value, expected, case when expected = 'INFO' then 'INFO' when value = expected then 'PASS' else 'FAIL' end as verdict from c;
