-- [전환 당일 02] 현장 상담 저장 중지 시각 이후 상담·상태변경 0건 확인 — 읽기 전용(단일 SELECT)
-- 실행 전 아래 with stop 줄의 꺾쇠 자리표시(STOP_TIME_KST)를 실제 중지 시각으로 바꾼다. 예: '2026-10-20 06:30:00+09'
-- 자리표시는 SQL 안에 1곳뿐이다. 바꾸지 않으면 시각 변환 오류로 실행되지 않는다(잘못된 기준으로 PASS가 나오지 않도록).
-- 모든 프로젝트 대상(마이그레이션은 프로젝트 공통 함수를 바꾼다).
-- 마지막 줄 OVERALL은 모든 항목이 0건일 때만 PASS다(0이 아닌 항목 수를 함께 표시). OVERALL = PASS 여야 진행.
with stop as (select timestamptz '<STOP_TIME_KST>' as at),
checks as (
  select 1 as ord, 'consultation 신규(created_at)' as item, count(*) as n from public.consultation, stop where created_at >= stop.at
  union all select 2, 'consultation 수정(updated_at)', count(*) from public.consultation, stop where updated_at >= stop.at
  union all select 3, 'consultation 상담시각(consulted_at)', count(*) from public.consultation, stop where consulted_at >= stop.at
  union all select 4, 'unit_occupancy_status 변경', count(*) from public.unit_occupancy_status, stop where updated_at >= stop.at
  union all select 5, 'contract 변경', count(*) from public.contract, stop where updated_at >= stop.at
  union all select 6, 'contract_status_history 기록', count(*) from public.contract_status_history, stop where changed_at >= stop.at
  union all select 7, 'contact_schedule 생성·변경', count(*) from public.contact_schedule, stop where created_at >= stop.at or updated_at >= stop.at
  union all select 8, 'customer 변경', count(*) from public.customer, stop where updated_at >= stop.at
  union all select 9, 'unit_deal 변경', count(*) from public.unit_deal, stop where updated_at >= stop.at
  union all select 10, 'move_in_special_case 변경', count(*) from public.move_in_special_case, stop where updated_at >= stop.at
),
result as (
  select ord, item, n as rows_since_stop, case when n = 0 then 'PASS' else 'STOP' end as verdict
  from checks
  union all
  select 99, 'OVERALL (' || count(*) || '개 항목 중 0건 아님 ' || count(*) filter (where n <> 0) || '개)',
    sum(n), case when count(*) = 10 and bool_and(n = 0) then 'PASS' else 'STOP' end
  from checks
)
select case when ord = 99 then 'OVERALL' else item end as item, rows_since_stop, verdict,
  case when ord = 99 then item end as detail, (select at from stop) as stop_time
from result
order by ord;
