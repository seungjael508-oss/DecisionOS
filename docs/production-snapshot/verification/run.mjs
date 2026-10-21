// 장기 부재 D등급 전환·방문상담 마이그레이션 검증(PGlite, 축소 스텁 스키마)
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";

const ROOT = "C:/Users/PC-1/DecisionOS-dev/supabase/";
const read = (p) => fs.readFileSync(ROOT + p, "utf8");
const stripPreflight = (sql) => sql.replace(/do \$preflight\$[\s\S]*?\$preflight\$;/, "");

const db = new PGlite();
let pass = 0, fail = 0;
const results = [];
function check(name, cond, detail) {
  if (cond) { pass++; results.push(`ok   ${name}`); }
  else { fail++; results.push(`FAIL ${name}${detail === undefined ? "" : " :: " + JSON.stringify(detail)}`); }
}
const q = async (sql, params) => (await db.query(sql, params)).rows;
const one = async (sql, params) => (await q(sql, params))[0];
async function as(userId, fn) {
  await db.exec("begin");
  await db.query("select set_config('request.jwt.claim.sub', $1, true)", [userId]);
  await db.exec("set local role authenticated");
  try { const r = await fn(); await db.exec("commit"); return { ok: true, r }; }
  catch (e) { await db.exec("rollback"); return { ok: false, error: e.message }; }
}

// ---------- schema ----------
await db.exec(fs.readFileSync(new URL("./stub-schema.sql", import.meta.url), "utf8"));
// 18인자(계약 경합 방어) 래퍼: 운영과 같이 기대 계약 확인 후 17인자 호출
const m09 = read("migrations/20261009100000_absent_contact_separation.sql");
await db.exec(stripPreflight(m09)); // 운영 md5 사전점검은 스텁에서 의미 없으므로 제외
await db.exec(`
create function public.create_move_in_consultation(p_project_id uuid, p_unit_id uuid, p_customer_id uuid, p_consultation_type text, p_content text, p_expected_contract_id uuid,
  p_legacy_grade text, p_next_contact_at timestamptz, p_occupancy_intent public.occupancy_intent, p_funding_status public.funding_status,
  p_move_in_status public.move_in_status, p_planned_move_in_date date, p_balance_paid_at timestamptz, p_actual_move_in_date timestamptz,
  p_reason text, p_business_purpose text, p_clear_next_contact_at boolean, p_operational_intent public.operational_intent)
returns uuid language plpgsql security definer set search_path to '' as $$
begin
  if not exists (select 1 from public.contract c where c.project_id = p_project_id and c.unit_id = p_unit_id
     and c.contract_id = p_expected_contract_id and c.customer_id = p_customer_id and c.contract_status = 'ACTIVE') then
    raise exception 'expected contract mismatch' using errcode = '40001'; end if;
  return public.create_move_in_consultation(p_project_id, p_unit_id, p_customer_id, p_consultation_type, p_content,
    p_legacy_grade, p_next_contact_at, p_occupancy_intent, p_funding_status, p_move_in_status, p_planned_move_in_date,
    p_balance_paid_at, p_actual_move_in_date, p_reason, p_business_purpose, p_clear_next_contact_at, p_operational_intent);
end $$;
grant execute on all functions in schema public to authenticated;`);
await db.exec(read("migrations/20261015100000_today_queue_cd_focus.sql"));
await db.exec(read("migrations/20261017100000_absence_streak_visit_target.sql"));
await db.exec(read("migrations/20261017110000_consultation_d_grade_admin_guard.sql"));
await db.exec(read("migrations/20261017120000_absence_auto_d_grade.sql"));
check("마이그레이션(사전점검 포함) 적용", true);

// ---------- fixtures ----------
const P = "10000000-0000-4000-8000-000000000001", P2 = "10000000-0000-4000-8000-000000000002";
const ADMIN_U = "30000000-0000-4000-8000-0000000000a1", ADMIN_M = "40000000-0000-4000-8000-0000000000a1";
const COUN_U = "30000000-0000-4000-8000-0000000000c1", COUN_M = "40000000-0000-4000-8000-0000000000c1";
const OTHER_U = "30000000-0000-4000-8000-0000000000f1", OTHER_M = "40000000-0000-4000-8000-0000000000f1";
await db.exec(`
insert into public.project values ('${P}','P'),('${P2}','P2');
insert into public.project_member values
 ('${ADMIN_M}','${P}','${ADMIN_U}','PROJECT_ADMIN',true),
 ('${COUN_M}','${P}','${COUN_U}','COUNSELOR',true),
 ('${OTHER_M}','${P2}','${OTHER_U}','PROJECT_ADMIN',true);
insert into public.move_in_tracking_policy(project_id, reason_code, stale_after) values
 ('${P}','D_GRADE_STALE','7 days'),('${P}','C_GRADE_STALE','14 days'),('${P}','ABSENCE_RETRY','21 days');`);

const U = (n) => `8f000000-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`;
const C = (n) => `50000000-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`;
async function unit(n, grade, { project = P, customer = C(n), intent = "UNDECIDED", lastContactDaysAgo = null } = {}) {
  await q(`insert into public.project_unit values ($1,$2,'101',$3)`, [U(n), project, String(n)]);
  await q(`insert into public.customer values ($1,$2,$3,$4)`, [customer, project, `고객${n}`, COUN_M]);
  const k = await one(`insert into public.contract(project_id, unit_id, customer_id) values ($1,$2,$3) returning contract_id`, [project, U(n), customer]);
  await q(`insert into public.unit_occupancy_status(project_id, unit_id, contract_id, legacy_grade, occupancy_intent, last_contact_at)
           values ($1,$2,$3,$4,$5, case when $6::int is null then null else now() - make_interval(days => $6::int) end)`,
    [project, U(n), k.contract_id, grade, intent, lastContactDaysAgo]);
  return k.contract_id;
}
// 상담 기록 직접 생성(과거 시각). kind: 'ABSENT_CALL' | 'ABSENT_VISIT' | grade(A..D, 상담거절)
async function log(n, daysAgo, kind, { customer = C(n), project = P } = {}) {
  const absent = kind.startsWith("ABSENT");
  const contact = kind === "ABSENT_VISIT" ? "VISIT" : "CALL";
  await q(`insert into public.consultation(project_id, customer_id, counselor_id, consulted_at, content, created_by, unit_id, contact_type, stage, structured_tags)
           values ($1,$2,$3, now() - make_interval(secs => $4::float8 * 86400), 'synthetic', $3, $5, $6, 'MOVE_IN', $7::jsonb)`,
    [project, customer, COUN_M, daysAgo, U(n), contact, JSON.stringify({ legacy_grade: absent ? "부재" : kind })]);
}

