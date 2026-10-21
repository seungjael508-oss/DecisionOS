// 운영 스키마(CSV 조립본) 위 실제 PostgreSQL 17 검증
// 마이그레이션 전후 ACL·기존 이력 보존, field_changed CHECK, 프로젝트 간 IDOR·RLS, 자동 D·방문대상·방문 결과,
// 다중 세션 경합, legacy_grade 이력 존재 시 롤백 중단, 이력 없을 때 역순 롤백 후 원래 제약 복원·재적용
// 사용: node iso-prod.mjs <운영 스키마 SQL(rebuild-from-export.mjs 결과)>
// 운영 create_move_in_consultation(17)은 authenticated 실행 권한이 없으므로 저장은 18인자 경로만 쓴다.
import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const schemaFile = process.argv[2];
const read = (p) => fs.readFileSync(path.join(root, "supabase", p), "utf8");
const base = { host: "127.0.0.1", port: 54329, user: "postgres", password: "localtest" };
const MIGS = ["20261015100000_today_queue_cd_focus", "20261017100000_absence_streak_visit_target",
  "20261017110000_consultation_d_grade_admin_guard", "20261017120000_absence_auto_d_grade"];
const ROLLBACKS = [...MIGS].reverse();

let pass = 0, fail = 0;
const out = [];
const check = (name, cond, detail) => {
  if (cond) { pass++; out.push(`ok   ${name}`); }
  else { fail++; out.push(`FAIL ${name}${detail === undefined ? "" : " :: " + JSON.stringify(detail)}`); }
};

const P1 = "21000000-0000-4000-8000-000000000001", P2 = "21000000-0000-4000-8000-000000000002";
const ORG = "11000000-0000-4000-8000-000000000001";
const UA1 = "31000000-0000-4000-8000-0000000000a1", MA1 = "41000000-0000-4000-8000-0000000000a1"; // P1 관리자
const UC1 = "31000000-0000-4000-8000-0000000000c1", MC1 = "41000000-0000-4000-8000-0000000000c1"; // P1 상담사
const UA2 = "31000000-0000-4000-8000-0000000000a2", MA2 = "41000000-0000-4000-8000-0000000000a2"; // P2 관리자

async function freshDb(name) {
  const admin = new pg.Client({ ...base, database: "postgres" });
  await admin.connect();
  await admin.query(`drop database if exists ${name}`);
  await admin.query(`create database ${name}`);
  await admin.end();
  const db = new pg.Client({ ...base, database: name });
  await db.connect();
  db.on("notice", () => {});
  await db.query(fs.readFileSync(path.join(here, "isolated-supabase-bootstrap.sql"), "utf8"));
  await db.query(fs.readFileSync(schemaFile, "utf8"));
  return db;
}
const applyAll = async (db) => { for (const m of MIGS) await db.query(read(`migrations/${m}.sql`)); };
const checkDef = async (db) => (await db.query(`select pg_get_constraintdef(oid) d from pg_constraint
  where conname = 'contract_status_history_field_changed_check'`)).rows.map((r) => r.d);

// 비식별 고정 데이터: 조직 1, 프로젝트 2, 멤버 3
async function seedBase(db) {
  await db.query(`insert into auth.users(id) values ($1),($2),($3) on conflict do nothing`, [UA1, UC1, UA2]);
  await db.query(`insert into public.organization(id, name) values ($1, 'iso-org')`, [ORG]);
  await db.query(`insert into public.project(id, organization_id, name) values ($1, $3, 'iso-p1'), ($2, $3, 'iso-p2')`, [P1, P2, ORG]);
  await db.query(`insert into public.project_member(id, project_id, user_id, role, active) values
    ($1, $4, $5, 'PROJECT_ADMIN', true), ($2, $4, $6, 'COUNSELOR', true), ($3, $7, $8, 'PROJECT_ADMIN', true)`,
    [MA1, MC1, MA2, P1, UA1, UC1, P2, UA2]);
}

