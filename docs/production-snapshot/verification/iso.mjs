// 실제 PostgreSQL 17 다중 세션 동시 저장 경합 검증(축소 스텁 스키마 + 저장소 마이그레이션 원문)
import pg from "pg";
import fs from "node:fs";

const ROOT = "C:/Users/PC-1/DecisionOS-dev/supabase/";
const PGDIR = "C:/Users/PC-1/DecisionOS-dev/docs/production-snapshot/verification/";
const read = (p) => fs.readFileSync(ROOT + p, "utf8");
const stripPreflight = (sql) => sql.replace(/do \$preflight\$[\s\S]*?\$preflight\$;/, "");
const base = { host: "127.0.0.1", port: 54329, user: "postgres", password: "localtest" };

let pass = 0, fail = 0;
const out = [];
const check = (name, cond, detail) => {
  if (cond) { pass++; out.push(`ok   ${name}`); }
  else { fail++; out.push(`FAIL ${name}${detail === undefined ? "" : " :: " + JSON.stringify(detail)}`); }
};

// ---------- 격리 DB 생성 ----------
{
  const admin = new pg.Client({ ...base, database: "postgres" });
  await admin.connect();
  await admin.query("drop database if exists stayj_iso");
  await admin.query("drop role if exists anon");
  await admin.query("drop role if exists authenticated");
  await admin.query("create database stayj_iso");
  await admin.end();
}
const cfg = { ...base, database: "stayj_iso" };
const sup = new pg.Client(cfg);
await sup.connect();
await sup.query(fs.readFileSync(PGDIR + "stub-schema.sql", "utf8"));
await sup.query(stripPreflight(read("migrations/20261009100000_absent_contact_separation.sql")));
await sup.query(fs.readFileSync(PGDIR + "guarded18.sql", "utf8"));
for (const m of ["20261015100000_today_queue_cd_focus", "20261017100000_absence_streak_visit_target",
  "20261017110000_consultation_d_grade_admin_guard", "20261017120000_absence_auto_d_grade"]) {
  await sup.query(read(`migrations/${m}.sql`));
}
check("마이그레이션 4개 순서 적용(사전 점검 포함, 실제 PostgreSQL 17)", true);
const ver = (await sup.query("show server_version")).rows[0].server_version;
const iso = (await sup.query("show default_transaction_isolation")).rows[0].default_transaction_isolation;

const P = "10000000-0000-4000-8000-000000000001";
const ADMIN_U = "30000000-0000-4000-8000-0000000000a1", ADMIN_M = "40000000-0000-4000-8000-0000000000a1";
const COUN_U = "30000000-0000-4000-8000-0000000000c1", COUN_M = "40000000-0000-4000-8000-0000000000c1";
await sup.query(`insert into public.project values ('${P}','P');
  insert into public.project_member values ('${ADMIN_M}','${P}','${ADMIN_U}','PROJECT_ADMIN',true),('${COUN_M}','${P}','${COUN_U}','COUNSELOR',true);`);

let seq = 0;
async function unit(grade, priorAbsences) {
  seq++;
  const u = `8f000000-0000-4000-8000-${String(seq).padStart(12, "0")}`;
  const c = `50000000-0000-4000-8000-${String(seq).padStart(12, "0")}`;
  await sup.query(`insert into public.project_unit values ($1,$2,'101',$3)`, [u, P, String(seq)]);
  await sup.query(`insert into public.customer values ($1,$2,'x',$3)`, [c, P, COUN_M]);
  const k = (await sup.query(`insert into public.contract(project_id,unit_id,customer_id) values ($1,$2,$3) returning contract_id`, [P, u, c])).rows[0].contract_id;
  await sup.query(`insert into public.unit_occupancy_status(project_id,unit_id,contract_id,legacy_grade) values ($1,$2,$3,$4)`, [P, u, k, grade]);
  for (let i = 0; i < priorAbsences; i++) {
    await sup.query(`insert into public.consultation(project_id,customer_id,counselor_id,consulted_at,content,created_by,unit_id,contact_type,stage,structured_tags)
      values ($1,$2,$3, now() - make_interval(hours => $4::int), 'prior', $3, $5, 'CALL', 'MOVE_IN', '{"legacy_grade":"부재"}')`, [P, c, COUN_M, 10 + i, u]);
  }
  return { u, c, k };
}
const state = async ({ u }) => ({
  grade: (await sup.query(`select legacy_grade from public.unit_occupancy_status where unit_id=$1`, [u])).rows[0].legacy_grade,
  hist: Number((await sup.query(`select count(*) from public.contract_status_history where unit_id=$1 and field_changed='legacy_grade'`, [u])).rows[0].count),
  openVt: Number((await sup.query(`select count(*) from public.move_in_visit_target where unit_id=$1 and status in ('VISIT_NEEDED','REVISIT_NEEDED')`, [u])).rows[0].count),
  allVt: Number((await sup.query(`select count(*) from public.move_in_visit_target where unit_id=$1`, [u])).rows[0].count),
  cons: Number((await sup.query(`select count(*) from public.consultation where unit_id=$1`, [u])).rows[0].count),
});

