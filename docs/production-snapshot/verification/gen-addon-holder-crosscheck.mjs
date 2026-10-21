// 발코니·옵션 계약자 대조 SQL 생성기: ledger-finance-data.server.ts의 동·호·계약자 해시·전매 표시만 가져온다.
// 출력 SQL에는 계약자명 해시가 들어가므로 .gitignore 대상(cutover/08-addon-holder-crosscheck.sql)으로만 쓴다.
// 실행: node docs/production-snapshot/verification/gen-addon-holder-crosscheck.mjs
import fs from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const srcPath = path.join(root, "src/lib/move-in/ledger-finance-data.server.ts");
const outPath = path.join(root, "docs/production-snapshot/cutover/08-addon-holder-crosscheck.sql");
const src = fs.readFileSync(srcPath, "utf8");
// 생성기가 쓴 JSON 리터럴: MANIFEST는 "} as const;", SOURCE는 파일 끝 "};"로 끝난다
const literal = (marker, end) => {
  const start = src.indexOf("{", src.indexOf(marker));
  return JSON.parse(src.slice(start, end(start) + 1));
};
const manifest = literal("export const LEDGER_FINANCE_MANIFEST", (s) => src.indexOf("} as const;", s));
const source = literal("export const LEDGER_FINANCE_SOURCE", () => src.lastIndexOf("};"));

const rows = [];
for (const [key, entry] of Object.entries(source)) {
  if (!/^\d+-\d+$/.test(key)) throw new Error("동·호 키 형식 오류");
  for (const [part, addon] of [["BALCONY", entry.balcony], ["OPTION", entry.option]]) {
    if (!addon) continue;
    if (!/^[0-9a-f]{24}$/.test(addon.holderHash) || typeof addon.transferred !== "boolean") throw new Error("해시·전매 표시 형식 오류");
    rows.push(`('${key}','${part}','${addon.holderHash}',${addon.transferred})`);
  }
}
const count = (part) => rows.filter(r => r.includes(`'${part}'`)).length;
if (count("BALCONY") !== manifest.balconyUnitCount || count("OPTION") !== manifest.optionUnitCount) {
  throw new Error(`세대 수가 MANIFEST와 다름: ${count("BALCONY")}/${count("OPTION")}`);
}
const sha = createHash("sha256").update(src).digest("hex").slice(0, 16);
const P = "1283e198-5043-4027-96d6-edcc7a6686c6";

const sql = `-- Stay J 발코니·옵션 계약자 대조 — 운영 집계 (Supabase SQL Editor용, 단일 SELECT, 쓰기 문 없음)
-- 대상 프로젝트: ${P}
-- 생성: docs/production-snapshot/verification/gen-addon-holder-crosscheck.mjs (ledger-finance-data.server.ts sha256 앞 16자리 ${sha})
-- 원천: 발코니 ${manifest.balconyAsOf} ${manifest.balconyUnitCount}세대, 옵션 ${manifest.optionAsOf} ${manifest.optionUnitCount}세대
-- 이 파일에는 계약자명 SHA-256 앞 24자리가 들어 있다(원문 없음). Git에 올리지 않는다(.gitignore 대상).
-- 출력은 세대 수만. 계약자명·계좌번호·전화번호·세대 식별자는 출력하지 않는다.
-- 판정 순서는 src/lib/move-in/ledger-finance.server.ts(addonPart)와 같다:
--  1) 확인불가: 동·호 숫자 형식 아님 / 원천 자료 없음 / 현재 ACTIVE 계약 1건 아님
--  2) 불일치: 같은 세대에 현재 계약 외 계약이 있음(계약 변경 이력) → 자동 연결 안 함
--  3) 확인불가: 현재 계약자명 없음
--  4) 불일치: 원천 전매 표시 / 계약자명 해시 다름 → 자동 연결 안 함
--  5) 일치: 위에 해당 없음 → 화면에 금액 연결
-- 계약자명 비교 = sha256(NFKC 정규화, 공백 제거) 앞 24자리. 보이지 않는 특수 공백이 남은 이름은 불일치로 잡힐 수 있다(안전한 방향).
-- 확인: part별 '소계' 3행의 합 = '대상 세대' 값. 원천에만 있는 동·호는 INFO로 따로 센다.
with
src(k, part, holder_hash, transferred) as (values
${rows.join(",\n")}
),
units as (
  select pu.unit_id,
    case when pu.building_no ~ '^[0-9]+$' and pu.unit_no ~ '^[0-9]+$'
      then (pu.building_no::numeric)::text || '-' || (pu.unit_no::numeric)::text end as k
  from public.project_unit pu
  where pu.project_id = '${P}'
),
contracts as (
  select c.unit_id,
    count(*) as all_n,
    count(*) filter (where c.contract_status = 'ACTIVE'::public.contract_status) as active_n,
    max(cu.name) filter (where c.contract_status = 'ACTIVE'::public.contract_status) as active_name
  from public.contract c
  left join public.customer cu on cu.id = c.customer_id and cu.project_id = c.project_id
  where c.project_id = '${P}'
  group by c.unit_id
),
parts(part, label) as (values ('BALCONY', '발코니'), ('OPTION', '옵션')),
judged as (
  select p.label as part, u.unit_id,
    case
      when u.k is null then array['확인불가', '동·호 형식 확인불가']
      when s.k is null then array['확인불가', '원천 자료 없음']
      when coalesce(c.active_n, 0) <> 1 then array['확인불가', '현재 ACTIVE 계약 1건 아님']
      when c.all_n > 1 then array['불일치', '계약 변경 이력']
      when nullif(btrim(c.active_name), '') is null then array['확인불가', '현재 계약자명 없음']
      when s.transferred then array['불일치', '원천 전매 표시']
      when left(encode(sha256(convert_to(regexp_replace(normalize(c.active_name, NFKC), '\\s+', '', 'g'), 'UTF8')), 'hex'), 24) <> s.holder_hash
        then array['불일치', '계약자 다름']
      else array['일치', '현재 계약자 일치']
    end as v
  from units u
  cross join parts p
  left join src s on s.k = u.k and s.part = p.part
  left join contracts c on c.unit_id = u.unit_id
),
summary as (
  select part, v[1] as verdict, v[2] as reason, count(*) as units from judged group by part, v[1], v[2]
  union all
  select part, v[1], '소계', count(*) from judged group by part, v[1]
  union all
  select part, '대상 세대', '프로젝트 전체 세대', count(*) from judged group by part
  union all
  select p.label, 'INFO', '원천에만 있는 동·호(프로젝트 세대 없음)', count(*)
  from src s join parts p on p.part = s.part
  where not exists (select 1 from units u where u.k = s.k)
  group by p.label
)
select part, verdict, reason, units
from summary
order by part,
  case verdict when '대상 세대' then 0 when '일치' then 1 when '불일치' then 2 when '확인불가' then 3 else 4 end,
  case reason when '소계' then 0 else 1 end, reason;
`;
fs.writeFileSync(outPath, sql, "utf8");
console.log(`OK ${path.relative(root, outPath)} 발코니 ${count("BALCONY")} · 옵션 ${count("OPTION")} 행, 원천 sha16 ${sha}`);
