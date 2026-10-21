-- [06] 자동 D등급 변경 이력 요약 — 읽기 전용(단일 SELECT)
-- 자동 전환(20261017120000)은 contract_status_history에 field_changed='legacy_grade', reason='장기 부재중(연속 3회)'로 남긴다.
-- 날짜(KST)·이전 등급별 건수와, 그 세대의 현재 등급이 아직 D인지(이후 상담사가 수동 재조정했는지)를 본다.
-- 자동 변경된 D등급은 롤백해도 되돌리지 않는다(운영 기록). 식별자가 필요하면 06b를 쓴다.
select
  (h.changed_at at time zone 'Asia/Seoul')::date as changed_date_kst,
  coalesce(h.previous_value, '미등록') as previous_grade,
  count(*) as auto_d_changes,
  count(*) filter (where uos.legacy_grade = 'D') as still_d_now,
  count(*) filter (where uos.legacy_grade is distinct from 'D') as regraded_since,
  count(*) filter (where c.contract_status is distinct from 'ACTIVE') as contract_no_longer_active
from public.contract_status_history h
left join public.contract c on c.project_id = h.project_id and c.contract_id = h.contract_id
left join public.unit_occupancy_status uos on uos.project_id = h.project_id and uos.unit_id = h.unit_id and uos.contract_id = h.contract_id
where h.field_changed = 'legacy_grade'
  and h.reason = '장기 부재중(연속 3회)'
group by 1, 2
order by 1, 2;