// u1 B: 실제 접촉 10일 전 → 전화 부재 3회 → 후보(B→D)
const k1 = await unit(1, "B", { lastContactDaysAgo: 10 });
await log(1, 10, "B"); await log(1, 6, "ABSENT_CALL"); await log(1, 4, "ABSENT_CALL"); await log(1, 2, "ABSENT_CALL");
// u2 C: 부재 3회 후 상담 성공 → 초기화
await unit(2, "C", { lastContactDaysAgo: 1 });
await log(2, 9, "ABSENT_CALL"); await log(2, 8, "ABSENT_CALL"); await log(2, 7, "ABSENT_CALL"); await log(2, 1, "C");
// u3 A: 전화 부재 2 + 방문 부재 1 → 2회(전화만 인정)
await unit(3, "A");
await log(3, 5, "ABSENT_CALL"); await log(3, 4, "ABSENT_VISIT"); await log(3, 3, "ABSENT_CALL");
// u4: 이전 계약자 부재 5회, 명의변경 후 현재 계약자 부재 1회 → 제외
const prevCust = "50000000-0000-4000-8000-0000000000e4";
await q(`insert into public.project_unit values ($1,$2,'101','4')`, [U(4), P]);
await q(`insert into public.customer values ($1,$2,'이전',$3),($4,$2,'현재',$3)`, [prevCust, P, COUN_M, C(4)]);
const oldK4 = (await one(`insert into public.contract(project_id, unit_id, customer_id, contract_status) values ($1,$2,$3,'CANCELLED') returning contract_id`, [P, U(4), prevCust])).contract_id;
const k4 = (await one(`insert into public.contract(project_id, unit_id, customer_id) values ($1,$2,$3) returning contract_id`, [P, U(4), C(4)])).contract_id;
await q(`insert into public.unit_occupancy_status(project_id, unit_id, contract_id, legacy_grade) values ($1,$2,$3,'B')`, [P, U(4), k4]);
for (const d of [20, 19, 18, 17, 16]) await log(4, d, "ABSENT_CALL", { customer: prevCust });
await log(4, 1, "ABSENT_CALL");
// u5 D: 부재 4회 → 후보지만 이미 D
await unit(5, "D");
for (const d of [8, 6, 4, 2]) await log(5, d, "ABSENT_CALL");
// u6 등급 미등록: 부재 3회 → 후보(미등록→D)
await unit(6, null);
for (const d of [5, 4, 3]) await log(6, d, "ABSENT_CALL");
// u7 C: 부재 3회지만 추적 제외 세대
const k7 = await unit(7, "C");
for (const d of [5, 4, 3]) await log(7, d, "ABSENT_CALL");
await q(`insert into public.move_in_tracking_exclusion values ($1,$2,$3,true)`, [P, U(7), k7]);
// u8 B + 매도 의향, 부재 없음 → 오늘 관리대상 아님(C·D 기준 유지)
await unit(8, "B", { intent: "SALE" });
// u9 A: 실제 접촉과 같은 시각 부재 1 + 이후 부재 2 → 2회(동시각은 실제 접촉 우선)
await unit(9, "A");
await q(`insert into public.consultation(project_id, customer_id, counselor_id, consulted_at, content, created_by, unit_id, contact_type, stage, structured_tags)
  values ($1,$2,$3,'2026-10-01T00:00:00Z','x',$3,$4,'CALL','MOVE_IN','{"legacy_grade":"A"}'),
         ($1,$2,$3,'2026-10-01T00:00:00Z','x',$3,$4,'CALL','MOVE_IN','{"legacy_grade":"부재"}')`, [P, C(9), COUN_M, U(9)]);
await log(9, 2, "ABSENT_CALL"); await log(9, 1, "ABSENT_CALL");
// u10 C: 상담거절(응답) 이후 부재 3회 → 후보(C→D). 상담거절은 실제 접촉으로 초기화
await unit(10, "C");
await log(10, 9, "ABSENT_CALL"); await log(10, 8, "상담거절"); await log(10, 3, "ABSENT_CALL"); await log(10, 2, "ABSENT_CALL"); await log(10, 1, "ABSENT_CALL");
// P2 세대(타 프로젝트)
const k20 = await unit(20, "B", { project: P2 });
for (const d of [5, 4, 3]) await log(20, d, "ABSENT_CALL", { project: P2 });

// ---------- 1. 후보 산출 ----------
const cand = await q(`select * from public.get_move_in_absence_candidates($1)`, [P]);
const byUnit = new Map(cand.map((r) => [r.unit_id, r]));
check("후보 세대 = u1,u5,u6,u10", [...byUnit.keys()].sort().join() === [U(1), U(5), U(6), U(10)].sort().join(), [...byUnit.keys()]);
check("u1 연속 부재 3", byUnit.get(U(1))?.absence_streak === 3);
check("u5 연속 부재 4", byUnit.get(U(5))?.absence_streak === 4);
check("u2 상담 성공 후 초기화(후보 아님)", !byUnit.has(U(2)));
check("u3 방문 부재는 전화 부재로 미인정", !byUnit.has(U(3)));
check("u4 이전 계약자 부재 제외", !byUnit.has(U(4)));
check("u7 추적 제외 세대 미포함", !byUnit.has(U(7)));
check("u9 동시각 부재는 실제 접촉 우선", !byUnit.has(U(9)));
check("u10 상담거절 이후 부재만 집계", byUnit.get(U(10))?.absence_streak === 3);
const u1 = byUnit.get(U(1));
check("u1 기존 등급 B 표시", u1?.legacy_grade === "B");
check("u1 최근시도일 = 마지막 부재", Math.abs(Date.now() - 2 * 86400e3 - new Date(u1.latest_attempt_at).getTime()) < 60e3);
check("u1 최종접촉일 = 실제 접촉(10일 전)", Math.abs(Date.now() - 10 * 86400e3 - new Date(u1.last_contact_at).getTime()) < 86400e3);
check("u6 최종접촉일 없음", byUnit.get(U(6))?.last_contact_at === null);
const abcCount = cand.filter((r) => ["A", "B", "C"].includes(r.legacy_grade)).length;
const alreadyD = cand.filter((r) => r.legacy_grade === "D").length;
check("A·B·C → D 변경 후보 2(u1 B, u10 C)", abcCount === 2, abcCount);
check("이미 D 1(u5)", alreadyD === 1);

