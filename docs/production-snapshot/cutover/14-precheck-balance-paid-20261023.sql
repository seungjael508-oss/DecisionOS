-- [TAS-20261023-01 잔금완납 반영 전] 대상 9세대 현재 상태 확인 — 읽기 전용(단일 SELECT). 실행해도 아무것도 바뀌지 않는다.
-- 실행: 운영 프로젝트(대시보드 URL의 ref를 먼저 확인)의 SQL Editor에 전체를 붙여 넣고 Run.
-- 지시서의 unit_ledgers.payment_status는 운영 스키마에 없다. 실제 반영 필드는
--   unit_occupancy_status.move_in_status = 'BALANCE_PAID' + balance_paid_at (이력: contract_status_history 'move_in_status').
-- action
--   APPLY            → 14-apply 스크립트가 잔금완납으로 바꾼다.
--   ALREADY          → 이미 잔금완납(완납일만 비어 있으면 채운다).
--   KEEP_MOVED_IN    → 이미 입주완료. 상태를 낮추지 않고 완납일만 비어 있으면 채운다.
--   HOLD             → 지시서상 미수금이 남아 반영 보류(잔여금액 표기). 현장 확인 후 별도 반영.
--   STOP             → 세대·현재 계약·계약자명이 맞지 않음. 반영하지 않고 결과표 회신.
-- note: D등급·소송/법률·특별관리 세대는 잔금완납 상태만 바뀌고 등급·특별관리 Lock은 건드리지 않는다(확인용 표기).
with p as (select '1283e198-5043-4027-96d6-edcc7a6686c6'::uuid as id),
t(ord, b, u, holder, paid_on, remaining_krw, hold) as (values
  (1, '101', '1402', '황홍모',      date '2026-10-19', 22365000, true),
  (2, '101', '1702', '서명하',      date '2026-10-16', 22212900, true),
  (3, '101', '2401', '목진란',      date '2026-07-23', 0,        false),
  (4, '103', '0401', '박옥자',      date '2026-10-13', 0,        false),
  (5, '103', '2903', '신상흠',      date '2026-10-21', 0,        false),
  (6, '104', '1504', 'PIAO MEILAN', date '2026-10-20', 22782600, true),
  (7, '104', '2303', '임영택',      date '2026-09-23', 42758400, true),
  (8, '105', '1401', '남기수',      date '2026-10-08', 0,        false),
  (9, '107', '0604', '박동현',      date '2026-02-19', 0,        false)
),
pu as (
  select pu.unit_id, pu.building_no, pu.unit_no,
    coalesce(nullif(regexp_replace(btrim(pu.building_no), '^0+(?=[0-9])', ''), ''), '0') as nb,
    coalesce(nullif(regexp_replace(btrim(pu.unit_no), '^0+(?=[0-9])', ''), ''), '0') as nu
  from public.project_unit pu, p where pu.project_id = p.id
),
r as (
  select t.*,
    (select count(*) from pu where pu.nb = ltrim(t.b, '0') and pu.nu = ltrim(t.u, '0')) as unit_matches,
    x.unit_id, x.contracts, x.db_holder, x.move_in_status, x.balance_paid_at, x.legacy_grade, x.special
  from t
  left join lateral (
    select pu.unit_id,
      (select count(*) from public.contract c where c.project_id = (select id from p) and c.unit_id = pu.unit_id and c.contract_status = 'ACTIVE') as contracts,
      cu.name as db_holder, o.move_in_status::text as move_in_status, o.balance_paid_at, o.legacy_grade,
      (select concat_ws(' · ',
          case when s.manually_flagged then '특별관리' end,
          case when s.legal_consultation_required then '법률/소송' end,
          case when s.visit_required then '방문대상' end)
        from public.move_in_special_case s
        where s.project_id = (select id from p) and s.unit_id = pu.unit_id and s.contract_id = c.contract_id) as special
    from pu
    left join public.contract c on c.project_id = (select id from p) and c.unit_id = pu.unit_id and c.contract_status = 'ACTIVE'
    left join public.customer cu on cu.id = c.customer_id
    left join public.unit_occupancy_status o on o.project_id = (select id from p) and o.unit_id = pu.unit_id and o.contract_id = c.contract_id
    where pu.nb = ltrim(t.b, '0') and pu.nu = ltrim(t.u, '0')
    limit 1
  ) x on true
)
select ord, b || '동 ' || u || '호' as unit, holder as order_holder, db_holder,
  to_char(paid_on, 'YYYY-MM-DD') as paid_on,
  case when hold then to_char(remaining_krw, 'FM999,999,999') || '원' else '0원' end as remaining,
  move_in_status, to_char(balance_paid_at at time zone 'Asia/Seoul', 'YYYY-MM-DD') as db_balance_paid_at, legacy_grade,
  case
    when unit_matches <> 1 or contracts <> 1 or move_in_status is null then 'STOP'
    when replace(upper(btrim(db_holder)), ' ', '') <> replace(upper(btrim(holder)), ' ', '') then 'STOP'
    when hold then 'HOLD'
    when move_in_status = 'MOVED_IN' then 'KEEP_MOVED_IN'
    when move_in_status = 'BALANCE_PAID' then 'ALREADY'
    else 'APPLY' end as action,
  nullif(concat_ws(' · ', case when legacy_grade = 'D' then 'D등급(Lock 유지)' end, nullif(special, '')), '') as note
from r
order by ord;