async function session(userId) {
  const c = new pg.Client({ ...cfg, application_name: "iso-" + userId.slice(-2) });
  await c.connect();
  return c;
}
const SAVE17 = `select public.create_move_in_consultation(p_project_id:=$1,p_unit_id:=$2,p_customer_id:=$3,p_consultation_type:='OUTBOUND',p_content:='x',p_legacy_grade:=$4) as id`;
const SAVE18 = `select public.create_move_in_consultation(p_project_id:=$1,p_unit_id:=$2,p_customer_id:=$3,p_consultation_type:='OUTBOUND',p_content:='x',p_expected_contract_id:=$5,
  p_legacy_grade:=$4,p_next_contact_at:=null,p_occupancy_intent:=null,p_funding_status:=null,p_move_in_status:=null,p_planned_move_in_date:=null,
  p_balance_paid_at:=null,p_actual_move_in_date:=null,p_reason:=null,p_business_purpose:=null,p_clear_next_contact_at:=false,p_operational_intent:=null) as id`;
// PostgREST와 같은 형태: 요청당 트랜잭션 1개, role authenticated, JWT sub 설정
async function rpc(client, userId, t, grade, path = 17) {
  await client.query("begin");
  try {
    await client.query("select set_config('request.jwt.claim.sub', $1, true)", [userId]);
    await client.query("set local role authenticated");
    const r = path === 18 ? await client.query(SAVE18, [P, t.u, t.c, grade, t.k]) : await client.query(SAVE17, [P, t.u, t.c, grade]);
    await client.query("commit");
    return { ok: true, id: r.rows[0].id };
  } catch (e) { await client.query("rollback"); return { ok: false, error: e.message }; }
}

// ---------- 1. 잠금 대기 강제: A 커밋 전 B 저장 ----------
{
  const t = await unit("B", 2);
  const a = await session(COUN_U), b = await session(COUN_U);
  await a.query("begin");
  await a.query("select set_config('request.jwt.claim.sub', $1, true)", [COUN_U]);
  await a.query("set local role authenticated");
  await a.query(SAVE17, [P, t.u, t.c, "부재"]); // 3회째 → 자동 D, 미커밋
  const bPid = (await b.query("select pg_backend_pid() as p")).rows[0].p;
  const bDone = rpc(b, COUN_U, t, "부재"); // 4회째: 계약 행 잠금 대기여야 함
  let waiting = false;
  for (let i = 0; i < 50 && !waiting; i++) {
    const w = await sup.query(`select wait_event_type from pg_stat_activity where pid=$1`, [bPid]);
    waiting = w.rows[0]?.wait_event_type === "Lock";
    if (!waiting) await new Promise((res) => setTimeout(res, 100));
  }
  check("B 세션이 A 커밋 전 계약 행 잠금에서 대기", waiting);
  await a.query("commit");
  const rb = await bDone;
  const s = await state(t);
  check("A·B 모두 저장 성공", rb.ok, rb);
  check("잠금 대기 경합: D 1회, 이력 1건, 방문대상 1건, 상담 2건 추가", s.grade === "D" && s.hist === 1 && s.allVt === 1 && s.cons === 4, s);
  await a.end(); await b.end();
}

// ---------- 2. 무작위 동시 저장(10세션 × 20세대) ----------
{
  const units = [];
  for (let i = 0; i < 20; i++) units.push(await unit(i % 4 === 0 ? "D" : ["A", "B", "C"][i % 3], 2));
  const clients = await Promise.all(Array.from({ length: 10 }, () => session(COUN_U)));
  const jobs = [];
  for (const t of units) for (let j = 0; j < 10; j++) jobs.push(rpc(clients[j], COUN_U, t, "부재", j % 2 ? 18 : 17));
  const res = await Promise.all(jobs);
  check("동시 저장 200건 모두 성공(교착·오류 없음)", res.every((x) => x.ok), res.filter((x) => !x.ok).slice(0, 3));
  let bad = [];
  for (const [i, t] of units.entries()) {
    const s = await state(t);
    const wasD = i % 4 === 0;
    const okUnit = s.grade === "D" && s.hist === (wasD ? 0 : 1) && s.allVt === 1 && s.openVt === 1 && s.cons === 12;
    if (!okUnit) bad.push({ i, wasD, ...s });
  }
  check("20세대 모두: 이력 정확히 1건(기존 D는 0건)·방문대상 1건·상담 10건 반영", bad.length === 0, bad.slice(0, 3));
  await Promise.all(clients.map((c) => c.end()));
}