// 진단 문서 쿼리와 함수 결과 대조
{
  const doc = fs.readFileSync("C:/Users/PC-1/DecisionOS-dev/docs/production-snapshot/absence-streak-diagnostic.md", "utf8");
  const sql = doc.split("```sql")[1].split("```")[0].replace(/<project_id>/g, P).replace(/^begin read only;|commit;s*$/gm, "");
  const d = (await q(sql))[0];
  check("진단 쿼리 = 함수(3회+ 4, ABC 2, D 1, 기타 1)", Number(d.streak_3_plus) === cand.length && Number(d.abc_to_d_candidates) === abcCount
    && Number(d.already_d) === alreadyD && Number(d.other_to_d_candidates) === 1, d);
}
// 진단 문서 2·3번 쿼리 실행 검증(읽기 전용 트랜잭션 그대로)
{
  const doc = fs.readFileSync("C:/Users/PC-1/DecisionOS-dev/docs/production-snapshot/absence-streak-diagnostic.md", "utf8");
  const blocks = doc.split("```sql").slice(1).map((b) => b.split("```")[0].replace(/<project_id>/g, P));
  const q1 = blocks[0];
  const byGradeSql = q1.slice(0, q1.lastIndexOf("select\n  count(*)")) + blocks[1].trim().replace(/;$/, "") + ";\ncommit;";
  const res = await db.exec(byGradeSql);
  const rowsG = res.find((x) => x.rows.length)?.rows ?? [];
  const tot = Object.fromEntries(rowsG.map((x) => [x.grade, Number(x.total)]));
  check("진단 2번(등급별): B1·C1·D1·미등록1", tot.B === 1 && tot.C === 1 && tot.D === 1 && tot["미등록"] === 1, rowsG);
  const cat = await db.exec(blocks[2]);
  const fnRows = cat.find((x) => x.fields.some((f) => f.name === "prosecdef"))?.rows ?? [];
  const names = fnRows.map((x) => x.proname + "/" + x.pronargs).sort();
  check("진단 3-1: D를 쓸 수 있는 함수 = 상담 저장(17)만", JSON.stringify(names) === JSON.stringify(["create_move_in_consultation/17"]), names);
  const priv = cat.find((x) => x.fields.some((f) => f.name === "table_update"))?.rows[0];
  check("진단 3-2 실행(스텁: 직접 UPDATE 권한 없음)", priv && priv.table_update === false && priv.legacy_grade_update === false, priv);
  let denied = false;
  try { await db.exec("begin read only; update public.unit_occupancy_status set legacy_grade = 'D'; commit;"); } catch (e) { denied = /read-only/.test(e.message); await db.exec("rollback"); }
  check("읽기 전용 트랜잭션은 UPDATE 거부", denied);
}
// ---------- 2. 오늘 관리대상(승인 전) ----------
let queue = await q(`select * from public.get_move_in_today_queue($1, now())`, [P]);
let qu = new Map(queue.map((r) => [r.unit_id, r]));
check("세대당 1행", queue.length === qu.size);
check("u1(B) 장기 부재로 표시", qu.get(U(1))?.reason_codes.includes("ABSENCE_STREAK"));
check("u1 우선순위 HIGH", qu.get(U(1))?.priority === "HIGH");
check("u1(B)에는 C·D 전용 사유 없음", qu.get(U(1))?.reason_codes.length === 1, qu.get(U(1))?.reason_codes);
check("u6(미등록) 장기 부재로 표시", qu.get(U(6))?.reason_codes.join() === "ABSENCE_STREAK");
check("u3(A, 2회) 미표시", !qu.has(U(3)));
check("u8(B 매도) 미표시 — C·D 기준 유지", !qu.has(U(8)));
check("u7 추적 제외 미표시", !qu.has(U(7)));
check("u2(C) 기존 C 재접촉 기준 유지", !qu.has(U(2)) || !qu.get(U(2)).reason_codes.includes("ABSENCE_STREAK"));
check("장기 부재 세대가 C·D 재접촉보다 앞", queue.findIndex((r) => r.reason_codes.includes("ABSENCE_STREAK")) === 0);

// ---------- 3. 권한·IDOR / 일괄 변경 없음 ----------
let r;
const k2 = (await one(`select contract_id from public.contract where unit_id=$1`, [U(2)])).contract_id;
check("승인 함수 제거됨", (await one(`select count(*)::int n from pg_proc where proname='approve_move_in_absence_d_grade'`)).n === 0);
check("과거 부재 3회(u1)만으로 등급 미변경(B)", (await one(`select legacy_grade from public.unit_occupancy_status where unit_id=$1`, [U(1)])).legacy_grade === "B");
check("과거 기록만으로 이력·방문대상 미생성", (await one(`select count(*)::int n from public.contract_status_history`)).n === 0
  && (await one(`select count(*)::int n from public.move_in_visit_target`)).n === 0);
r = await as(ADMIN_U, () => q(`insert into public.move_in_visit_target(project_id,unit_id,contract_id,customer_id,absence_streak_at_open,created_by) values ($1,$2,$3,$4,3,$5)`, [P, U(1), k1, C(1), ADMIN_M]));
check("방문대상 테이블 직접 쓰기 불가", !r.ok && /permission denied/.test(r.error), r);
r = await as(OTHER_U, () => one(`select public.create_move_in_consultation(p_project_id:=$1,p_unit_id:=$2,p_customer_id:=$3,p_consultation_type:='OUTBOUND',p_content:='x',p_legacy_grade:='부재') as id`, [P, U(1), C(1)]));
check("타 프로젝트 사용자 부재 저장 거부", !r.ok, r);
r = await as(COUN_U, () => one(`select public.create_move_in_consultation(p_project_id:=$1,p_unit_id:=$2,p_customer_id:=$3,p_consultation_type:='OUTBOUND',p_content:='x',p_legacy_grade:='부재') as id`, [P, U(4), prevCust]));
check("이전 계약자 식별자로 부재 저장 거부(현재 계약자 검증)", !r.ok && /active contract not found/.test(r.error), r);
check("거부된 시도 후 u1 B·이력 없음", (await one(`select legacy_grade from public.unit_occupancy_status where unit_id=$1`, [U(1)])).legacy_grade === "B"
  && (await one(`select count(*)::int n from public.contract_status_history`)).n === 0);

// ---------- 4. 신규 부재 저장 → 자동 전환(과거 기록 포함) ----------
r = await as(COUN_U, () => one(`select public.create_move_in_consultation(p_project_id:=$1,p_unit_id:=$2,p_customer_id:=$3,p_consultation_type:='OUTBOUND',p_content:='x',p_legacy_grade:='부재') as id`, [P, U(1), C(1)]));
check("u1 신규 부재 저장(과거 3 + 신규 1)", r.ok, r);
const uos1 = await one(`select legacy_grade, legacy_grade_as_of from public.unit_occupancy_status where unit_id=$1`, [U(1)]);
check("u1 자동 D", uos1.legacy_grade === "D" && uos1.legacy_grade_as_of !== null);
const h1 = await q(`select * from public.contract_status_history where unit_id=$1`, [U(1)]);
check("변경 이력 1건(B→D, 사유·저장 상담사·근거 상담)", h1.length === 1 && h1[0].field_changed === "legacy_grade" && h1[0].previous_value === "B"
  && h1[0].new_value === "D" && h1[0].changed_by === COUN_M && h1[0].reason === "장기 부재중(연속 3회)" && h1[0].contact_id === r.r.id, h1);
