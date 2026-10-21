// C·D 거래 자금유형 초기 후보(운영 추출 JSON) → SQL Editor용 SQL 2개 생성. 실행하지 않는다.
// 사용: node gen-trade-funding-seed.mjs <stayj_cd_trade_initial_candidates.json> <출력 폴더>
//   01-dry-run.sql : 읽기 전용. 동·호수로 현재 ACTIVE 계약 매칭 결과만 보여준다(먼저 실행해 21건 MATCHED 확인)
//   02-apply.sql   : A11 적용 후 실행. 매칭 1건 확정 세대만 CANDIDATE로 저장 + 변경 이력. 미매칭은 저장하지 않고 결과에 표시
// - 저장 대상은 자금유형이 확인된 후보(잔금 부족형·대출 활용형·자기자금형)뿐이다. 자금 방식 미확인·기타 세대는 저장하지 않고 건수만 출력
// - 이미 자금유형이 저장된 세대(상담 확인 등)는 덮어쓰지 않는다(SKIPPED_EXISTING)
// - 등급·납부·계약자·상담 기록은 바꾸지 않는다
import fs from "node:fs";
import path from "node:path";

const STAYJ = "1283e198-5043-4027-96d6-edcc7a6686c6";
const REASON = "초기 후보(운영 추출 C·D 거래 자금유형)";

// A11 코드. 이전 작업명(LOAN_BASED·SELF_FUNDED)과 한글 분류명도 같은 코드로 읽는다. 미확인(UNCONFIRMED)은 저장하지 않는다.
const TYPE_ALIASES = [
  ["BALANCE_SHORTAGE", ["BALANCE_SHORTAGE", "잔금부족형", "잔금부족", "잔금 부족형", "잔금 부족", "잔금 부족으로 거래 추진", "잔금부족형거래", "②"]],
  ["LOAN_REQUIRED", ["LOAN_REQUIRED", "LOAN_BASED", "대출활용형", "대출활용", "대출 활용형", "대출 활용", "대출 후 잔금 납부·거래", "대출활용형거래", "③"]],
  ["OWN_FUNDS_AFTER_BALANCE", ["OWN_FUNDS_AFTER_BALANCE", "SELF_FUNDED", "자기자금형", "자기자금", "자기자금 잔금 납부 후 거래", "자기자금형거래", "①"]],
  ["UNCONFIRMED", ["UNCONFIRMED", "UNKNOWN", "미확인"]],
];
const squash = (v) => String(v ?? "").replace(/\s+/g, "").toUpperCase();
export function normalizeType(raw) {
  const s = squash(raw);
  if (!s) return null;
  for (const [code, names] of TYPE_ALIASES) if (names.some((n) => s === squash(n))) return code;
  for (const [code, names] of TYPE_ALIASES) if (names.some((n) => squash(n).length > 1 && s.startsWith(squash(n)))) return code;
  return null;
}
const pick = (o, keys) => { for (const k of keys) if (o[k] !== undefined && o[k] !== null && String(o[k]).trim() !== "") return String(o[k]).trim(); return null; };
const clean = (v) => v?.replace(/\s+/g, "").replace(/동$|호$/g, "") ?? null;
export function unitKey(o) {
  let b = clean(pick(o, ["building_no", "buildingNo", "building", "dong", "동"]));
  let u = clean(pick(o, ["unit_no", "unitNo", "unit", "ho", "호", "호수"]));
  const pair = pick(o, ["dong_ho", "dongHo", "unit_label", "unitLabel", "동호수", "동호"]);
  if ((!b || !u) && pair) {
    const m = pair.replace(/\s+/g, "").match(/^(\d+)동?[-\s]?(\d+)호?$/);
    if (m) { b = m[1]; u = m[2]; }
  }
  return b && u ? { building: b, unit: u } : null;
}
/** JSON 안의 세대 레코드 전부(배열 또는 분류별 배열을 가진 객체). 상위 키가 분류명이면 그 분류를 쓴다 */
export function records(json) {
  const out = [];
  const walk = (node, category) => {
    if (Array.isArray(node)) { for (const item of node) walk(item, category); return; }
    if (!node || typeof node !== "object") return;
    if (unitKey(node)) { out.push({ raw: node, category }); return; }
    for (const [k, v] of Object.entries(node)) if (typeof v === "object") walk(v, normalizeType(k) ? k : category ?? k);
  };
  walk(json, null);
  return out;
}
export function classify(json) {
  return records(json).map(({ raw, category }) => {
    const key = unitKey(raw);
    const type = normalizeType(pick(raw, ["trade_funding_type", "tradeFundingType", "proposed_funding_path", "funding_path", "funding_type", "fundingType", "type", "category", "분류", "자금유형", "자금조달유형"])) ?? normalizeType(category);
    // 초기 반영은 항상 CANDIDATE. 입력에 다른 상태가 있으면 생성하지 않고 중단한다(아래)
    const status = pick(raw, ["trade_funding_status", "tradeFundingStatus", "review_status", "status", "상태"]);
    // 추출 당시 등급(있으면). dry-run에서 현재 등급과 다르면 표시만 한다(저장 대상은 바꾸지 않음)
    const reviewGrade = pick(raw, ["legacy_grade_at_review", "grade_at_review"]);
    return { ...key, type, status, reviewGrade, label: pick(raw, ["category", "분류", "자금유형", "type"]) ?? category ?? null };
  });
}
const lit = (v) => v === null ? "null" : `'${String(v).replace(/'/g, "''")}'`;

