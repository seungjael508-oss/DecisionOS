-- [전환 당일 01] 오늘(KST) 오늘 관리대상 처리 기록 0건 확인 — 읽기 전용(단일 SELECT)
-- 20261015·20261017100000 사전 점검은 "오늘 처리 기록이 1건이라도 있으면(모든 프로젝트)" 적용을 중단한다.
-- verdict = STOP 이면 그날 전환하지 않는다(처리 기록과 사유 목록 불일치 방지).
select
  (now() at time zone 'Asia/Seoul')::date as kst_today,
  now() at time zone 'Asia/Seoul' as checked_at_kst,
  count(*) as dispositions_today_all_projects,
  count(*) filter (where project_id = '1283e198-5043-4027-96d6-edcc7a6686c6') as dispositions_today_stayj,
  case when count(*) = 0 then 'PASS' else 'STOP' end as verdict
from public.move_in_tracking_disposition
where tracking_date = (now() at time zone 'Asia/Seoul')::date;