const vt1 = await q(`select * from public.move_in_visit_target where unit_id=$1`, [U(1)]);
check("방문대상 1건(방문 필요, 기존 등급 B 보존, 연속 4)", vt1.length === 1 && vt1[0].status === "VISIT_NEEDED" && vt1[0].grade_before === "B" && vt1[0].absence_streak_at_open === 4, vt1);
r = await as(COUN_U, () => one(`select public.create_move_in_consultation(p_project_id:=$1,p_unit_id:=$2,p_customer_id:=$3,p_consultation_type:='OUTBOUND',p_content:='x',p_legacy_grade:='부재') as id`, [P, U(1), C(1)]));
check("재저장 후 이력 1건·방문대상 1건 유지(중복 없음)", r.ok && (await one(`select count(*)::int n from public.contract_status_history where unit_id=$1`, [U(1)])).n === 1
  && (await one(`select count(*)::int n from public.move_in_visit_target where unit_id=$1`, [U(1)])).n === 1);
// 재저장으로 u1 연속 부재가 5가 되므로 이후 '연속 3 유지' 검사를 위해 이번 재저장 기록은 지운다
await q(`delete from public.consultation where id=$1`, [r.r.id]);

r = await as(COUN_U, () => one(`select public.create_move_in_consultation(p_project_id:=$1,p_unit_id:=$2,p_customer_id:=$3,p_consultation_type:='OUTBOUND',p_content:='x',p_legacy_grade:='부재') as id`, [P, U(5), C(5)]));
check("이미 D(u5): 등급 미변경 + 방문대상만 생성", r.ok && (await one(`select legacy_grade from public.unit_occupancy_status where unit_id=$1`, [U(5)])).legacy_grade === "D"
  && (await one(`select grade_changed from public.move_in_visit_target where unit_id=$1`, [U(5)])).grade_changed === false, r);
check("u5 이력 없음", (await one(`select count(*)::int n from public.contract_status_history where unit_id=$1`, [U(5)])).n === 0);

// ---------- 5. 방문 결과 ----------
const vt1Id = vt1[0].visit_target_id;
r = await as(COUN_U, () => one(`select public.record_move_in_visit_result($1,$2,$3,'VISITED','방문',null) as id`, [P, vt1Id, k1]));
check("방문 완료는 의향 필수", !r.ok && /intent is required/.test(r.error), r);
r = await as(COUN_U, () => one(`select public.record_move_in_visit_result($1,$2,$3,'REVISIT_NEEDED','방문',$4::public.occupancy_intent) as id`, [P, vt1Id, k1, "SALE"]));
check("재방문 필요에 의향 기록 거부", !r.ok, r);
r = await as(COUN_U, () => one(`select public.record_move_in_visit_result($1,$2,$3,'VISITED','방문',$4::public.occupancy_intent) as id`, [P, vt1Id, oldK4, "SALE"]));
check("다른 계약 식별자로 방문 결과 거부", !r.ok && /contract mismatch/.test(r.error), r);
r = await as(OTHER_U, () => one(`select public.record_move_in_visit_result($1,$2,$3,'VISITED','방문',$4::public.occupancy_intent) as id`, [P, vt1Id, k1, "SALE"]));
check("타 프로젝트 사용자 방문 결과 거부", !r.ok, r);
r = await as(OTHER_U, () => one(`select public.record_move_in_visit_result($1,$2,$3,'VISITED','방문',$4::public.occupancy_intent) as id`, [P2, vt1Id, k1, "SALE"]));
check("프로젝트 바꿔치기로 방문 결과 거부", !r.ok && /not found/.test(r.error), r);

const lastBefore = (await one(`select last_contact_at from public.unit_occupancy_status where unit_id=$1`, [U(1)])).last_contact_at;
r = await as(COUN_U, () => one(`select public.record_move_in_visit_result($1,$2,$3,'REVISIT_NEEDED','방문했으나 부재',null) as id`, [P, vt1Id, k1]));
check("재방문 필요 저장", r.ok, r);
const after1 = await one(`select legacy_grade, last_contact_at from public.unit_occupancy_status where unit_id=$1`, [U(1)]);
check("재방문 필요: 기본등급 D 유지", after1.legacy_grade === "D");
check("재방문 필요: 최종 접촉일 미갱신", String(after1.last_contact_at) === String(lastBefore));
check("재방문 필요: 방문 부재 상담 1건(VISIT·부재)", (await one(`select count(*)::int n from public.consultation where unit_id=$1 and contact_type='VISIT' and structured_tags->>'legacy_grade'='부재'`, [U(1)])).n === 1);
check("재방문 필요: 연속 전화 부재 4 유지(방문 부재 미산입)", (await one(`select absence_streak from public.get_move_in_absence_candidates($1) where unit_id=$2`, [P, U(1)]))?.absence_streak === 4);
queue = await q(`select * from public.get_move_in_today_queue($1, now())`, [P]); qu = new Map(queue.map((x) => [x.unit_id, x]));
check("오늘 관리대상: u1 장기 부재 + 재방문 필요 + D 재접촉", ["ABSENCE_STREAK", "D_GRADE_STALE", "REVISIT_NEEDED"].every((c) => qu.get(U(1))?.reason_codes.includes(c)) && !qu.get(U(1))?.reason_codes.includes("VISIT_NEEDED"), qu.get(U(1))?.reason_codes);
check("오늘 관리대상: u5 방문상담 필요", qu.get(U(5))?.reason_codes.includes("VISIT_NEEDED"));

r = await as(COUN_U, () => one(`select public.record_move_in_visit_result($1,$2,$3,'VISITED','전세 예정 확인',$4::public.occupancy_intent) as id`, [P, vt1Id, k1, "JEONSE"]));
check("방문 완료 저장", r.ok, r);
const after2 = await one(`select legacy_grade, occupancy_intent, last_contact_at from public.unit_occupancy_status where unit_id=$1`, [U(1)]);
check("방문 완료: 기본등급 D 유지(결과와 등급 분리)", after2.legacy_grade === "D");
check("방문 완료: 의향 JEONSE 반영", after2.occupancy_intent === "JEONSE");
check("방문 완료: 최종 접촉일 갱신", new Date(after2.last_contact_at) > new Date(lastBefore));
const vtDone = await one(`select * from public.move_in_visit_target where visit_target_id=$1`, [vt1Id]);
check("방문대상 상태 VISITED, 방문 2회, 의향 보관", vtDone.status === "VISITED" && vtDone.visit_count === 2 && vtDone.visit_intent === "JEONSE");
check("방문 완료: 연속 부재 초기화(후보 해제)", !(await q(`select 1 from public.get_move_in_absence_candidates($1) where unit_id=$2`, [P, U(1)])).length);
queue = await q(`select * from public.get_move_in_today_queue($1, now())`, [P]); qu = new Map(queue.map((x) => [x.unit_id, x]));
check("오늘 관리대상: u1 방문 완료 표시, 장기 부재 해제", qu.get(U(1))?.reason_codes.includes("VISIT_DONE") && !qu.get(U(1))?.reason_codes.includes("ABSENCE_STREAK"), qu.get(U(1))?.reason_codes);
const tomorrow = await q(`select * from public.get_move_in_today_queue($1, now() + interval '1 day')`, [P]);
check("다음 날 방문 완료 사유 해제", !tomorrow.find((x) => x.unit_id === U(1))?.reason_codes.includes("VISIT_DONE"));
r = await as(COUN_U, () => one(`select public.record_move_in_visit_result($1,$2,$3,'VISITED','다시',$4::public.occupancy_intent) as id`, [P, vt1Id, k1, "SALE"]));
check("완료된 방문대상 재저장 거부", !r.ok && /closed/.test(r.error), r);

