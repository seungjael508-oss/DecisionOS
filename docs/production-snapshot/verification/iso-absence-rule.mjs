// 20261019100000(장기 부재 규칙·빠른 경로) 검증 — 운영 스키마(CSV 조립본) + 실제 PostgreSQL 17
// 레거시 이관 부재 집계, 문자 비초기화, 방문 시트 제외, 이전 계약자 제외, 자동 D·방문대상, 기존 D 유지,
// 빠른 경로 = RLS 경로 결과 동일, 비멤버·타 프로젝트 0건, 롤백 후 20261017120000 정의 복원·재적용
// 사용: node iso-absence-rule.mjs <운영 스키마 SQL>
import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const read = (p) => fs.readFileSync(path.join(root, "supabase", p), "utf8");
const base = { host: "127.0.0.1", port: 54329, user: "postgres", password: "localtest" };
const MIGS = ["20261015100000_today_queue_cd_focus", "20261017100000_absence_streak_visit_target",
  "20261017110000_consultation_d_grade_admin_guard", "20261017120000_absence_auto_d_grade"];
const NEW = "20261019100000_absence_streak_rule_fast_path";

let pass = 0, fail = 0;
const out = [];
const check = (name, cond, detail) => {
  if (cond) { pass++; out.push(`ok   ${name}`); } else { fail++; out.push(`FAIL ${name}${detail === undefined ? "" : " :: " + JSON.stringify(detail)}`); }
};

const STAYJ = "1283e198-5043-4027-96d6-edcc7a6686c6", P2 = "21000000-0000-4000-8000-000000000002";
const UA = "31000000-0000-4000-8000-0000000000a1", MA = "41000000-0000-4000-8000-0000000000a1"; // Stay J 관리자
const UC = "31000000-0000-4000-8000-0000000000c1", MC = "41000000-0000-4000-8000-0000000000c1"; // Stay J 상담사
const UX = "31000000-0000-4000-8000-0000000000e1"; // 비멤버
const UQ = "31000000-0000-4000-8000-0000000000d1", MQ = "41000000-0000-4000-8000-0000000000d1"; // P2 상담사(화양 아님)
const UQA = "31000000-0000-4000-8000-0000000000d2", MQA = "41000000-0000-4000-8000-0000000000d2"; // P2 관리자

const a = new pg.Client({ ...base, database: "postgres" }); await a.connect();
await a.query("drop database if exists stayj_absrule"); await a.query("create database stayj_absrule"); await a.end();
const cfg = { ...base, database: "stayj_absrule" };
const db = new pg.Client(cfg); await db.connect(); db.on("notice", () => {});
await db.query(fs.readFileSync(path.join(here, "isolated-supabase-bootstrap.sql"), "utf8"));
await db.query(fs.readFileSync(process.argv[2], "utf8"));
for (const m of MIGS) await db.query(read(`migrations/${m}.sql`));
const defs = async () => (await db.query(`select p.oid::regprocedure::text f, md5(pg_get_functiondef(p.oid)) d, coalesce(p.proacl::text,'') acl
  from pg_proc p where p.pronamespace in ('public'::regnamespace, 'private'::regnamespace)
  and p.proname in ('create_move_in_consultation','get_move_in_absence_candidates','get_move_in_today_queue','move_in_absence_contact_type','move_in_absence_candidates_full_view') order by 1`)).rows;
const before = await defs();
let applied = true;
try { await db.query(read(`migrations/${NEW}.sql`)); } catch (e) { applied = false; check("신규 마이그레이션 적용", false, e.message); }
if (applied) check("마이그레이션 5개 순서 적용(운영 스키마 원본)", true);
const again = await db.query(read(`migrations/${NEW}.sql`)).then(() => null, (e) => e.message);
await db.query("rollback").catch(() => {});
check("재실행 시 사전 점검이 중단", /not the 20261017120000 definition/.test(again ?? ""), again);

// 고정 데이터
await db.query(`insert into auth.users(id) values ($1),($2),($3),($4),($5)`, [UA, UC, UX, UQ, UQA]);
await db.query(`insert into public.organization(id,name) values ('11000000-0000-4000-8000-000000000001','o')`);
await db.query(`insert into public.project(id,organization_id,name) values ($1,'11000000-0000-4000-8000-000000000001','stayj'),($2,'11000000-0000-4000-8000-000000000001','p2')`, [STAYJ, P2]);
await db.query(`insert into public.project_member(id,project_id,user_id,role) values ($1,$2,$3,'PROJECT_ADMIN'),($4,$2,$5,'COUNSELOR'),($6,$7,$8,'COUNSELOR'),($9,$7,$10,'PROJECT_ADMIN')`,
  [MA, STAYJ, UA, MC, UC, MQ, P2, UQ, MQA, UQA]);
