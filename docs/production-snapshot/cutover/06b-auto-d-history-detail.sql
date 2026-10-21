-- [06b] 자동 D등급 변경 이력 상세 — 읽기 전용(단일 SELECT)
-- 롤백·재조정 판단에 세대 단위 확인이 필요할 때만 실행한다. 내부 식별자(UUID)가 나오므로 결과를 저장소·메신저에 두지 않는다.
-- 고객 이름·전화번호·동호수는 출력하지 않는다.
select
  h.changed_at at time zone 'Asia/Seoul' as changed_at_kst,
  h.project_id, h.unit_id, h.contract_id,
  h.previous_value as previous_grade, h.new_value,
  h.contact_id as trigger_consultation_id,
  uos.legacy_grade as current_grade,
  c.contract_status as contract_status_now,
  exists (select 1 from public.contract_status_history later
          where later.contract_id = h.contract_id and later.field_changed = 'legacy_grade' and later.changed_at > h.changed_at) as later_grade_history
from public.contract_status_history h
left join public.contract c on c.project_id = h.project_id and c.contract_id = h.contract_id
left join public.unit_occupancy_status uos on uos.project_id = h.project_id and uos.unit_id = h.unit_id and uos.contract_id = h.contract_id
where h.field_changed = 'legacy_grade'
  and h.reason = '장기 부재중(연속 3회)'
order by h.changed_at, h.unit_id;