// ---------- 6. RLS ----------
r = await as(ADMIN_U, () => q(`select * from public.move_in_visit_target`));
check("관리자: 자기 프로젝트 방문대상 조회", r.ok && r.r.length === 2, r);
r = await as(OTHER_U, () => q(`select * from public.move_in_visit_target`));
check("타 프로젝트 사용자: 방문대상 0건", r.ok && r.r.length === 0, r);
// 명의변경: 이전 계약의 방문대상은 새 계약에서 보이지 않음
const newCust = "50000000-0000-4000-8000-0000000000e5";
await q(`insert into public.customer values ($1,$2,'신규',$3)`, [newCust, P, COUN_M]);
const k5 = (await one(`select contract_id from public.contract where unit_id=$1`, [U(5)])).contract_id;
await q(`update public.contract set contract_status='CANCELLED' where contract_id=$1`, [k5]);
const k5b = (await one(`insert into public.contract(project_id, unit_id, customer_id) values ($1,$2,$3) returning contract_id`, [P, U(5), newCust])).contract_id;
await q(`update public.unit_occupancy_status set contract_id=$1, legacy_grade=null where unit_id=$2`, [k5b, U(5)]);
r = await as(ADMIN_U, () => q(`select * from public.move_in_visit_target where unit_id=$1`, [U(5)]));
check("명의변경 후 이전 계약 방문대상 비노출", r.ok && r.r.length === 0, r);
queue = await q(`select * from public.get_move_in_today_queue($1, now())`, [P]);
check("명의변경 후 이전 계약자 부재·방문 미반영", !queue.find((x) => x.unit_id === U(5)));
const vt5 = (await one(`select visit_target_id from public.move_in_visit_target where unit_id=$1`, [U(5)])).visit_target_id;
r = await as(COUN_U, () => one(`select public.record_move_in_visit_result($1,$2,$3,'VISITED','x',$4::public.occupancy_intent) as id`, [P, vt5, k5, "SALE"]));
check("해지된 계약 방문대상 결과 저장 거부", !r.ok, r);

// ---------- 7. 기존 상담 저장 RPC 회귀 ----------
r = await as(COUN_U, () => one(`select public.create_move_in_consultation(p_project_id:=$1,p_unit_id:=$2,p_customer_id:=$3,p_consultation_type:='OUTBOUND',p_content:='x',p_legacy_grade:='부재') as id`, [P, U(6), C(6)]));
check("기존 상담 저장(부재) 동작", r.ok, r);
check("과거 부재 3회 + 신규 부재 1회 → 신규 저장 시점에 자동 D(미등록→D)", (await one(`select legacy_grade from public.unit_occupancy_status where unit_id=$1`, [U(6)])).legacy_grade === "D");
check("기존 RPC 부재 저장 후 연속 부재 4", (await one(`select absence_streak from public.get_move_in_absence_candidates($1) where unit_id=$2`, [P, U(6)]))?.absence_streak === 4);
r = await as(COUN_U, () => one(`select public.create_move_in_consultation(p_project_id:=$1,p_unit_id:=$2,p_customer_id:=$3,p_consultation_type:='OUTBOUND',p_content:='통화',p_legacy_grade:='B') as id`, [P, U(6), C(6)]));
check("상담 성공 저장 → 연속 부재 초기화", r.ok && !(await q(`select 1 from public.get_move_in_absence_candidates($1) where unit_id=$2`, [P, U(6)])).length, r);

// ---------- 7b. 방문 결과 원자성(상담 저장 + 방문상태 변경 단일 트랜잭션) ----------
{
  const k10 = (await one(`select contract_id from public.contract where unit_id=$1 and contract_status='ACTIVE'`, [U(10)])).contract_id;
  r = await as(COUN_U, () => one(`select public.create_move_in_consultation(p_project_id:=$1,p_unit_id:=$2,p_customer_id:=$3,p_consultation_type:='OUTBOUND',p_content:='x',p_legacy_grade:='부재') as id`, [P, U(10), C(10)]));
  check("u10 신규 부재 → 자동 전환(원자성 검증용)", r.ok, r);
  const vt10 = (await one(`select visit_target_id from public.move_in_visit_target where unit_id=$1`, [U(10)])).visit_target_id;
  const snap = async () => ({
    vt: await one(`select status, visit_count, visit_intent, last_visit_consultation_id from public.move_in_visit_target where visit_target_id=$1`, [vt10]),
    uos: await one(`select legacy_grade, occupancy_intent, last_contact_at from public.unit_occupancy_status where unit_id=$1`, [U(10)]),
    nCons: (await one(`select count(*)::int n from public.consultation where unit_id=$1`, [U(10)])).n,
    nSched: (await one(`select count(*)::int n from public.contact_schedule where unit_id=$1`, [U(10)])).n,
  });
  const before = await snap();
  // (a) 상담 저장 RPC 내부 실패(빈 내용 → content is required)
  r = await as(COUN_U, () => one(`select public.record_move_in_visit_result($1,$2,$3,'VISITED','   ',$4::public.occupancy_intent) as id`, [P, vt10, k10, "SALE"]));
  check("상담 저장 실패 → 오류 반환", !r.ok && /content is required/.test(r.error), r);
  check("상담 저장 실패 → 방문 완료 상태·상담·의향 모두 미반영", JSON.stringify(await snap()) === JSON.stringify(before));
  // (b) 상담 저장 성공 후 방문상태 변경 단계 실패(트리거로 강제)
  await db.exec(`create function pg_temp.boom() returns trigger language plpgsql as $$ begin raise exception 'forced visit update failure'; end $$;
    create trigger boom before update on public.move_in_visit_target for each row execute function pg_temp.boom();`);
  r = await as(COUN_U, () => one(`select public.record_move_in_visit_result($1,$2,$3,'VISITED','방문',$4::public.occupancy_intent) as id`, [P, vt10, k10, "SALE"]));
  check("방문상태 변경 실패 → 오류 반환", !r.ok && /forced visit update failure/.test(r.error), r);
  check("방문상태 변경 실패 → 이미 만든 상담·의향·최종접촉일도 롤백", JSON.stringify(await snap()) === JSON.stringify(before));
  await db.exec(`drop trigger boom on public.move_in_visit_target;`);
  // (c) 정상 저장은 둘 다 반영
  r = await as(COUN_U, () => one(`select public.record_move_in_visit_result($1,$2,$3,'VISITED','방문',$4::public.occupancy_intent) as id`, [P, vt10, k10, "SALE"]));
  const after = await snap();
  check("정상 저장: 상담 1건 + VISITED + 상담 id 연결", r.ok && after.nCons === before.nCons + 1 && after.vt.status === "VISITED" && after.vt.last_visit_consultation_id === r.r.id, after);
}