let seq = 0;
async function unit(db, grade, priorAbsences) {
  seq++;
  const n = String(seq).padStart(12, "0");
  const u = `8e000000-0000-4000-8000-${n}`, c = `51000000-0000-4000-8000-${n}`;
  await db.query(`insert into public.project_unit(unit_id, project_id, building_no, unit_no) values ($1, $2, '990', $3)`, [u, P1, String(seq)]);
  const phone = `010-9${String(seq).padStart(3, "0")}-${String(seq).padStart(4, "0")}`;
  await db.query(`insert into public.customer(id, project_id, name, phone, phone_raw, assigned_counselor_id) values ($1, $2, 'iso', $3, $3, $4)`, [c, P1, phone, MC1]);
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [UA1]);
  const k = (await db.query(`select public.create_contract($1, $2, $3) as k`, [P1, c, u])).rows[0].k;
  await db.query(`select set_config('request.jwt.claim.sub', '', false)`);
  const has = (await db.query(`select count(*)::int n from public.unit_occupancy_status where unit_id = $1`, [u])).rows[0].n;
  if (!has) await db.query(`insert into public.unit_occupancy_status(project_id, unit_id, contract_id) values ($1, $2, $3)`, [P1, u, k]);
  await db.query(`update public.unit_occupancy_status set legacy_grade = $2 where unit_id = $1`, [u, grade]);
  for (let i = 0; i < priorAbsences; i++) {
    await db.query(`insert into public.consultation(project_id, customer_id, counselor_id, consulted_at, content, created_by, unit_id, contact_type, stage, structured_tags)
      values ($1, $2, $3, now() - make_interval(hours => $4::int), 'prior', $3, $5, 'CALL', 'MOVE_IN', '{"legacy_grade":"부재"}')`, [P1, c, MC1, 10 + i, u]);
  }
  return { u, c, k };
}
const state = async (db, { u }) => ({
  grade: (await db.query(`select legacy_grade from public.unit_occupancy_status where unit_id = $1`, [u])).rows[0].legacy_grade,
  hist: Number((await db.query(`select count(*) from public.contract_status_history where unit_id = $1 and field_changed = 'legacy_grade'`, [u])).rows[0].count),
  openVt: Number((await db.query(`select count(*) from public.move_in_visit_target where unit_id = $1 and status in ('VISIT_NEEDED','REVISIT_NEEDED')`, [u])).rows[0].count),
  allVt: Number((await db.query(`select count(*) from public.move_in_visit_target where unit_id = $1`, [u])).rows[0].count),
  cons: Number((await db.query(`select count(*) from public.consultation where unit_id = $1`, [u])).rows[0].count),
});

const SAVE18 = `select public.create_move_in_consultation(p_project_id:=$1,p_unit_id:=$2,p_customer_id:=$3,p_consultation_type:='OUTBOUND',p_content:='x',p_expected_contract_id:=$5,
  p_legacy_grade:=$4,p_next_contact_at:=null,p_occupancy_intent:=null,p_funding_status:=null,p_move_in_status:=null,p_planned_move_in_date:=null,
  p_balance_paid_at:=null,p_actual_move_in_date:=null,p_reason:=null,p_business_purpose:=null,p_clear_next_contact_at:=false,p_operational_intent:=null) as id`;
const SAVE17 = `select public.create_move_in_consultation(p_project_id:=$1,p_unit_id:=$2,p_customer_id:=$3,p_consultation_type:='OUTBOUND',p_content:='x',p_legacy_grade:=$4) as id`;
// PostgREST와 같은 형태: 요청당 트랜잭션 1개, role authenticated(또는 anon), JWT sub 설정
async function asUser(client, userId, sql, params, role = "authenticated") {
  await client.query("begin");
  try {
    await client.query("select set_config('request.jwt.claim.sub', $1, true)", [userId ?? ""]);
    await client.query(`set local role ${role}`);
    const r = await client.query(sql, params);
    await client.query("commit");
    return { ok: true, rows: r.rows };
  } catch (e) { await client.query("rollback"); return { ok: false, code: e.code, error: e.message }; }
}
const save = (client, userId, t, grade, project = P1) => asUser(client, userId, SAVE18, [project, t.u, t.c, grade, t.k]);

// ================= A. 적용 전후: 기존 데이터·ACL 보존, CHECK =================
const db = await freshDb("stayj_isoprod");
const cfg = { ...base, database: "stayj_isoprod" };
await seedBase(db);
const pre = await unit(db, "B", 0);
await db.query(`insert into public.contract_status_history(project_id, contract_id, unit_id, field_changed, previous_value, new_value, reason, changed_by)
  values ($1, $2, $3, 'operational_intent', 'UNDECIDED', 'MOVE_IN', 'pre-existing', $4)`, [P1, pre.k, pre.u, MA1]);
