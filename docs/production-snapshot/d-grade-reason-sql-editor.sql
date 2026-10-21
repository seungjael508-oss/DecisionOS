-- Stay J D등급 관리 사유 — 운영 대조 집계 (Supabase SQL Editor용, 단일 SELECT, 쓰기 문 없음)
-- 대상 프로젝트: 1283e198-5043-4027-96d6-edcc7a6686c6
-- 생성: docs/production-snapshot/verification/gen-d-reason-sql.mjs (special-tag-source.ts sha256 앞 16자리 8a04be3ee7f9aa53)
-- 아셀 36세대 · 연체 30세대 동·호수(원본 명단의 비식별 키)만 포함. 고객 식별자는 출력하지 않는다.
-- 판정 규칙은 src/lib/move-in/d-grade-reasons.ts와 동일:
--  · 대상: 현재 ACTIVE 계약의 기본등급 D
--  · 아셀·연체: 명단 동·호수 일치 + 같은 세대에 현재 계약 외 계약이 없음(있으면 '명단 연결 보류'로 별도 집계)
--  · C등급 하향: 현재 계약자 상담의 A~D 등급 + 현재 계약의 등급 변경 이력에서 마지막이 D이고 D 직전 등급이 C
--  · 입주 곤란: 자금상태 대출 한도부족·자금부족·기존주택 미처분 또는 입주진행 지연
--  · 장기 부재: 현재 계약자 마지막 실제 접촉 이후 전화(CALL) 부재 3회 이상
-- 결과 숫자만 회신한다.
with
asel_src(b, u) as (values ('106','1101'),('107','301'),('103','504'),('103','404'),('105','504'),('106','501'),('102','304'),('103','704'),('103','604'),('106','502'),('106','602'),('106','702'),('106','601'),('104','502'),('106','301'),('103','304'),('105','403'),('105','404'),('103','303'),('103','204'),('104','402'),('104','404'),('106','402'),('103','503'),('105','303'),('104','301'),('106','302'),('104','302'),('104','203'),('105','202'),('105','304'),('104','304'),('104','204'),('105','203'),('105','201'),('104','202')),
delinquent_src(b, u) as (values ('101','701'),('101','1004'),('103','1803'),('105','202'),('108','502'),('101','202'),('102','304'),('102','504'),('102','1203'),('103','504'),('103','1004'),('103','1504'),('103','2204'),('104','402'),('108','2801'),('103','304'),('103','403'),('104','202'),('104','301'),('104','302'),('104','404'),('105','403'),('106','302'),('106','502'),('106','602'),('106','1001'),('106','1201'),('108','401'),('101','501'),('104','2804')),
cur as (
  select uos.unit_id, uos.contract_id, c.customer_id, uos.funding_status::text as funding, uos.move_in_status::text as move_in,
    coalesce(nullif(regexp_replace(btrim(pu.building_no), '^0+(?=[0-9])', ''), ''), '0') as b, coalesce(nullif(regexp_replace(btrim(pu.unit_no), '^0+(?=[0-9])', ''), ''), '0') as u
  from public.unit_occupancy_status uos
  join public.contract c on c.project_id = uos.project_id and c.unit_id = uos.unit_id
   and c.contract_id = uos.contract_id and c.contract_status = 'ACTIVE'
  join public.project_unit pu on pu.project_id = uos.project_id and pu.unit_id = uos.unit_id
  where uos.project_id = '1283e198-5043-4027-96d6-edcc7a6686c6' and uos.legacy_grade = 'D'
),
holder as (
  select cur.unit_id, exists (select 1 from public.contract o where o.project_id = '1283e198-5043-4027-96d6-edcc7a6686c6' and o.unit_id = cur.unit_id
    and o.contract_id <> cur.contract_id) as changed
  from cur
),
hc as (
  select k.unit_id, k.id::text as pid, k.consulted_at as at, k.contact_type, k.structured_tags->>'legacy_grade' as tag
  from public.consultation k join cur on cur.unit_id = k.unit_id and cur.customer_id = k.customer_id
  where k.project_id = '1283e198-5043-4027-96d6-edcc7a6686c6'
),
last_real as (select unit_id, max(at) filter (where tag is distinct from '부재') as at from hc group by unit_id),
streak as (
  select hc.unit_id, count(*) as n from hc left join last_real lr on lr.unit_id = hc.unit_id
  where hc.tag = '부재' and hc.contact_type = 'CALL' and (lr.at is null or hc.at > lr.at) group by hc.unit_id
),
pts as (
  select unit_id, at, 1 as ord, pid, tag as g from hc where tag in ('A','B','C','D')
  union all
  select h.unit_id, h.changed_at, 0, h.history_id::text, h.previous_value from public.contract_status_history h
    join cur on cur.unit_id = h.unit_id and cur.contract_id = h.contract_id
    where h.project_id = '1283e198-5043-4027-96d6-edcc7a6686c6' and h.field_changed = 'legacy_grade' and h.previous_value in ('A','B','C','D')
  union all
  select h.unit_id, h.changed_at, 2, h.history_id::text, h.new_value from public.contract_status_history h
    join cur on cur.unit_id = h.unit_id and cur.contract_id = h.contract_id
    where h.project_id = '1283e198-5043-4027-96d6-edcc7a6686c6' and h.field_changed = 'legacy_grade' and h.new_value in ('A','B','C','D')
),
seq as (select unit_id, g, row_number() over (partition by unit_id order by at, ord, pid collate "C") as rn from pts),
c_down as (
  select s.unit_id from seq s
  join (select unit_id, max(rn) as mx from seq group by unit_id) l on l.unit_id = s.unit_id and l.mx = s.rn and s.g = 'D'
  join (select unit_id, max(rn) as nd from seq where g <> 'D' group by unit_id) n on n.unit_id = s.unit_id
  join seq p on p.unit_id = n.unit_id and p.rn = n.nd and p.g = 'C'
),
flags as (
  select cur.unit_id,
    (not h.changed and exists (select 1 from asel_src a where a.b = cur.b and a.u = cur.u)) as asel,
    (not h.changed and exists (select 1 from delinquent_src d where d.b = cur.b and d.u = cur.u)) as delinquent,
    (h.changed and exists (select 1 from asel_src a where a.b = cur.b and a.u = cur.u
       union all select 1 from delinquent_src d where d.b = cur.b and d.u = cur.u)) as source_held,
    exists (select 1 from c_down cd where cd.unit_id = cur.unit_id) as c_downgrade,
    (cur.funding in ('LOAN_LIMIT_SHORTAGE','FUNDING_SHORTAGE','EXISTING_HOME_UNSOLD') or cur.move_in = 'DELAYED') as move_in_difficulty,
    coalesce((select s.n from streak s where s.unit_id = cur.unit_id), 0) >= 3 as absence_3plus
  from cur join holder h on h.unit_id = cur.unit_id
),
counted as (
  select *, (asel::int + delinquent::int + c_downgrade::int + move_in_difficulty::int + absence_3plus::int) as reasons from flags
)
select
  count(*) as d_total,
  count(*) filter (where asel) as asel,
  count(*) filter (where delinquent) as delinquent,
  count(*) filter (where c_downgrade) as c_downgrade,
  count(*) filter (where move_in_difficulty) as move_in_difficulty,
  count(*) filter (where absence_3plus) as absence_3plus,
  count(*) filter (where reasons >= 1) as classified,
  count(*) filter (where reasons = 0) as unclassified,
  count(*) filter (where reasons >= 2) as multiple_reasons,
  count(*) filter (where source_held) as source_link_held
from counted;