// ---------- 7c. 관리자 승인 없이 D 변경 없음 ----------
{
  const grades = async () => JSON.stringify(await q(`select unit_id, legacy_grade from public.unit_occupancy_status order by unit_id`));
  const g0 = await grades();
  await q(`select * from public.get_move_in_absence_candidates($1)`, [P]);
  await q(`select * from public.get_move_in_today_queue($1, now())`, [P]);
  await q(`select * from public.get_move_in_today_queue($1, now() + interval '30 days')`, [P]);
  check("후보·오늘 관리대상 조회는 등급을 바꾸지 않음", (await grades()) === g0);
  const volatile = await q(`select proname, provolatile from pg_proc where proname in ('get_move_in_absence_candidates','get_move_in_today_queue')`);
  check("조회 함수는 STABLE(쓰기 불가)", volatile.length === 2 && volatile.every((x) => x.provolatile === "s"), volatile);
  // 상담사 부재 5회 연속 저장 → 등급 불변
  await unit(30, "B");
  for (let i = 0; i < 2; i++) {
    r = await as(COUN_U, () => one(`select public.create_move_in_consultation(p_project_id:=$1,p_unit_id:=$2,p_customer_id:=$3,p_consultation_type:='OUTBOUND',p_content:='x',p_legacy_grade:='부재') as id`, [P, U(30), C(30)]));
  }
  check("상담사 부재 2회 저장까지 B 유지", (await one(`select legacy_grade from public.unit_occupancy_status where unit_id=$1`, [U(30)])).legacy_grade === "B");
  r = await as(COUN_U, () => q(`update public.unit_occupancy_status set legacy_grade='D' where unit_id=$1`, [U(30)]));
  check("상담사 점유상태 직접 수정 불가(스텁 권한 기준)", !r.ok, r);
  const triggers = await q(`select tgname from pg_trigger t join pg_class c on c.oid=t.tgrelid where not t.tgisinternal and c.relname in ('unit_occupancy_status','consultation','move_in_visit_target')`);
  check("신규 마이그레이션이 등급 변경 트리거를 만들지 않음", triggers.length === 0, triggers);
  // 기존 상담 저장 RPC로 상담사가 D를 직접 선택하면 변경됨(기존 기능 — 보고 항목)
  r = await as(COUN_U, () => one(`select public.create_move_in_consultation(p_project_id:=$1,p_unit_id:=$2,p_customer_id:=$3,p_consultation_type:='OUTBOUND',p_content:='x',p_legacy_grade:='D') as id`, [P, U(30), C(30)]));
  check("상담사: B 세대에 D 직접 선택 저장 거부", !r.ok && /not authorized/.test(r.error), r);
  const save = (user, unitN, grade, extra = "") => as(user, () => one(`select public.create_move_in_consultation(p_project_id:=$1,p_unit_id:=$2,p_customer_id:=$3,p_consultation_type:='OUTBOUND',p_content:='x',p_legacy_grade:=$4${extra}) as id`, [P, U(unitN), C(unitN), grade]));
  const st = async (n) => ({
    grade: (await one(`select legacy_grade from public.unit_occupancy_status where unit_id=$1`, [U(n)])).legacy_grade,
    cons: (await one(`select count(*)::int n from public.consultation where unit_id=$1`, [U(n)])).n,
    sched: (await one(`select count(*)::int n from public.contact_schedule where unit_id=$1`, [U(n)])).n,
  });
  const s30 = await st(30);
  check("D 거부 시 상담·일정·등급 미반영", s30.grade === "B" && s30.cons === 2);
  // 일반 상담 저장·기존 등급 변경 영향 없음
  await unit(31, "C");
  for (const [g, want] of [["A", "A"], ["B", "B"], ["C", "C"], ["부재", "C"], ["상담거절", "C"], [null, "C"]]) {
    r = await save(COUN_U, 31, g);
    check(`상담사 ${g ?? "등급 미선택"} 저장 허용 → 등급 ${want}`, r.ok && (await st(31)).grade === want, r);
  }
  r = await as(COUN_U, () => one(`select public.create_move_in_consultation(p_project_id:=$1,p_unit_id:=$2,p_customer_id:=$3,p_consultation_type:='OUTBOUND',p_content:='x',p_legacy_grade:='B',p_next_contact_at:=now()+interval '3 days',p_occupancy_intent:='SALE') as id`, [P, U(31), C(31)]));
  const o31 = await one(`select occupancy_intent, next_contact_at from public.unit_occupancy_status where unit_id=$1`, [U(31)]);
  check("상담사 일반 저장: 의향·다음 접촉·일정 정상 반영", r.ok && o31.occupancy_intent === "SALE" && o31.next_contact_at !== null && (await st(31)).sched === 1, o31);
  // D 세대 재확인은 상담사도 허용
  await unit(32, "D");
  r = await save(COUN_U, 32, "D");
  check("상담사: 이미 D 세대의 D 재확인 저장 허용", r.ok && (await st(32)).grade === "D", r);
  r = await save(COUN_U, 32, "C");
  check("상담사: D → C 상향 저장 허용(기존 등급 변경 유지)", r.ok && (await st(32)).grade === "C", r);
  r = await save(COUN_U, 32, "D");
  check("상담사: C로 바뀐 뒤 D 재하향은 거부", !r.ok && (await st(32)).grade === "C", r);
  // 관리자는 D 저장 가능
  r = await save(ADMIN_U, 31, "D");
  check("관리자: B → D 상담 저장 허용", r.ok && (await st(31)).grade === "D", r);
  // 18인자(계약 경합 방어) 경로도 같은 가드
  const k30 = (await one(`select contract_id from public.contract where unit_id=$1 and contract_status='ACTIVE'`, [U(30)])).contract_id;
  r = await as(COUN_U, () => one(`select public.create_move_in_consultation(p_project_id:=$1,p_unit_id:=$2,p_customer_id:=$3,p_consultation_type:='OUTBOUND',p_content:='x',p_expected_contract_id:=$4,
    p_legacy_grade:='D',p_next_contact_at:=null,p_occupancy_intent:=null,p_funding_status:=null,p_move_in_status:=null,p_planned_move_in_date:=null,p_balance_paid_at:=null,p_actual_move_in_date:=null,p_reason:=null,p_business_purpose:=null,p_clear_next_contact_at:=false,p_operational_intent:=null) as id`, [P, U(30), C(30), k30]));
  check("상담사: 18인자 경로 D 저장도 거부", !r.ok && /not authorized/.test(r.error), r);
  // 타 프로젝트 관리자는 P 세대 D 불가
  r = await save(OTHER_U, 30, "D");
  check("타 프로젝트 관리자 D 저장 거부", !r.ok, r);
  check("최종: u30 B 유지", (await st(30)).grade === "B");
}