const dataSig = async () => (await db.query(`select
  (select md5(coalesce(string_agg(t::text, '|' order by history_id), '')) from public.contract_status_history t) h,
  (select md5(coalesce(string_agg(t::text, '|' order by id), '')) from public.consultation t) c,
  (select md5(coalesce(string_agg(t::text, '|' order by occupancy_status_id), '')) from public.unit_occupancy_status t) o`)).rows[0];
const aclSig = async () => (await db.query(`select p.oid::regprocedure::text f, coalesce(p.proacl::text, '') acl
  from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('create_move_in_consultation', 'get_move_in_today_queue')
  order by 1`)).rows;
const defBefore = await checkDef(db);
const dataBefore = await dataSig(), aclBefore = await aclSig();
let applied = true;
try { await applyAll(db); } catch (e) { applied = false; check("마이그레이션 4개 순서 적용(운영 스키마 원본)", false, e.message); }
if (applied) check("마이그레이션 4개 순서 적용(운영 스키마 원본, shim 없음)", true);
check("기존 이력·상담·점유상태 행 변경 없음", JSON.stringify(await dataSig()) === JSON.stringify(dataBefore));
check("상담 저장 RPC 17·18인자, 오늘 관리대상 함수 ACL 변경 없음", JSON.stringify(await aclSig()) === JSON.stringify(aclBefore), await aclSig());
const priv = (await db.query(`select
  (select bool_and(has_function_privilege('authenticated', oid, 'EXECUTE')) from pg_proc where proname = 'create_move_in_consultation' and pronargs = 18) a18,
  (select bool_or(has_function_privilege('authenticated', oid, 'EXECUTE')) from pg_proc where proname = 'create_move_in_consultation' and pronargs = 17) a17,
  (select bool_or(has_function_privilege('anon', oid, 'EXECUTE')) from pg_proc where pronamespace = 'public'::regnamespace
     and proname in ('create_move_in_consultation', 'get_move_in_absence_candidates', 'record_move_in_visit_result', 'get_move_in_today_queue')) anon_any,
  has_function_privilege('authenticated', 'public.get_move_in_absence_candidates(uuid)', 'EXECUTE') a_cand,
  has_function_privilege('authenticated', 'public.record_move_in_visit_result(uuid,uuid,uuid,text,text,occupancy_intent)', 'EXECUTE') a_visit,
  has_table_privilege('anon', 'public.move_in_visit_target', 'SELECT') anon_vt,
  has_table_privilege('authenticated', 'public.move_in_visit_target', 'INSERT') auth_vt_ins`)).rows[0];
check("ACL: 18인자 authenticated 허용, 17인자 authenticated 차단 유지", priv.a18 === true && priv.a17 === false, priv);
check("ACL: anon은 상담·방문·후보·오늘 관리대상 함수 실행 불가", priv.anon_any === false, priv);
check("ACL: 신규 후보·방문 결과 함수 authenticated 허용, 방문대상 테이블 anon 조회·authenticated 직접 쓰기 불가",
  priv.a_cand && priv.a_visit && !priv.anon_vt && !priv.auth_vt_ins, priv);
const defAfter = await checkDef(db);
check("field_changed CHECK: 기존 4개 값 + legacy_grade만 추가", defAfter.length === 1
  && ["occupancy_intent", "funding_status", "move_in_status", "operational_intent", "legacy_grade"].every((v) => defAfter[0].includes(`'${v}'`))
  && (defAfter[0].match(/'[a-z_]+'/g) ?? []).length === 5, defAfter);
const bogus = await db.query(`insert into public.contract_status_history(project_id, contract_id, unit_id, field_changed, changed_by)
  values ($1, $2, $3, 'bogus', $4)`, [P1, pre.k, pre.u, MA1]).then(() => "inserted", (e) => e.code);
check("field_changed CHECK: 허용 외 값은 계속 거부(23514)", bogus === "23514", bogus);

