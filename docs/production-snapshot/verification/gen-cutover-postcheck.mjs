// cutover/04-postcheck-after-migration.sql 생성기: 03(기준선)과 같은 계산을 그대로 감싸 기대값·판정을 붙인다(두 파일 불일치 방지).
// 실행: node docs/production-snapshot/verification/gen-cutover-postcheck.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../cutover");
const base = fs.readFileSync(path.join(dir, "03-baseline-db-state.sql"), "utf8").split("\r\n").join("\n");
const body = base.slice(base.indexOf("with\n") + "with\n".length).trim().replace(/;\s*$/, "");
const split = body.lastIndexOf("\n)\nselect 'env'");
if (split < 0) throw new Error("03 구조가 예상과 다름");
const ctes = body.slice(0, split + 2);
const finalSelect = body.slice(split + 3);

// ABS = 절대 기대값 자동 판정, SAME = 03 결과와 같아야 함(수동 대조), CHANGED = 03과 달라야 함(수동 대조), INFO = 참고
const expected = [
  ["server_version", "", "INFO"], ["checked_at_kst", "", "INFO"],
  ["mig_20261009_absent_separation", "true", "ABS"], ["mig_20261015_cd_focus", "true", "ABS"],
  ["mig_20261017100000_visit_target", "true", "ABS"], ["mig_20261017110000_d_admin_guard", "true", "ABS"],
  ["mig_20261017120000_auto_d", "true", "ABS"],
  ["create_move_in_consultation(17) md5", "03과 다름", "CHANGED"],
  ["create_move_in_consultation(18) md5", "03과 같음", "SAME"],
  ["get_move_in_today_queue md5", "03과 다름", "CHANGED"],
  ["get_move_in_absence_candidates exists", "true", "ABS"], ["record_move_in_visit_result exists", "true", "ABS"],
  ["create_move_in_consultation(17) authenticated EXECUTE", "03과 같음", "SAME"], ["create_move_in_consultation(17) anon EXECUTE", "03과 같음", "SAME"],
  ["create_move_in_consultation(18) authenticated EXECUTE", "03과 같음", "SAME"], ["create_move_in_consultation(18) anon EXECUTE", "03과 같음", "SAME"],
  ["get_move_in_today_queue(2) authenticated EXECUTE", "03과 같음", "SAME"], ["get_move_in_today_queue(2) anon EXECUTE", "03과 같음", "SAME"],
  ["get_move_in_absence_candidates(1) authenticated EXECUTE", "true", "ABS"], ["get_move_in_absence_candidates(1) anon EXECUTE", "false", "ABS"],
  ["record_move_in_visit_result(6) authenticated EXECUTE", "true", "ABS"], ["record_move_in_visit_result(6) anon EXECUTE", "false", "ABS"],
  ["move_in_visit_target exists", "true", "ABS"], ["move_in_visit_target RLS enabled", "true", "ABS"],
  ["move_in_visit_target policies", "1", "ABS"], ["move_in_visit_target authenticated SELECT/INSERT/UPDATE/DELETE", "true/false/false/false", "ABS"],
  ["move_in_visit_target anon SELECT", "false", "ABS"],
  ["stayj active units", "03과 같음", "SAME"], ["stayj grade A/B/C/D/부재/상담거절/미등록", "03과 같음", "SAME"],
  ["consultation total (all projects)", "03과 같음", "SAME"], ["consultation stayj", "03과 같음", "SAME"],
  ["contract_status_history total", "03과 같음", "SAME"], ["contract_status_history legacy_grade", "03과 같음", "SAME"],
  ["move_in_tracking_disposition total", "03과 같음", "SAME"], ["move_in_visit_target rows", "0", "ABS"],
];
const values = expected.map(([i, e, m]) => `    (${sqlText(i)}, ${sqlText(e)}, '${m}')`).join(",\n");
function sqlText(s) { return `'${s.replace(/'/g, "''")}'`; }

const out = `-- [전환 당일 04] 신규 SQL 적용 직후 검증: 함수·권한·등급 분포·상담 건수 — 읽기 전용(단일 SELECT)
-- 생성: docs/production-snapshot/verification/gen-cutover-postcheck.mjs (03과 같은 계산, 직접 수정하지 말 것)
-- verdict: PASS/FAIL = 자동 판정, SAME = 03 결과와 같아야 함, CHANGED = 03과 달라야 함(수동 대조), INFO = 참고
-- FAIL 이 1건이라도 있거나 SAME/CHANGED 대조가 어긋나면 신규 코드 승격을 중단하고 런북의 중단 조건을 따른다.
-- 마이그레이션은 데이터를 바꾸지 않으므로 등급 분포·상담 건수는 03과 같아야 한다(상담 저장 중지 상태 전제).
with
${ctes},
state(section, item, value) as (
${finalSelect.split("\n").map(l => "  " + l).join("\n")}
),
expected(item, expected, mode) as (values
${values}
)
select s.section, s.item, s.value, e.expected,
  case when e.mode is null then 'UNCHECKED'
       when e.mode = 'ABS' then case when s.value = e.expected then 'PASS' else 'FAIL' end
       else e.mode end as verdict
from state s left join expected e on e.item = s.item
union all
select 'summary', 'ABS 항목 FAIL 수', count(*)::text, '0',
  case when count(*) = 0 then 'PASS' else 'FAIL' end
from state s join expected e on e.item = s.item where e.mode = 'ABS' and s.value is distinct from e.expected
union all
select 'summary', '누락 항목(기대값 있는데 결과 없음)', count(*)::text, '0', case when count(*) = 0 then 'PASS' else 'FAIL' end
from expected e where not exists (select 1 from state s where s.item = e.item);
`;
fs.writeFileSync(path.join(dir, "04-postcheck-after-migration.sql"), out);
console.log("wrote 04-postcheck-after-migration.sql");
