-- 오늘 관리대상 RPC 실행 시간(실제 로그인 사용자와 같은 authenticated·RLS 조건) — 읽기 전용
-- Stay J 활성 PROJECT_ADMIN 1명의 권한으로 실행한다(ID는 출력하지 않음). 결과 맨 아래 Execution Time을 본다.
-- begin read only 안에서만 실행되므로 데이터는 바뀌지 않는다.
begin read only;
select set_config('request.jwt.claims', json_build_object(
  'sub', (select m.user_id::text from public.project_member m
          where m.project_id = '1283e198-5043-4027-96d6-edcc7a6686c6' and m.role = 'PROJECT_ADMIN' and m.active
          order by m.created_at limit 1),
  'role', 'authenticated')::text, true) is not null as claims_set;
set local role authenticated;
explain (analyze, costs off, timing on)
select count(*) from public.get_move_in_today_queue('1283e198-5043-4027-96d6-edcc7a6686c6', now());