// ================= B. 프로젝트 간 IDOR·권한·RLS =================
{
  const s = new pg.Client(cfg); await s.connect();
  const t = await unit(db, "B", 0);
  const before = await state(db, t);
  const r1 = await save(s, UA2, t, "D");
  check("타 프로젝트 관리자: P1 세대 D 저장 거부", !r1.ok && r1.code === "42501", r1);
  const r2 = await save(s, UA2, t, "D", P2);
  check("타 프로젝트 관리자: 자기 프로젝트 ID로 P1 세대 저장 거부", !r2.ok, r2);
  const r3 = await save(s, UC1, t, "D");
  check("같은 프로젝트 상담사: B→D 직접 변경 거부(42501)", !r3.ok && r3.code === "42501", r3);
  check("거부된 저장은 상태·이력·상담 변경 없음", JSON.stringify(await state(db, t)) === JSON.stringify(before), await state(db, t));
  const r4 = await asUser(s, null, SAVE18, [P1, t.u, t.c, "D", t.k], "anon");
  check("anon: 18인자 저장 불가", !r4.ok, r4);
  const r5 = await asUser(s, UC1, SAVE17, [P1, t.u, t.c, "B"]);
  check("상담사: 17인자 직접 호출 차단", !r5.ok && r5.code === "42501", r5);
  // 수동 등급 변경은 20261009 정의대로 상담 기록(structured_tags.legacy_grade)에 남고 contract_status_history에는 쓰지 않는다
  const r6 = await save(s, UA1, t, "D");
  const st = await state(db, t);
  const tag = (await db.query(`select structured_tags->>'legacy_grade' g, counselor_id from public.consultation where unit_id = $1 order by consulted_at desc limit 1`, [t.u])).rows[0];
  check("P1 관리자: B→D 저장 허용(등급 D, 상담 기록에 D·작성자 관리자, 이력 테이블 미기록)", r6.ok && st.grade === "D" && st.hist === 0
    && tag?.g === "D" && tag?.counselor_id === MA1, { r6, st, tag });

  // 자동 D·방문대상
  const a = await unit(db, "C", 2);
  const r7 = await save(s, UC1, a, "부재");
  const sa = await state(db, a);
  const ha = (await db.query(`select previous_value, new_value, reason from public.contract_status_history where unit_id = $1 and field_changed = 'legacy_grade'`, [a.u])).rows;
  check("상담사 전화 부재 3회째: 자동 D, 이력 1건(C→D, 장기 부재중(연속 3회)), 방문대상 1건", r7.ok && sa.grade === "D" && sa.allVt === 1 && sa.openVt === 1
    && ha.length === 1 && ha[0].previous_value === "C" && ha[0].reason === "장기 부재중(연속 3회)", { r7, sa, ha });
  const vt = (await db.query(`select visit_target_id from public.move_in_visit_target where unit_id = $1`, [a.u])).rows[0]?.visit_target_id;
  const VIS = `select public.record_move_in_visit_result($1, $2, $3, $4, 'visit', $5::public.occupancy_intent) as id`;
  const v1 = await asUser(s, UA2, VIS, [P1, vt, a.k, "VISITED", "SELF_MOVE_IN"]);
  check("타 프로젝트 관리자: P1 방문 결과 저장 거부", !v1.ok, v1);
  const v1b = await asUser(s, UA2, VIS, [P2, vt, a.k, "VISITED", "SELF_MOVE_IN"]);
  check("타 프로젝트 관리자: 자기 프로젝트 ID로 P1 방문대상 저장 거부", !v1b.ok, v1b);
  const c2 = await asUser(s, UA2, `select count(*)::int n from public.get_move_in_absence_candidates($1)`, [P1]);
  check("타 프로젝트 관리자: P1 장기 부재 후보 조회 불가(오류 또는 0건)", !c2.ok || c2.rows[0].n === 0, c2);
  const rl2 = await asUser(s, UA2, `select count(*)::int n from public.move_in_visit_target where project_id = $1`, [P1]);
  const rl1 = await asUser(s, UC1, `select count(*)::int n from public.move_in_visit_target where project_id = $1`, [P1]);
  check("RLS: 타 프로젝트 관리자는 P1 방문대상 0건, P1 상담사는 조회 가능", rl2.ok && rl2.rows[0].n === 0 && rl1.ok && rl1.rows[0].n >= 1, { rl2, rl1 });
  const v2 = await asUser(s, UC1, VIS, [P1, vt, a.k, "REVISIT_NEEDED", null]);
  const sv2 = await state(db, a);
  check("방문 결과 재방문 필요: 상태 REVISIT_NEEDED, 기본등급 D 유지, 이력 추가 없음", v2.ok && sv2.grade === "D" && sv2.hist === 1 && sv2.openVt === 1
    && (await db.query(`select status from public.move_in_visit_target where visit_target_id = $1`, [vt])).rows[0].status === "REVISIT_NEEDED", { v2, sv2 });
  const v3 = await asUser(s, UC1, VIS, [P1, vt, a.k, "VISITED", "SELF_MOVE_IN"]);
  const vrow = (await db.query(`select status, visit_intent::text from public.move_in_visit_target where visit_target_id = $1`, [vt])).rows[0];
  const sv3 = await state(db, a);
  check("방문 결과 방문 완료: VISITED·의향 기록, 기본등급 D 유지, 이력 추가 없음", v3.ok && vrow.status === "VISITED" && vrow.visit_intent === "SELF_MOVE_IN"
    && sv3.grade === "D" && sv3.hist === 1 && sv3.openVt === 0, { v3, vrow, sv3 });
  const v4 = await asUser(s, UC1, VIS, [P1, vt, a.k, "VISITED", "SELF_MOVE_IN"]);
  check("완료된 방문대상 재저장 거부", !v4.ok, v4);
  await s.end();
}