let seq = 0;
async function unit(project, grade, counselor = MC) {
  seq++;
  const n = String(seq).padStart(12, "0");
  const u = `8e000000-0000-4000-8000-${n}`, c = `51000000-0000-4000-8000-${n}`;
  await db.query(`insert into public.project_unit(unit_id,project_id,building_no,unit_no) values ($1,$2,'990',$3)`, [u, project, String(seq)]);
  await db.query(`insert into public.customer(id,project_id,name,phone,phone_raw,assigned_counselor_id) values ($1,$2,'n',$3,$3,$4)`, [c, project, `010-8${String(seq).padStart(3, "0")}-0000`, counselor]);
  const k = (await db.query(`insert into public.contract(project_id,customer_id,unit_id,contract_status) values ($1,$2,$3,'ACTIVE') returning contract_id`, [project, c, u])).rows[0].contract_id;
  await db.query(`insert into public.unit_occupancy_status(project_id,unit_id,contract_id,legacy_grade) values ($1,$2,$3,$4)`, [project, u, k, grade]);
  return { u, c, k, project };
}
let hour = 100;
async function hist(t, kind, tag, extra = {}, customer = t.c) {
  hour--;
  const contact = kind === "LEGACY" ? "CONSULTATION" : kind;
  const channel = kind === "LEGACY" ? "LEGACY_IMPORT" : null;
  await db.query(`insert into public.consultation(project_id,customer_id,counselor_id,consulted_at,content,created_by,unit_id,contact_type,channel,structured_tags)
    values ($1,$2,$3, now() - make_interval(hours => $4::int), 'h', $3, $5, $6, $7, $8)`,
    [t.project, customer, t.project === STAYJ ? MA : MQA, hour, t.u, contact, channel, JSON.stringify({ ...(tag ? { legacy_grade: tag } : {}), ...extra })]);
}
const SAVE18 = `select public.create_move_in_consultation(p_project_id:=$1,p_unit_id:=$2,p_customer_id:=$3,p_consultation_type:='OUTBOUND',p_content:='x',p_expected_contract_id:=$5,
  p_legacy_grade:=$4,p_next_contact_at:=null,p_occupancy_intent:=null,p_funding_status:=null,p_move_in_status:=null,p_planned_move_in_date:=null,
  p_balance_paid_at:=null,p_actual_move_in_date:=null,p_reason:=null,p_business_purpose:=null,p_clear_next_contact_at:=false,p_operational_intent:=null) as id`;
async function asUser(userId, sql, params) {
  await db.query("begin");
  try {
    await db.query("select set_config('request.jwt.claim.sub', $1, true)", [userId]);
    await db.query("set local role authenticated");
    const r = await db.query(sql, params);
    await db.query("commit");
    return { ok: true, rows: r.rows };
  } catch (e) { await db.query("rollback"); return { ok: false, code: e.code, error: e.message }; }
}
const save = (t, grade, user = UC) => asUser(user, SAVE18, [t.project, t.u, t.c, grade, t.k]);
const state = async (t) => ({
  grade: (await db.query(`select legacy_grade from public.unit_occupancy_status where unit_id=$1`, [t.u])).rows[0].legacy_grade,
  hist: Number((await db.query(`select count(*) from public.contract_status_history where unit_id=$1 and field_changed='legacy_grade' and reason='장기 부재중(연속 3회)'`, [t.u])).rows[0].count),
  vt: Number((await db.query(`select count(*) from public.move_in_visit_target where unit_id=$1 and status='VISIT_NEEDED'`, [t.u])).rows[0].count),
});
const VISIT_KEY = { legacy_source: "hwayang_legacy", legacy_file_id: "F003", legacy_sheet_index: 4, legacy_row_number: 7, legacy_source_key: "hwayang-260915:F003:4:7" };

