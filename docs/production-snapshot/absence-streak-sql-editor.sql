-- Stay J 장기 부재 자동 D등급 전환 — 운영 적용 전 규모 진단 (Supabase SQL Editor용)
-- 대상 프로젝트: 1283e198-5043-4027-96d6-edcc7a6686c6
-- 두 쿼리 모두 단일 SELECT(쓰기 문 없음)이다. 데이터·스키마를 바꾸지 않는다.
-- 쿼리 1과 쿼리 2를 하나씩 따로 붙여 넣어 실행하고, 결과 표의 숫자만 회신한다(세대·고객 식별자는 출력하지 않음).
--
-- 계산 규칙(마이그레이션 20261017120000과 동일)
--  · 현재 ACTIVE 계약자 본인 상담만, 추적 제외(move_in_tracking_exclusion.active) 세대 제외
--  · 연속 부재 = 마지막 실제 접촉(부재 외 모든 상담) 이후의 전화(CALL) 부재 건수
--  · 연속 2회: 신규 전화 부재 1회 저장 시 3회가 되어 자동 전환
--  · 연속 3회 이상: 다음 신규 전화 부재 저장 시 자동 전환
--  · 기존 D: 등급 변경·이력 없이 방문상담 대상만 등록


-- ===================== 쿼리 1: 전체 규모 =====================
with
current_holder as (
  select uos.unit_id, uos.legacy_grade, c.customer_id
  from public.unit_occupancy_status uos
  join public.contract c on c.project_id = uos.project_id and c.unit_id = uos.unit_id
   and c.contract_id = uos.contract_id and c.contract_status = 'ACTIVE'
  where uos.project_id = '1283e198-5043-4027-96d6-edcc7a6686c6'
    and not exists (select 1 from public.move_in_tracking_exclusion x where x.project_id = uos.project_id
      and x.unit_id = uos.unit_id and x.contract_id = uos.contract_id and x.active)
),
hc as (
  select k.unit_id, k.consulted_at, k.contact_type, k.structured_tags->>'legacy_grade' as tag
  from public.consultation k join current_holder h on h.unit_id = k.unit_id and h.customer_id = k.customer_id
  where k.project_id = '1283e198-5043-4027-96d6-edcc7a6686c6'
),
last_real as (select unit_id, max(consulted_at) filter (where tag is distinct from '부재') as at from hc group by unit_id),
streak as (
  select hc.unit_id, count(*)::int as n
  from hc join last_real lr on lr.unit_id = hc.unit_id
  where hc.tag = '부재' and hc.contact_type = 'CALL' and (lr.at is null or hc.consulted_at > lr.at)
  group by hc.unit_id
)
select
  (select count(*) from current_holder) as active_units,
  count(*) filter (where s.n = 2) as streak_2,
  count(*) filter (where s.n >= 3) as streak_3_plus,
  count(*) filter (where s.n >= 2 and h.legacy_grade is distinct from 'D') as auto_d_candidates,
  count(*) filter (where s.n >= 2 and h.legacy_grade = 'D') as already_d_visit_only,
  count(*) filter (where s.n >= 2) as visit_target_candidates
from current_holder h join streak s on s.unit_id = h.unit_id;


-- ===================== 쿼리 2: 기존 등급별 =====================
with
current_holder as (
  select uos.unit_id, uos.legacy_grade, c.customer_id
  from public.unit_occupancy_status uos
  join public.contract c on c.project_id = uos.project_id and c.unit_id = uos.unit_id
   and c.contract_id = uos.contract_id and c.contract_status = 'ACTIVE'
  where uos.project_id = '1283e198-5043-4027-96d6-edcc7a6686c6'
    and not exists (select 1 from public.move_in_tracking_exclusion x where x.project_id = uos.project_id
      and x.unit_id = uos.unit_id and x.contract_id = uos.contract_id and x.active)
),
hc as (
  select k.unit_id, k.consulted_at, k.contact_type, k.structured_tags->>'legacy_grade' as tag
  from public.consultation k join current_holder h on h.unit_id = k.unit_id and h.customer_id = k.customer_id
  where k.project_id = '1283e198-5043-4027-96d6-edcc7a6686c6'
),
last_real as (select unit_id, max(consulted_at) filter (where tag is distinct from '부재') as at from hc group by unit_id),
streak as (
  select hc.unit_id, count(*)::int as n
  from hc join last_real lr on lr.unit_id = hc.unit_id
  where hc.tag = '부재' and hc.contact_type = 'CALL' and (lr.at is null or hc.consulted_at > lr.at)
  group by hc.unit_id
)
select
  case when h.legacy_grade in ('A', 'B', 'C', 'D') then h.legacy_grade
       when h.legacy_grade is null then '미등록'
       else h.legacy_grade || '(미분류)' end as current_grade,
  count(*) filter (where s.n = 2) as streak_2,
  count(*) filter (where s.n = 3) as streak_3,
  count(*) filter (where s.n = 4) as streak_4,
  count(*) filter (where s.n >= 5) as streak_5_plus,
  count(*) filter (where s.n >= 2) as total_2_plus,
  case when h.legacy_grade = 'D' then '방문대상만' else 'D 자동 전환' end as on_next_absence
from current_holder h join streak s on s.unit_id = h.unit_id
where s.n >= 2
group by h.legacy_grade
order by case h.legacy_grade when 'A' then 1 when 'B' then 2 when 'C' then 3 when 'D' then 4 else 5 end, 1;