// ================= C. 다중 세션 경합(18인자) =================
const session = async () => { const c = new pg.Client(cfg); await c.connect(); return c; };
{
  const t = await unit(db, "B", 2);
  const a = await session(), b = await session();
  await a.query("begin");
  await a.query("select set_config('request.jwt.claim.sub', $1, true)", [UC1]);
  await a.query("set local role authenticated");
  await a.query(SAVE18, [P1, t.u, t.c, "부재", t.k]); // 3회째 → 자동 D, 미커밋
  const bPid = (await b.query("select pg_backend_pid() as p")).rows[0].p;
  const bDone = save(b, UC1, t, "부재");
  let waiting = false;
  for (let i = 0; i < 50 && !waiting; i++) {
    const w = await db.query(`select wait_event_type from pg_stat_activity where pid = $1`, [bPid]);
    waiting = w.rows[0]?.wait_event_type === "Lock";
    if (!waiting) await new Promise((res) => setTimeout(res, 100));
  }
  check("경합: B 세션이 A 커밋 전 잠금 대기", waiting);
  await a.query("commit");
  const rb = await bDone;
  const s = await state(db, t);
  check("경합: A·B 저장 성공, D 1회·이력 1건·방문대상 1건·상담 2건 추가", rb.ok && s.grade === "D" && s.hist === 1 && s.allVt === 1 && s.cons === 4, { rb, s });
  await a.end(); await b.end();
}
{
  const units = [];
  for (let i = 0; i < 20; i++) units.push(await unit(db, i % 4 === 0 ? "D" : ["A", "B", "C"][i % 3], 2));
  const clients = await Promise.all(Array.from({ length: 10 }, session));
  const jobs = [];
  for (const t of units) for (let j = 0; j < 10; j++) jobs.push(save(clients[j], UC1, t, "부재"));
  const res = await Promise.all(jobs);
  check("경합: 10세션×20세대 동시 저장 200건 모두 성공(교착·오류 없음)", res.every((x) => x.ok), res.filter((x) => !x.ok).slice(0, 3));
  const bad = [];
  for (const [i, t] of units.entries()) {
    const s = await state(db, t);
    const wasD = i % 4 === 0;
    if (!(s.grade === "D" && s.hist === (wasD ? 0 : 1) && s.allVt === 1 && s.openVt === 1 && s.cons === 12)) bad.push({ i, wasD, ...s });
  }
  check("경합: 20세대 모두 이력 정확히 1건(기존 D 0건)·방문대상 1건·상담 10건", bad.length === 0, bad.slice(0, 3));
  await Promise.all(clients.map((c) => c.end()));
}
{
  const problems = [];
  let autoFirst = 0, manualFirst = 0;
  for (let round = 0; round < 20; round++) {
    const t = await unit(db, "B", 2);
    const a = await session(), b = await session();
    const [ra, rb] = await Promise.all([save(a, UA1, t, "D"), save(b, UC1, t, "부재")]);
    const s = await state(db, t);
    // 자동 전환 먼저(부재 → 관리자 D 재확인): 이력 1·방문대상 1. 관리자 D 먼저(실제 접촉 → 연속 부재 초기화): 이력 0·방문대상 0
    const autoOk = s.hist === 1 && s.allVt === 1, manualOk = s.hist === 0 && s.allVt === 0;
    if (autoOk) autoFirst++; else if (manualOk) manualFirst++;
    if (!(ra.ok && rb.ok && s.grade === "D" && (autoOk || manualOk))) problems.push({ round, ra, rb, ...s });
    await a.end(); await b.end();
  }
  check(`경합: 관리자 D·상담사 부재 동시 20회 — 결과는 두 정상 패턴뿐(자동 먼저 ${autoFirst} / 수동 먼저 ${manualFirst}), 중복 이력·방문대상 없음`, problems.length === 0, problems.slice(0, 3));
  const bad2 = [];
  let denied = 0, reconfirm = 0;
  for (let round = 0; round < 20; round++) {
    const t = await unit(db, "B", 2);
    const a = await session(), b = await session();
    const [ra, rb] = await Promise.all([save(a, UC1, t, "D"), save(b, UC1, t, "부재")]);
    const s = await state(db, t);
    if (!ra.ok && ra.code === "42501") denied++; else if (ra.ok) reconfirm++;
    const ok = rb.ok && s.grade === "D" && s.hist === 1 && s.allVt === 1
      && ((!ra.ok && ra.code === "42501" && s.cons === 3) || (ra.ok && s.cons === 4));
    if (!ok) bad2.push({ round, ra, rb, ...s });
    await a.end(); await b.end();
  }
  check(`경합: 상담사 D·부재 동시 20회 — B→D는 자동 전환 1회뿐(수동 D 거부 ${denied} / 자동 후 D 재확인 ${reconfirm})`, bad2.length === 0, bad2.slice(0, 3));
}

