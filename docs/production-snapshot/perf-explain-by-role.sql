-- [운영 성능 진단] 실제 사용자 권한(RLS)으로 핵심 조회 실행시간 측정 — 읽기 전용, 데이터 변경 없음
-- 실행: Supabase SQL Editor에 전체를 붙여 넣고 Run. 결과(QUERY PLAN) 전체를 CSV로 내려받아 회신.
-- 역할을 바꿔 두 번 실행한다: 아래 v_role 값을 'COUNSELOR'(1회) → 'PROJECT_ADMIN'(1회)
-- 출력: 실행 계획과 시간만(고객 정보 없음). 사용자 ID는 내부 설정에만 쓰고 출력하지 않는다.
begin read only;
select set_config('request.jwt.claims', json_build_object('sub', m.user_id, 'role', 'authenticated')::text, true),
       set_config('request.jwt.claim.sub', m.user_id::text, true)
from (select user_id from public.project_member
      where project_id = '1283e198-5043-4027-96d6-edcc7a6686c6' and active
        and role = 'COUNSELOR'::public.project_member_role   -- v_role: 'COUNSELOR' 또는 'PROJECT_ADMIN'
      limit 1) m;
set local role authenticated;
explain (analyze, buffers)
select
  (select count(*) from public.get_move_in_today_queue('1283e198-5043-4027-96d6-edcc7a6686c6', now())) as today_queue,
  (select count(*) from public.get_move_in_absence_candidates('1283e198-5043-4027-96d6-edcc7a6686c6')) as absence_candidates,
  (select count(*) from public.consultation where project_id = '1283e198-5043-4027-96d6-edcc7a6686c6') as consultations,
  (select count(*) from public.project_unit where project_id = '1283e198-5043-4027-96d6-edcc7a6686c6') as units,
  (select count(*) from public.contract where project_id = '1283e198-5043-4027-96d6-edcc7a6686c6') as contracts,
  (select count(*) from public.customer where project_id = '1283e198-5043-4027-96d6-edcc7a6686c6') as customers,
  (select count(*) from public.unit_occupancy_status where project_id = '1283e198-5043-4027-96d6-edcc7a6686c6') as occupancy;