// ---------- 9. 연속 부재 3회 자동 D 전환 ----------
{
  const callSave = (user, n, grade, { type = "OUTBOUND", customer = C(n) } = {}) => as(user, () => one(`select public.create_move_in_consultation(p_project_id:=$1,p_unit_id:=$2,p_customer_id:=$3,p_consultation_type:=$4,p_content:='x',p_legacy_grade:=$5) as id`, [P, U(n), customer, type, grade]));
  const st = async (n) => ({
    grade: (await one(`select legacy_grade from public.unit_occupancy_status where unit_id=$1`, [U(n)])).legacy_grade,
    hist: await q(`select previous_value, new_value, reason, contact_id, changed_at, changed_by from public.contract_status_history where unit_id=$1 and field_changed='legacy_grade' order by changed_at, history_id`, [U(n)]),
    vt: await q(`select status, absence_streak_at_open, grade_before, grade_changed from public.move_in_visit_target where unit_id=$1 order by created_at`, [U(n)]),
    cons: (await one(`select count(*)::int n from public.consultation where unit_id=$1`, [U(n)])).n,
  });
  // 저장마다 기존 기록을 1분씩 과거로 밀어 순서를 보장(같은 트랜잭션 now() 동일 문제 회피)
  const age = async (n) => q(`update public.consultation set consulted_at = consulted_at - interval '1 minute' where unit_id=$1`, [U(n)]);

  await unit(40, "B");
  r = await callSave(COUN_U, 40, "부재"); await age(40);
  r = await callSave(COUN_U, 40, "부재"); await age(40);
  let s40 = await st(40);
  check("2회 부재까지 등급 유지(B), 이력·방문대상 없음", r.ok && s40.grade === "B" && s40.hist.length === 0 && s40.vt.length === 0, s40);
  r = await callSave(COUN_U, 40, "부재");
  const third = r.r?.id;
  s40 = await st(40);
  check("3회 연속 부재 → 자동 D", r.ok && s40.grade === "D", r);
  check("이력: 이전 B → D, 사유 '장기 부재중(연속 3회)', 상담 id·상담사 기록", s40.hist.length === 1 && s40.hist[0].previous_value === "B" && s40.hist[0].new_value === "D"
    && s40.hist[0].reason === "장기 부재중(연속 3회)" && s40.hist[0].contact_id === third && s40.hist[0].changed_by === COUN_M, s40.hist);
  const c3 = await one(`select consulted_at from public.consultation where id=$1`, [third]);
  const o40 = await one(`select legacy_grade_as_of, occupancy_intent, last_contact_at from public.unit_occupancy_status where unit_id=$1`, [U(40)]);
  check("변경 시각 = 3회째 부재 저장 시각", String(s40.hist[0].changed_at) === String(c3.consulted_at) && String(o40.legacy_grade_as_of) === String(c3.consulted_at));
  check("입주 의향 미확인 유지·최종접촉일 미갱신", o40.occupancy_intent === "UNDECIDED" && o40.last_contact_at === null, o40);
  check("방문상담 대상 자동 등록(방문 필요, 3회, 이전 B)", s40.vt.length === 1 && s40.vt[0].status === "VISIT_NEEDED" && s40.vt[0].absence_streak_at_open === 3 && s40.vt[0].grade_before === "B" && s40.vt[0].grade_changed === true, s40.vt);
  await age(40);
  r = await callSave(COUN_U, 40, "부재");
  s40 = await st(40);
  check("4회째 부재: 이력·방문대상 추가 없음(중복 방지)", r.ok && s40.hist.length === 1 && s40.vt.length === 1, s40);
  await age(40);
  r = await callSave(COUN_U, 40, null);
  s40 = await st(40);
  check("상담 성공(등급 미선택) → D 유지(수동 재조정 대기)", r.ok && s40.grade === "D");
  check("상담 성공 → 연속 부재 초기화", !(await q(`select 1 from public.get_move_in_absence_candidates($1) where unit_id=$2`, [P, U(40)])).length);
  await age(40);
  r = await callSave(COUN_U, 40, "C");
  check("상담사 수동 재조정 D → C 허용", r.ok && (await st(40)).grade === "C", r);
  for (let i = 0; i < 2; i++) { await age(40); r = await callSave(COUN_U, 40, "부재"); }
  check("초기화 후 2회 부재는 C 유지", (await st(40)).grade === "C");
  await age(40);
  r = await callSave(COUN_U, 40, "부재");
  s40 = await st(40);
  check("초기화 후 다시 3회 → D, 이력 2건, 진행 중 방문대상 1건 유지", r.ok && s40.grade === "D" && s40.hist.length === 2 && s40.hist[1].previous_value === "C" && s40.vt.length === 1, s40);

  await unit(41, "D");
  for (let i = 0; i < 3; i++) { r = await callSave(COUN_U, 41, "부재"); await age(41); }
  const s41 = await st(41);
  check("기존 D: 중복 등급 변경·이력 없음, 방문대상 등록(grade_changed=false)", s41.grade === "D" && s41.hist.length === 0 && s41.vt.length === 1 && s41.vt[0].grade_changed === false, s41);

  const prev42 = "50000000-0000-4000-8000-0000000000e6";
  await q(`insert into public.project_unit values ($1,$2,'101','42')`, [U(42), P]);
  await q(`insert into public.customer values ($1,$2,'이전',$3),($4,$2,'현재',$3)`, [prev42, P, COUN_M, C(42)]);
  await q(`insert into public.contract(project_id, unit_id, customer_id, contract_status) values ($1,$2,$3,'CANCELLED')`, [P, U(42), prev42]);
  const k42 = (await one(`insert into public.contract(project_id, unit_id, customer_id) values ($1,$2,$3) returning contract_id`, [P, U(42), C(42)])).contract_id;
  await q(`insert into public.unit_occupancy_status(project_id, unit_id, contract_id, legacy_grade) values ($1,$2,$3,'B')`, [P, U(42), k42]);
  for (const d of [9, 8, 7]) await log(42, d, "ABSENT_CALL", { customer: prev42 });
  for (let i = 0; i < 2; i++) { r = await callSave(COUN_U, 42, "부재"); await age(42); }
  check("이전 계약자 부재 3회 + 현재 2회 → B 유지", (await st(42)).grade === "B" && (await st(42)).vt.length === 0);

  await unit(43, "B");
  await callSave(COUN_U, 43, "부재"); await age(43);
  await callSave(COUN_U, 43, "부재", { type: "VISIT" }); await age(43);
  r = await callSave(COUN_U, 43, "부재");
  check("전화 2 + 방문 부재 1 → B 유지", r.ok && (await st(43)).grade === "B");

  const k44 = await unit(44, "C");
  await q(`insert into public.move_in_tracking_exclusion values ($1,$2,$3,true)`, [P, U(44), k44]);
  for (let i = 0; i < 3; i++) { await callSave(COUN_U, 44, "부재"); await age(44); }
  check("추적 제외 세대: 3회 부재여도 C 유지·방문대상 없음", (await st(44)).grade === "C" && (await st(44)).vt.length === 0);

  await unit(45, "B");
  for (let i = 0; i < 2; i++) { await callSave(COUN_U, 45, "부재"); await age(45); }
  const b45 = await st(45);
  await db.exec(`create function pg_temp.boom2() returns trigger language plpgsql as $$ begin raise exception 'forced visit insert failure'; end $$;
    create trigger boom2 before insert on public.move_in_visit_target for each row execute function pg_temp.boom2();`);
  r = await callSave(COUN_U, 45, "부재");
  check("방문대상 등록 실패 → 저장 오류", !r.ok && /forced visit insert failure/.test(r.error), r);
  check("방문대상 등록 실패 → 3회째 상담·D 변경·이력 모두 취소", JSON.stringify(await st(45)) === JSON.stringify(b45));
  await db.exec(`drop trigger boom2 on public.move_in_visit_target;
    create function pg_temp.boom3() returns trigger language plpgsql as $$ begin raise exception 'forced history failure'; end $$;
    create trigger boom3 before insert on public.contract_status_history for each row execute function pg_temp.boom3();`);
  r = await callSave(COUN_U, 45, "부재");
  check("이력 기록 실패 → 상담·D 변경·방문대상 모두 취소", !r.ok && JSON.stringify(await st(45)) === JSON.stringify(b45), r);
  await db.exec(`drop trigger boom3 on public.contract_status_history;`);
  r = await callSave(COUN_U, 45, "부재");
  const s45 = await st(45);
  check("실패 해소 후 정상 저장 → D·이력·방문대상 1건씩", r.ok && s45.grade === "D" && s45.hist.length === 1 && s45.vt.length === 1, r);

  await unit(46, "B");
  for (let i = 0; i < 2; i++) { await callSave(COUN_U, 46, "부재"); await age(46); }
  const otherSave = (proj) => as(OTHER_U, () => one(`select public.create_move_in_consultation(p_project_id:=$1,p_unit_id:=$2,p_customer_id:=$3,p_consultation_type:='OUTBOUND',p_content:='x',p_legacy_grade:='부재') as id`, [proj, U(46), C(46)]));
  r = await otherSave(P);
  check("타 프로젝트 사용자 부재 저장 거부(자동 전환 유발 불가)", !r.ok && (await st(46)).grade === "B" && (await st(46)).cons === 2, r);
  r = await otherSave(P2);
  check("프로젝트 바꿔치기 부재 저장 거부", !r.ok && (await st(46)).grade === "B", r);
  await q(`update public.customer set assigned_counselor_id = null where id=$1`, [C(46)]);
  r = await callSave(COUN_U, 46, "부재");
  check("미배정 상담사 부재 저장 거부(자동 전환 없음)", !r.ok && (await st(46)).grade === "B" && (await st(46)).vt.length === 0, r);
  r = await as(COUN_U, () => q(`insert into public.move_in_visit_target(project_id,unit_id,contract_id,customer_id,absence_streak_at_open,created_by) select project_id,unit_id,contract_id,$2,3,$3 from public.unit_occupancy_status where unit_id=$1`, [U(46), C(46), COUN_M]));
  check("상담사 방문대상 직접 생성 불가", !r.ok, r);
}