function matchCte(rows) {
  const values = rows.map((r, i) => `(${i + 1}, ${lit(r.building)}, ${lit(r.unit)}, ${lit(r.type)}, ${lit(r.reviewGrade ?? null)}::text)`).join(",\n    ");
  return `src(seq, building_no, unit_no, trade_funding_type, review_grade) as (values
    ${values}
),
m as (
  select s.*, pu.unit_id,
    (select count(*) from public.project_unit x where x.project_id = '${STAYJ}' and x.building_no = s.building_no and x.unit_no = s.unit_no) as unit_count,
    (select array_agg(c.contract_id order by c.contract_id) from public.contract c
       where c.project_id = '${STAYJ}' and c.unit_id = pu.unit_id and c.contract_status = 'ACTIVE') as active_ids
  from src s
  left join public.project_unit pu on pu.project_id = '${STAYJ}' and pu.building_no = s.building_no and pu.unit_no = s.unit_no
),
r as (
  select m.*, uos.legacy_grade, uos.contract_id as occupancy_contract_id,
    case
      when m.unit_count = 0 then 'NO_UNIT'
      when m.unit_count > 1 then 'DUPLICATE_UNIT'
      when coalesce(cardinality(m.active_ids), 0) = 0 then 'NO_ACTIVE_CONTRACT'
      when cardinality(m.active_ids) > 1 then 'MULTIPLE_ACTIVE_CONTRACTS'
      when uos.contract_id is distinct from m.active_ids[1] then 'OCCUPANCY_MISMATCH'
      else 'MATCHED'
    end as match_result
  from m
  left join public.unit_occupancy_status uos on uos.project_id = '${STAYJ}' and uos.unit_id = m.unit_id
)`;
}