// ================= D. legacy_grade 이력이 있을 때 롤백 중단 =================
{
  const legacyRows = Number((await db.query(`select count(*) from public.contract_status_history where field_changed = 'legacy_grade'`)).rows[0].count);
  const histSig = (await dataSig()).h;
  await db.query(read("rollback/20261017120000_absence_auto_d_grade.rollback.sql"));
  await db.query(read("rollback/20261017110000_consultation_d_grade_admin_guard.rollback.sql"));
  const r = await db.query(read("rollback/20261017100000_absence_streak_visit_target.rollback.sql")).then(() => null, (e) => e.message);
  await db.query("rollback").catch(() => {});
  const vtExists = (await db.query(`select to_regclass('public.move_in_visit_target') is not null as e`)).rows[0].e;
  check(`legacy_grade 이력 ${legacyRows}건 존재 시 20261017100000 롤백 중단`, legacyRows > 0 && /legacy_grade rows/.test(r ?? ""), r);
  check("롤백 중단 후: CHECK 5개 값 유지, 방문대상 테이블 유지, 이력 변경 없음",
    JSON.stringify(await checkDef(db)) === JSON.stringify(defAfter) && vtExists && (await dataSig()).h === histSig);
}
await db.end();

// ================= E. 이력 없을 때 역순 롤백 → 원래 제약 복원 → 재적용 =================
{
  const d2 = await freshDb("stayj_isoprod_rb");
  const def0 = await checkDef(d2);
  await applyAll(d2);
  for (const m of ROLLBACKS) await d2.query(read(`rollback/${m}.rollback.sql`));
  const def1 = await checkDef(d2);
  check("역순 롤백 4개 후 field_changed CHECK가 운영 원본 정의와 문자 그대로 동일", JSON.stringify(def1) === JSON.stringify(def0) && JSON.stringify(def0) === JSON.stringify(defBefore), { def0, def1 });
  let re = true;
  try { await applyAll(d2); } catch (e) { re = e.message; }
  check("롤백 후 마이그레이션 4개 재적용 성공", re === true, re);
  await d2.end();
}

const ver = await (async () => { const c = new pg.Client({ ...base, database: "postgres" }); await c.connect(); const v = (await c.query("show server_version")).rows[0].server_version; await c.end(); return v; })();
console.log(`PostgreSQL ${ver} / 운영 스키마: ${path.basename(schemaFile)}`);
console.log(out.join("\n"));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
