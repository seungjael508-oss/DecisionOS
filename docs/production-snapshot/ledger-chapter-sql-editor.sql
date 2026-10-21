-- Stay J 통합원장 '입주촉진 집중관리' 챕터 — 운영 대조 집계 (Supabase SQL Editor용)
-- 대상 프로젝트: 1283e198-5043-4027-96d6-edcc7a6686c6
-- 단일 SELECT(쓰기 문 없음). 세대·고객 식별자는 출력하지 않는다. 결과 한 줄의 숫자만 회신한다.
-- 판정 규칙은 src/lib/move-in/ledger-chapters.ts · intent.ts(resolveEffectiveMoveInIntent) · d-grade-reasons.ts와 동일:
--  · 대상: 현재 ACTIVE 계약 1건이 점유상태와 일치하는 세대(원장과 같은 기준)
--  · 입주의향(effective): 최종의향이 입주·전매/매도·전세/월세·해지·포기면 그 값,
--    아니면(미확정·입주 고려·미등록) 입주의향 보조값으로 실입주→입주, 매도→전매/매도, 전세·월세→임대, 그 외→미정
--  · C등급 미정 / D등급 미정: 현재등급 C·D 이고 effective 미정
--  · C·D 전매·임대: 현재등급 C·D 이고 effective 전매/매도 또는 임대
--  · 장기 부재 3회+: 현재 계약자 마지막 실제 접촉(부재 외 상담) 이후 전화(CALL) 부재 3회 이상(등급 무관)
--  · 등급별: a/b/c/d_total + grade_other(부재·상담거절 등 기존 비등급 값·미등록). 합계 = all_units
--  · C·D 전매·임대 내역: cd_sale + cd_jeonse + cd_monthly_rent + cd_rent_type_unknown = cd_sale_rent
-- 원장 화면 숫자는 관리자 기준 전체 세대다. 상담사 화면은 권한 범위만큼 작을 수 있다.
with
cur as (
  select uos.unit_id, uos.legacy_grade, c.customer_id,
    case
      when uos.operational_intent::text in ('MOVE_IN', 'SALE_TRANSFER', 'RENT', 'TERMINATION', 'ABANDONMENT') then uos.operational_intent::text
      else case uos.occupancy_intent::text
        when 'SELF_MOVE_IN' then 'MOVE_IN' when 'SALE' then 'SALE_TRANSFER'
        when 'JEONSE' then 'RENT' when 'MONTHLY_RENT' then 'RENT' else 'UNDECIDED' end
    end as effective_intent,
    -- 임대 유형(앱 rentalType과 동일): 최종의향 임대면 보조값이 전세·월세일 때만, 보조값 기반 임대면 그 값
    case uos.occupancy_intent::text when 'JEONSE' then 'JEONSE' when 'MONTHLY_RENT' then 'MONTHLY_RENT' end as rental_type
  from public.unit_occupancy_status uos
  join public.project_unit pu on pu.project_id = uos.project_id and pu.unit_id = uos.unit_id
  join public.contract c on c.project_id = uos.project_id and c.unit_id = uos.unit_id
   and c.contract_id = uos.contract_id and c.contract_status = 'ACTIVE'
  where uos.project_id = '1283e198-5043-4027-96d6-edcc7a6686c6'
    and (select count(*) from public.contract a where a.project_id = uos.project_id and a.unit_id = uos.unit_id
         and a.contract_status = 'ACTIVE') = 1
),
hc as (
  select k.unit_id, k.consulted_at as at, k.contact_type, k.structured_tags->>'legacy_grade' as tag
  from public.consultation k join cur on cur.unit_id = k.unit_id and cur.customer_id = k.customer_id
  where k.project_id = '1283e198-5043-4027-96d6-edcc7a6686c6'
),
last_real as (select unit_id, max(at) filter (where tag is distinct from '부재') as at from hc group by unit_id),
streak as (
  select hc.unit_id, count(*) as n from hc left join last_real lr on lr.unit_id = hc.unit_id
  where hc.tag = '부재' and hc.contact_type = 'CALL' and (lr.at is null or hc.at > lr.at) group by hc.unit_id
)
select
  count(*) as all_units,
  count(*) filter (where cur.legacy_grade = 'A') as a_total,
  count(*) filter (where cur.legacy_grade = 'B') as b_total,
  count(*) filter (where cur.legacy_grade = 'C') as c_total,
  count(*) filter (where cur.legacy_grade = 'D') as d_total,
  count(*) filter (where cur.legacy_grade is null or cur.legacy_grade not in ('A', 'B', 'C', 'D')) as grade_other,
  count(*) filter (where cur.legacy_grade in ('C', 'D') and cur.effective_intent = 'SALE_TRANSFER') as cd_sale,
  count(*) filter (where cur.legacy_grade in ('C', 'D') and cur.effective_intent = 'RENT' and cur.rental_type = 'JEONSE') as cd_jeonse,
  count(*) filter (where cur.legacy_grade in ('C', 'D') and cur.effective_intent = 'RENT' and cur.rental_type = 'MONTHLY_RENT') as cd_monthly_rent,
  count(*) filter (where cur.legacy_grade in ('C', 'D') and cur.effective_intent = 'RENT' and cur.rental_type is null) as cd_rent_type_unknown,
  count(*) filter (where cur.legacy_grade = 'C' and cur.effective_intent = 'UNDECIDED') as c_undecided,
  count(*) filter (where cur.legacy_grade = 'D' and cur.effective_intent = 'UNDECIDED') as d_undecided,
  count(*) filter (where cur.legacy_grade in ('C', 'D') and cur.effective_intent in ('SALE_TRANSFER', 'RENT')) as cd_sale_rent,
  count(*) filter (where coalesce(s.n, 0) >= 3) as absence_3plus
from cur left join streak s on s.unit_id = cur.unit_id;