if (process.argv[1] && process.argv[1].endsWith("gen-trade-funding-seed.mjs")) {
  const [, , jsonPath, outDir] = process.argv;
  if (!jsonPath || !outDir) { console.error("사용: node gen-trade-funding-seed.mjs <json> <출력 폴더>"); process.exit(2); }
  const all = classify(JSON.parse(fs.readFileSync(jsonPath, "utf8").replace(/^﻿/, "")));
  const counts = all.reduce((acc, r) => { const k = r.type ?? `미저장(${r.label ?? "분류 없음"})`; acc[k] = (acc[k] ?? 0) + 1; return acc; }, {});
  console.log("JSON 세대 레코드:", all.length, counts);
  const seed = all.filter((r) => r.type && r.type !== "UNCONFIRMED");
  const badStatus = seed.filter((r) => r.status && squash(r.status) !== "CANDIDATE");
  if (badStatus.length) { console.error("중단: CANDIDATE가 아닌 상태가 있음", badStatus); process.exit(1); }
  const dup = seed.filter((r, i) => seed.findIndex((x) => x.building === r.building && x.unit === r.unit) !== i);
  if (dup.length) { console.error("중단: 같은 동·호수 후보 중복", dup); process.exit(1); }
  if (!seed.length) { console.error("중단: 저장할 후보(잔금 부족형·대출 활용형·자기자금형)가 없음"); process.exit(1); }
  console.log("저장 대상 후보:", seed.length);
  fs.mkdirSync(outDir, { recursive: true });
  const cte = matchCte(seed);
  fs.writeFileSync(path.join(outDir, "01-dry-run.sql"), `-- [읽기 전용] C·D 거래 자금유형 초기 후보 ${seed.length}세대 매칭 확인. 저장하지 않는다.
-- 판정: MATCHED만 02-apply.sql에서 저장된다. 그 외(NO_UNIT·DUPLICATE_UNIT·NO_ACTIVE_CONTRACT·MULTIPLE_ACTIVE_CONTRACTS·OCCUPANCY_MISMATCH)는 저장하지 않는다.
with ${cte}
-- A11 적용 전에도 실행 가능(새 칸을 읽지 않음)
select seq, building_no || '동 ' || unit_no || '호' as unit, trade_funding_type, match_result, review_grade, legacy_grade as current_grade,
  case when match_result <> 'MATCHED' then null
       when review_grade is not null and review_grade is distinct from legacy_grade then '추출 후 등급 변경(확인 필요)'
       when legacy_grade in ('C', 'D') then 'C·D' else '현재 C·D 아님(분류는 저장, C·D 필터에는 미표시)' end as grade_note
from r
union all
select null, '합계', null, match_result || ' ' || count(*), null, null, null from r group by match_result
order by 1 nulls last, 4;
`);
  fs.writeFileSync(path.join(outDir, "02-apply.sql"), `-- [쓰기] C·D 거래 자금유형 초기 후보 ${seed.length}세대 저장(CANDIDATE). A11(20261020110000) 적용 후, 01 결과 확인 후에만 실행.
-- 현재 ACTIVE 계약이 1건으로 확정된 세대만 저장. 이미 자금유형이 있는 세대는 덮어쓰지 않는다. 등급·납부·계약자·상담은 바꾸지 않는다.
-- 수정자·이력 작성자는 프로젝트의 활성 PROJECT_ADMIN 중 가장 먼저 등록된 멤버(없으면 중단).
begin;

do $preflight$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'unit_occupancy_status' and column_name = 'trade_funding_status') then
    raise exception 'A11(20261020110000) not applied; abort';
  end if;
  if not exists (select 1 from public.project_member where project_id = '${STAYJ}' and role = 'PROJECT_ADMIN' and active) then
    raise exception 'no active PROJECT_ADMIN; abort';
  end if;
  perform set_config('lock_timeout', '5s', true);
end
$preflight$;

create temp table _trade_seed on commit drop as
with ${cte}
select r.*, case when r.match_result = 'MATCHED' and uos.trade_funding_type is not null then 'SKIPPED_EXISTING' else r.match_result end as final_result
from r
left join public.unit_occupancy_status uos on uos.project_id = '${STAYJ}' and uos.unit_id = r.unit_id;

-- 저장 직전 계약 행 잠금(동시 명의변경 방지)
select c.contract_id from public.contract c join _trade_seed s on s.active_ids[1] = c.contract_id
where s.final_result = 'MATCHED' and c.contract_status = 'ACTIVE' for update;

with admin as (
  select id from public.project_member where project_id = '${STAYJ}' and role = 'PROJECT_ADMIN' and active order by created_at, id limit 1
), upd as (
  update public.unit_occupancy_status uos
  set trade_funding_type = s.trade_funding_type, trade_funding_status = 'CANDIDATE',
      trade_funding_updated_by = (select id from admin), trade_funding_updated_at = now()
  from _trade_seed s
  where s.final_result = 'MATCHED'
    and uos.project_id = '${STAYJ}' and uos.unit_id = s.unit_id and uos.contract_id = s.active_ids[1]
    and uos.trade_funding_type is null
  returning uos.unit_id, uos.contract_id, uos.trade_funding_type
)
insert into public.contract_status_history (project_id, contract_id, unit_id, field_changed, previous_value, new_value, reason, contact_id, changed_by, changed_at)
select '${STAYJ}', u.contract_id, u.unit_id, f.field, null, f.value, '${REASON}', null, (select id from admin), now()
from upd u cross join lateral (values ('trade_funding_type', u.trade_funding_type), ('trade_funding_status', 'CANDIDATE')) as f(field, value);

-- 결과(저장 건수 = MATCHED 건수여야 한다)
select seq, building_no || '동 ' || unit_no || '호' as unit, trade_funding_type, final_result, legacy_grade as current_grade from _trade_seed
union all
select null, '합계', null, final_result || ' ' || count(*), null from _trade_seed group by final_result
order by 1 nulls last, 4;

commit;
`);
  console.log("작성:", path.join(outDir, "01-dry-run.sql"), path.join(outDir, "02-apply.sql"));
}