// ---------- 8. 롤백 ----------
{
  const snapAll = async () => JSON.stringify(await q(`select unit_id, legacy_grade, legacy_grade_as_of from public.unit_occupancy_status order by unit_id`))
    + JSON.stringify(await q(`select count(*)::int n from public.contract_status_history`)) + JSON.stringify(await q(`select count(*)::int n from public.move_in_visit_target`));
  const before = await snapAll();
  await db.exec(read("rollback/20261017120000_absence_auto_d_grade.rollback.sql"));
  check("자동 전환 롤백: 상담 저장 RPC가 가드 정의로 복원", !(await one(`select pg_get_functiondef(oid) d from pg_proc where proname='create_move_in_consultation' and pronargs=17`)).d.includes("v_absence_streak"));
  await db.exec(read("migrations/20261017120000_absence_auto_d_grade.sql"));
  check("과거 부재 기록이 있어도 마이그레이션 적용만으로 일괄 변경 없음", (await snapAll()) === before);
  await db.exec(read("rollback/20261017120000_absence_auto_d_grade.rollback.sql"));
}
// legacy_grade 이력이 있으면 R3 전체 중단(CHECK를 4개 값으로 되돌릴 수 없음)
{
  let r3 = null;
  try { await db.exec(read("rollback/20261017100000_absence_streak_visit_target.rollback.sql")); } catch (e) { r3 = e.message; await db.exec("rollback"); }
  check("롤백: legacy_grade 이력이 있으면 R3 중단·방문대상 유지", /legacy_grade rows/.test(r3 ?? "")
    && (await one(`select to_regclass('public.move_in_visit_target') t`)).t !== null, r3);
}
// 이하 롤백 리허설은 이 하네스 안에서만 이력을 임시 테이블로 옮겨 진행하고, 재적용 후 되돌린다(운영 이력 삭제 금지)
await db.exec(`create temporary table rehearsal_legacy as select * from public.contract_status_history where field_changed = 'legacy_grade';
  delete from public.contract_status_history where field_changed = 'legacy_grade';`);
await db.exec(read("rollback/20261017100000_absence_streak_visit_target.rollback.sql"));
const def = (await one(`select pg_get_functiondef(oid) d from pg_proc where proname='get_move_in_today_queue'`)).d;
check("롤백: 큐 20261015 정의 복원", !def.includes("ABSENCE_STREAK") && def.includes("uos.legacy_grade in ('C', 'D')"));
check("롤백: 신규 객체 제거", (await one(`select to_regclass('public.move_in_visit_target') t`)).t === null
  && (await one(`select count(*)::int n from pg_proc where proname in ('get_move_in_absence_candidates','approve_move_in_absence_d_grade','record_move_in_visit_result')`)).n === 0);
check("롤백: 전환된 D등급은 유지", (await one(`select legacy_grade from public.unit_occupancy_status where unit_id=$1`, [U(1)])).legacy_grade === "D");
// 재적용 가능
await db.exec(read("migrations/20261017100000_absence_streak_visit_target.sql"));
await db.exec("insert into public.contract_status_history select * from rehearsal_legacy");
check("롤백 후 재적용 가능, 옮겨 둔 이력 복귀", (await one(`select count(*)::int n from public.contract_status_history where unit_id=$1`, [U(1)])).n === 1);

console.log(results.join("\n"));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