// ---------- 3. 17인자·18인자 경로 동시 ----------
{
  let dup = 0;
  for (let round = 0; round < 15; round++) {
    const t = await unit("C", 2);
    const a = await session(COUN_U), b = await session(COUN_U);
    const [ra, rb] = await Promise.all([rpc(a, COUN_U, t, "부재", 17), rpc(b, COUN_U, t, "부재", 18)]);
    const s = await state(t);
    if (!(ra.ok && rb.ok && s.grade === "D" && s.hist === 1 && s.allVt === 1)) dup++;
    await a.end(); await b.end();
  }
  check("17인자·18인자 동시 저장 15회: 매번 자동 전환 정확히 1회", dup === 0, dup);
  // 단일 18인자 저장이 내부 17인자 호출로 자동 전환을 두 번 실행하지 않음
  const t = await unit("B", 2);
  const c = await session(COUN_U);
  const r = await rpc(c, COUN_U, t, "부재", 18);
  const s = await state(t);
  check("18인자 단일 저장: 이력 1건·방문대상 1건(이중 실행 없음)", r.ok && s.hist === 1 && s.allVt === 1 && s.cons === 3, s);
  await c.end();
}

// ---------- 4. 관리자 수동 D vs 상담사 부재(자동 전환) 동시 ----------
{
  let problems = [], autoFirst = 0, manualFirst = 0;
  for (let round = 0; round < 30; round++) {
    const t = await unit("B", 2);
    const a = await session(ADMIN_U), b = await session(COUN_U);
    const [ra, rb] = await Promise.all([rpc(a, ADMIN_U, t, "D"), rpc(b, COUN_U, t, "부재")]);
    const s = await state(t);
    const order = (await sup.query(`select structured_tags->>'legacy_grade' g from public.consultation where unit_id=$1 and content='x' order by consulted_at, id`, [t.u])).rows.map((x) => x.g);
    // 자동 전환 먼저(부재 → 관리자 D): 이력 1(B→D)·방문대상 1. 관리자 D 먼저(실제 접촉 → 연속 부재 초기화): 이력 0·방문대상 0
    const autoOk = s.hist === 1 && s.allVt === 1;
    const manualOk = s.hist === 0 && s.allVt === 0;
    if (autoOk) autoFirst++; else if (manualOk) manualFirst++;
    if (!(ra.ok && rb.ok && s.grade === "D" && (autoOk || manualOk))) problems.push({ round, order, ...s });
    await a.end(); await b.end();
  }
  check(`관리자 수동 D·자동 전환 동시 30회: 결과는 두 정상 패턴뿐(자동 먼저 ${autoFirst}회 / 수동 먼저 ${manualFirst}회), 중복 이력·방문대상 없음`, problems.length === 0, problems.slice(0, 3));
  // 상담사 수동 D vs 상담사 부재 동시: 수동 D가 먼저면 거부(B→D 직접 변경 불가),
  // 부재가 먼저면 자동 전환 후 D 재확인으로 허용. 어느 쪽이든 B→D 변경은 자동 전환 1회뿐
  let bad2 = [], denied = 0, reconfirm = 0;
  for (let round = 0; round < 30; round++) {
    const t = await unit("B", 2);
    const a = await session(COUN_U), b = await session(COUN_U);
    const [ra, rb] = await Promise.all([rpc(a, COUN_U, t, "D"), rpc(b, COUN_U, t, "부재")]);
    const s = await state(t);
    const h = (await sup.query(`select reason from public.contract_status_history where unit_id=$1`, [t.u])).rows;
    if (!ra.ok && /not authorized/.test(ra.error)) denied++; else if (ra.ok) reconfirm++;
    const ok = rb.ok && s.grade === "D" && s.hist === 1 && s.allVt === 1 && h[0]?.reason === "장기 부재중(연속 3회)"
      && ((!ra.ok && /not authorized/.test(ra.error) && s.cons === 3) || (ra.ok && s.cons === 4));
    if (!ok) bad2.push({ round, ra, rb, ...s });
    await a.end(); await b.end();
  }
  check(`상담사 수동 D·부재 동시 30회: D 전환은 항상 자동 전환 1회(수동 D 거부 ${denied}회 / 자동 후 D 재확인 ${reconfirm}회)`, bad2.length === 0, bad2.slice(0, 3));
}

await sup.end();
console.log(`PostgreSQL ${ver} / default isolation: ${iso}`);
console.log(out.join("\n"));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
