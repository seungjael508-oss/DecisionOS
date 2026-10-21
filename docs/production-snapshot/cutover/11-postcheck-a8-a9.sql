-- [A8·A9 적용 후] 조회 RLS 반복 평가 제거·오늘 관리대상 계산 반복 제거 확인 — 읽기 전용(단일 SELECT), 집계값만
-- 실행: Supabase SQL Editor에 전체를 붙여 넣고 Run. 판정 9행이 모두 PASS → 적용 완료. FAIL·오류 → 결과표 회신
-- 이후 성능 확인: perf-explain-by-role.sql을 상담사·관리자로 다시 실행(적용 전 상담사 10,500ms / 오늘 관리 RPC 6,505ms와 비교)
with pol as (
  select policyname, qual, cmd, permissive, roles::text as roles, with_check from pg_policies
  where schemaname = 'public' and policyname in ('consultation_select', 'consultation_hwayang_field_select', 'customer_select',
    'customer_hwayang_field_select', 'project_unit_select', 'contract_select', 'unit_occupancy_status_select')
),
fn as (select oid, prosecdef from pg_proc where oid = to_regprocedure('private.current_project_memberships()')),
q as (select pg_get_functiondef(oid) d from pg_proc where oid = to_regprocedure('private.move_in_today_queue(uuid,timestamp with time zone,uuid)')),
c as (
  select 'A8 대상 정책 7개 존재' as item, (select count(*) from pol)::text as value, '7' as expected
  union all select 'A8 정책 7개: 소속 목록 비교로 변경', (select count(*) from pol where position('private.current_project_memberships()' in qual) > 0)::text, '7'
  union all select 'A8 정책 7개: SELECT·PERMISSIVE·authenticated·WITH CHECK 없음 유지',
    (select count(*) from pol where cmd = 'SELECT' and permissive = 'PERMISSIVE' and roles = '{authenticated}' and with_check is null)::text, '7'
  union all select 'A8 정책 7개: 행마다 호출하던 권한 함수 제거', (select count(*) from pol where qual ~ '(has_project_role|current_project_member_id|is_hwayang_field_member)\(')::text, '0'
  union all select 'A8 보조 함수 존재·SECURITY DEFINER', (select coalesce(bool_and(prosecdef), false)::text from fn), 'true'
  union all select 'A8 보조 함수: authenticated 실행 가능', (select coalesce(bool_and(has_function_privilege('authenticated', oid, 'EXECUTE')), false)::text from fn), 'true'
  union all select 'A8 보조 함수: anon 실행 불가', (select coalesce(bool_and(not has_function_privilege('anon', oid, 'EXECUTE')), false)::text from fn), 'true'
  union all select 'A9 오늘 관리대상: 상담 집계·방문 일정 MATERIALIZED',
    (select (position('contact_aggregate as materialized' in d) > 0 and position('visit_schedule as materialized' in d) > 0)::text from q), 'true'
  union all select 'A9 오늘 관리대상: 문자 판정 수정본 유지', (select (position('latest_message_at' in d) > 0)::text from q), 'true'
  union all select 'Stay J 오늘 관리대상 세대 수(참고: 적용 전 101, 상담 진행으로 달라질 수 있음)',
    (select count(*)::text from public.get_move_in_today_queue('1283e198-5043-4027-96d6-edcc7a6686c6', now())), 'INFO'
)
select item, value, expected, case when expected = 'INFO' then 'INFO' when value = expected then 'PASS' else 'FAIL' end as verdict from c;