// 시나리오(모두 Stay J)
const sLegacy = await unit(STAYJ, "B"); await hist(sLegacy, "LEGACY", "부재"); await hist(sLegacy, "LEGACY", "부재");
const sSms = await unit(STAYJ, "C"); await hist(sSms, "CALL", "부재"); await hist(sSms, "MESSAGE", null); await hist(sSms, "CALL", "부재");
const sReal = await unit(STAYJ, "B"); await hist(sReal, "CALL", "부재"); await hist(sReal, "CALL", "부재"); await hist(sReal, "LEGACY", "A");
await hist(sReal, "CALL", "부재");
const sVisitKey = await unit(STAYJ, "B"); await hist(sVisitKey, "LEGACY", "부재", VISIT_KEY); await hist(sVisitKey, "CALL", "부재");
const sPrev = await unit(STAYJ, "B");
const prevCustomer = "51000000-0000-4000-8000-0000000009ff";
await db.query(`insert into public.customer(id,project_id,name,phone,phone_raw) values ($1,$2,'p','010-7999-0000','010-7999-0000')`, [prevCustomer, STAYJ]);
await hist(sPrev, "CALL", "부재", {}, prevCustomer); await hist(sPrev, "CALL", "부재", {}, prevCustomer); await hist(sPrev, "CALL", "부재");
const sD = await unit(STAYJ, "D"); await hist(sD, "LEGACY", "부재"); await hist(sD, "CALL", "부재");
const sSmsTagged = await unit(STAYJ, "B"); await hist(sSmsTagged, "CALL", "부재"); await hist(sSmsTagged, "MESSAGE", "부재");

// 후보(관리자 = 빠른 경로)
const cand = await asUser(UA, `select unit_id, absence_streak from public.get_move_in_absence_candidates($1)`, [STAYJ]);
const streakOf = (t) => cand.rows.find((r) => r.unit_id === t.u)?.absence_streak ?? 0;
check("후보 조회(관리자) 성공", cand.ok, cand);
check("레거시 이관 부재 2회는 집계(저장 전 후보 아님)", streakOf(sLegacy) === 0, streakOf(sLegacy));
// 2회짜리는 후보(3회+)가 아니므로 저장으로 3회째를 만든다
const r1 = await save(sLegacy, "부재"); const s1 = await state(sLegacy);
check("레거시 이관 부재 2 + 신규 전화 부재 → 자동 D·이력·방문대상", r1.ok && s1.grade === "D" && s1.hist === 1 && s1.vt === 1, { r1, s1 });
const r2 = await save(sSms, "부재"); const s2 = await state(sSms);
check("문자는 초기화하지 않음: 전화 부재 2 + 문자 + 신규 부재 → 자동 D", r2.ok && s2.grade === "D" && s2.hist === 1 && s2.vt === 1, { r2, s2 });
const r3 = await save(sReal, "부재"); const s3 = await state(sReal);
check("실제 상담(이관 상담 A) 이후 부재 1 + 신규 → 2회, 변경 없음", r3.ok && s3.grade === "B" && s3.hist === 0 && s3.vt === 0, { r3, s3 });
const r4 = await save(sVisitKey, "부재"); const s4 = await state(sVisitKey);
check("방문 시트 이관 부재는 전화 부재로 세지 않음(2회, 변경 없음)", r4.ok && s4.grade === "B" && s4.hist === 0 && s4.vt === 0, { r4, s4 });
const r5 = await save(sPrev, "부재"); const s5 = await state(sPrev);
check("이전 계약자 부재 제외(현재 계약자 2회, 변경 없음)", r5.ok && s5.grade === "B" && s5.hist === 0 && s5.vt === 0, { r5, s5 });
const r6 = await save(sD, "부재"); const s6 = await state(sD);
check("기존 D: 등급·이력 변경 없이 방문대상만 등록", r6.ok && s6.grade === "D" && s6.hist === 0 && s6.vt === 1, { r6, s6 });
const r7 = await save(sSmsTagged, "부재"); const s7 = await state(sSmsTagged);
check("부재 태그 문자는 부재 횟수에 넣지 않음(전화 2회, 변경 없음)", r7.ok && s7.grade === "B" && s7.hist === 0 && s7.vt === 0, { r7, s7 });
const r8 = await save(sSms, "부재"); const s8 = await state(sSms);
check("이미 진행 중 방문대상이 있으면 중복 생성 없음", r8.ok && s8.vt === 1 && s8.hist === 1, { r8, s8 });

// 빠른 경로 = RLS 경로 결과 동일(같은 본문을 invoker 함수로 만들어 비교)
const mig = read(`migrations/${NEW}.sql`);
const rlsBody = mig.slice(mig.indexOf("  return query\n") + "  return query\n".length, mig.indexOf(";\nend;\n$function$;"));
const sigLine = mig.match(/ RETURNS TABLE\([^\n]+\)/)[0];
await db.query(`create function public.test_absence_rls(p_project_id uuid)\n${sigLine}\nlanguage sql stable set search_path to '' as $f$\n${rlsBody}\n$f$; grant execute on function public.test_absence_rls(uuid) to authenticated;`);
const q = (fn) => `select unit_id, contract_id, customer_id, legacy_grade, absence_streak, latest_attempt_at, last_contact_at, open_visit_target_id, open_visit_status from public.${fn}($1) order by unit_id`;
for (const [label, user] of [["관리자", UA], ["상담사", UC]]) {
  const f = await asUser(user, q("get_move_in_absence_candidates"), [STAYJ]);
  const r = await asUser(user, q("test_absence_rls"), [STAYJ]);
  check(`빠른 경로 결과 = RLS 경로 결과(Stay J ${label}, ${f.rows?.length}행)`, f.ok && r.ok && f.rows.length > 0 && JSON.stringify(f.rows) === JSON.stringify(r.rows), { f: f.rows?.length, r: r.rows?.length });
}
const nx = await asUser(UX, `select count(*)::int n from public.get_move_in_absence_candidates($1)`, [STAYJ]);
check("비멤버: 0건", nx.ok && nx.rows[0].n === 0, nx);
const px = await asUser(UQA, `select count(*)::int n from public.get_move_in_absence_candidates($1)`, [STAYJ]);
check("타 프로젝트 관리자: Stay J 0건", px.ok && px.rows[0].n === 0, px);
const direct = await asUser(UX, `select count(*)::int n from private.move_in_absence_candidates_full_view($1)`, [STAYJ]);
check("보조 함수 직접 호출해도 비멤버는 0건", direct.ok && direct.rows[0].n === 0, direct);
const anon = await db.query(`select has_function_privilege('anon','public.get_move_in_absence_candidates(uuid)','EXECUTE') a,
  has_function_privilege('anon','private.move_in_absence_candidates_full_view(uuid)','EXECUTE') b, has_function_privilege('anon','private.move_in_absence_contact_type(uuid,text,text,jsonb)','EXECUTE') c`);
check("anon 실행 권한 없음", !anon.rows[0].a && !anon.rows[0].b && !anon.rows[0].c, anon.rows[0]);
// 화양 아닌 프로젝트 상담사: RLS 경로(담당 고객만)
const q1 = await unit(P2, "B", MQ); await hist(q1, "CALL", "부재"); await hist(q1, "CALL", "부재"); await hist(q1, "CALL", "부재");
const q2 = await unit(P2, "B", MQA); await hist(q2, "CALL", "부재"); await hist(q2, "CALL", "부재"); await hist(q2, "CALL", "부재");
const pc = await asUser(UQ, `select unit_id from public.get_move_in_absence_candidates($1)`, [P2]);
const pa = await asUser(UQA, `select unit_id from public.get_move_in_absence_candidates($1)`, [P2]);
check("일반 프로젝트 상담사: 담당 고객 세대만(RLS 경로)", pc.ok && pc.rows.length === 1 && pc.rows[0].unit_id === q1.u, pc.rows);
check("일반 프로젝트 관리자: 전체(빠른 경로)", pa.ok && pa.rows.length === 2, pa.rows);
const tq = await asUser(UA, `select count(*)::int n from public.get_move_in_today_queue($1, now())`, [STAYJ]);
check("오늘 관리대상 조회 정상", tq.ok && tq.rows[0].n > 0, tq);

// 롤백 → 20261017120000 정의 복원 → 재적용
await db.query("drop function public.test_absence_rls(uuid)");
await db.query(read(`rollback/${NEW}.rollback.sql`));
check("롤백 후 함수 원문·ACL이 적용 전과 동일", JSON.stringify(await defs()) === JSON.stringify(before), await defs());
let re = true; try { await db.query(read(`migrations/${NEW}.sql`)); } catch (e) { re = e.message; }
check("롤백 후 재적용", re === true, re);

await db.end();
console.log(out.join("\n"));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
