// A12(20261021100000_special_case_visit_target) 격리 검증 — 운영 스키마(CSV 조립본) + A1~A11 + 실제 PostgreSQL 17
// 사용: node iso-a12.mjs <운영 스키마 SQL>
import pg from "pg";
import fs from "node:fs";
import path from "node:path";

const REPO = "C:/Users/PC-1/DecisionOS-today";
const HERE = path.join(REPO, "docs/production-snapshot/verification");
const read = (p) => fs.readFileSync(path.join(REPO, "supabase", p), "utf8");
const base = { host: "127.0.0.1", port: 54329, user: "postgres", password: "localtest" };
const PRIOR = ["20261015100000_today_queue_cd_focus", "20261017100000_absence_streak_visit_target",
  "20261017110000_consultation_d_grade_admin_guard", "20261017120000_absence_auto_d_grade",
  "20261019100000_absence_streak_rule_fast_path", "20261019110000_today_task_completion",
  "20261019120000_rls_membership_set", "20261019130000_today_queue_materialize",
  "20261020100000_counselor_grade_change", "20261020110000_trade_funding_type"];
const A12 = "migrations/20261021100000_special_case_visit_target.sql";
const RB12 = "rollback/20261021100000_special_case_visit_target.rollback.sql";

let pass = 0, fail = 0;
const out = [];
const check = (name, cond, detail) => { if (cond) { pass++; out.push(`ok   ${name}`); } else { fail++; out.push(`FAIL ${name} :: ${JSON.stringify(detail)}`); } };

async function freshDb(name) {
  const a = new pg.Client({ ...base, database: "postgres" }); await a.connect();
  await a.query(`drop database if exists ${name}`); await a.query(`create database ${name}`); await a.end();
  const db = new pg.Client({ ...base, database: name }); await db.connect(); db.on("notice", () => {});
  await db.query(fs.readFileSync(path.join(HERE, "isolated-supabase-bootstrap.sql"), "utf8"));
  await db.query(fs.readFileSync(process.argv[2], "utf8"));
  for (const m of PRIOR) {
    try { await db.query(read(`migrations/${m}.sql`)); }
    catch (e) { await db.query("rollback").catch(() => {}); throw new Error(`${m}: ${e.message}`); }
  }
  return db;
}

const db = await freshDb("stayj_a12");
check("선행 A1~A11 10개 순서 적용(운영 스키마 원본)", true);

const STAYJ = "1283e198-5043-4027-96d6-edcc7a6686c6", P2 = "21000000-0000-4000-8000-000000000002";
const id = (p, n) => `${p}-0000-4000-8000-${String(n).padStart(12, "0")}`;
const UC = id("31000000", 1), MC = id("41000000", 1); // Stay J 상담사(배정)
const UA = id("31000000", 2), MA = id("41000000", 2); // Stay J 관리자
const UP = id("31000000", 3), MP = id("41000000", 3); // P2 관리자
const UX = id("31000000", 5), MX = id("41000000", 5); // Stay J 비활성 관리자
const UO = id("31000000", 6), MO = id("41000000", 6); // Stay J 다른 상담사(미배정)
await db.query(`insert into public.organization(id,name) values ('11000000-0000-4000-8000-000000000001','o')`);
await db.query(`insert into public.project(id,organization_id,name) values ($1,'11000000-0000-4000-8000-000000000001','s'),($2,'11000000-0000-4000-8000-000000000001','p2')`, [STAYJ, P2]);
for (const [u, m, p, role, active] of [[UC, MC, STAYJ, "COUNSELOR", true], [UA, MA, STAYJ, "PROJECT_ADMIN", true], [UP, MP, P2, "PROJECT_ADMIN", true],
  [UX, MX, STAYJ, "PROJECT_ADMIN", false], [UO, MO, STAYJ, "COUNSELOR", true]]) {
  await db.query(`insert into auth.users(id) values ($1)`, [u]);
  await db.query(`insert into public.project_member(id,project_id,user_id,role,active) values ($1,$2,$3,$4,$5)`, [m, p, u, role, active]);
}
await db.query(`insert into public.move_in_tracking_policy(project_id,reason_code,stale_after,created_by) values
  ($1,'C_GRADE_STALE','7 days',$2),($1,'D_GRADE_STALE','7 days',$2),($1,'ABSENCE_RETRY','1 day',$2)`, [STAYJ, MA]);

let seq = 0;
async function unit(grade, { absences = 0 } = {}) {
  seq++;
  const u = id("8e000000", seq), c = id("51000000", seq);
  await db.query(`insert into public.project_unit(unit_id,project_id,building_no,unit_no) values ($1,$2,'9',$3)`, [u, STAYJ, String(seq)]);
  await db.query(`insert into public.customer(id,project_id,name,phone,phone_raw,assigned_counselor_id) values ($1,$2,'n',$3,$3,$4)`, [c, STAYJ, `010-5${String(seq).padStart(3, "0")}-0000`, MC]);
  const k = (await db.query(`insert into public.contract(project_id,customer_id,unit_id,contract_status) values ($1,$2,$3,'ACTIVE') returning contract_id`, [STAYJ, c, u])).rows[0].contract_id;
  await db.query(`insert into public.unit_occupancy_status(project_id,unit_id,contract_id,legacy_grade,last_contact_at) values ($1,$2,$3,$4, now() - interval '1 day')`, [STAYJ, u, k, grade]);
  await db.query(`insert into public.consultation(project_id,customer_id,counselor_id,consulted_at,content,created_by,unit_id,contact_type,structured_tags)
    values ($1,$2,$3, now() - interval '2 days', 'h', $3, $4, 'CALL', $5)`, [STAYJ, c, MC, u, JSON.stringify({ legacy_grade: grade })]);
  for (let i = 0; i < absences; i++) {
    await db.query(`insert into public.consultation(project_id,customer_id,counselor_id,consulted_at,content,created_by,unit_id,contact_type,structured_tags)
      values ($1,$2,$3, now() - make_interval(hours => $4::int), '부재', $3, $5, 'CALL', '{"legacy_grade":"부재"}')`, [STAYJ, c, MC, 10 + i, u]);
  }
  return { u, c, k, project: STAYJ };
}
async function asUser(user, sql, params) {
  await db.query("begin");
  try {
    await db.query("select set_config('request.jwt.claim.sub', $1, true)", [user]);
    await db.query("set local role authenticated");
    const r = await db.query(sql, params);
    await db.query("commit");
    return { ok: true, rows: r.rows };
  } catch (e) { await db.query("rollback"); return { ok: false, code: e.code, error: e.message }; }
}
const special = (user, t, visit, flagged = true) => asUser(user,
  `select public.save_move_in_special_case($1,$2,$3,$4,$5,false,false,false,'NOT_REQUIRED','OPEN',null) as id`, [t.project, t.u, t.k, flagged, visit]);
const SAVE = `select public.create_move_in_consultation(p_project_id:=$1,p_unit_id:=$2,p_customer_id:=$3,p_consultation_type:='OUTBOUND',p_content:='x',p_expected_contract_id:=$5,
  p_legacy_grade:=$4,p_next_contact_at:=null,p_occupancy_intent:=null,p_funding_status:=null,p_move_in_status:=null,p_planned_move_in_date:=null,
  p_balance_paid_at:=null,p_actual_move_in_date:=null,p_reason:=null,p_business_purpose:=null,p_clear_next_contact_at:=false,p_operational_intent:=null) as id`;
const save = (user, t, grade) => asUser(user, SAVE, [t.project, t.u, t.c, grade, t.k]);
const visitResult = (user, t, vt, result, intent = null, next = null) => asUser(user,
  `select public.record_move_in_visit_result($1,$2,$3,$4,'방문',$5::public.occupancy_intent,$6::timestamptz) as id`, [t.project, vt, t.k, result, intent, next]);
const targets = async (t) => (await db.query(`select visit_target_id, status, source, absence_streak_at_open, visit_count, grade_before, created_by
  from public.move_in_visit_target where unit_id = $1 order by created_at, visit_target_id`, [t.u])).rows;
const queueRow = async (t, user = UA) => (await asUser(user, `select unit_id, reason_codes from public.get_move_in_today_queue($1, now())`, [STAYJ])).rows?.find((x) => x.unit_id === t.u) ?? null;
const visitTaskCount = async () => (await asUser(UA, `select count(*)::int n from public.get_move_in_today_queue($1, now())
  where reason_codes && array['VISIT_NEEDED','REVISIT_NEEDED']`, [STAYJ])).rows[0].n;
const grade = async (t) => (await db.query(`select legacy_grade from public.unit_occupancy_status where unit_id = $1`, [t.u])).rows[0].legacy_grade;
const gradeHistory = async (t) => (await db.query(`select previous_value as old_value, new_value from public.contract_status_history
  where contract_id = $1 and field_changed = 'legacy_grade' order by changed_at, history_id`, [t.k])).rows;

// ---------- A12 적용 전 기준 ----------
const pre = await unit("C");                       // 적용 전 이미 '방문 필요'로 저장된 세대(백필 대상)
const preOff = await unit("C");                    // 적용 전 수동지정만(방문 필요 아님)
check("적용 전: 관리자 특별관리 '방문 필요' 저장 성공", (await special(UA, pre, true)).ok);
await special(UA, preOff, false);
check("적용 전: '방문 필요' 저장해도 방문대상 없음(현행 원인 재현)", (await targets(pre)).length === 0);
const beforeCount = await visitTaskCount();
const defsBefore = (await db.query(`select p.oid::regprocedure::text f, md5(pg_get_functiondef(p.oid)) d, coalesce(p.proacl::text,'') acl from pg_proc p
  where p.proname in ('create_move_in_consultation','record_move_in_visit_result','save_move_in_special_case','move_in_today_queue','get_move_in_today_queue') order by 1`)).rows;

// ---------- 적용 ----------
let applied = true;
try { await db.query(read(A12)); } catch (e) { applied = false; await db.query("rollback").catch(() => {}); check("A12 적용", false, e.message); }
if (applied) check("A12 적용(사전 점검 통과, 단일 트랜잭션)", true);
const again = await db.query(read(A12)).then(() => null, (e) => e.message); await db.query("rollback").catch(() => {});
check("A12 재실행 시 사전 점검이 중단(중복 적용 방지)", /abort/.test(again ?? ""), again);
const defsAfter = (await db.query(`select p.oid::regprocedure::text f, md5(pg_get_functiondef(p.oid)) d, coalesce(p.proacl::text,'') acl from pg_proc p
  where p.proname in ('create_move_in_consultation','record_move_in_visit_result','save_move_in_special_case','move_in_today_queue','get_move_in_today_queue') order by 1`)).rows;
check("상담 저장·방문 결과·특별관리 저장·오늘 관리대상 함수 정의·권한 불변", JSON.stringify(defsBefore) === JSON.stringify(defsAfter));
const trgAcl = (await db.query(`select has_function_privilege('authenticated','private.open_visit_target_from_special_case()','EXECUTE') a,
  has_function_privilege('anon','private.open_visit_target_from_special_case()','EXECUTE') b`)).rows[0];
check("트리거 함수: authenticated·anon 직접 실행 불가", !trgAcl.a && !trgAcl.b, trgAcl);

const preT = await targets(pre);
check("백필: 기존 '방문 필요' 세대 1건 등록(SPECIAL_CASE, VISIT_NEEDED)", preT.length === 1 && preT[0].source === "SPECIAL_CASE" && preT[0].status === "VISIT_NEEDED", preT);
check("백필: 방문 필요 아닌 특별관리는 등록 안 함", (await targets(preOff)).length === 0);
const afterBackfill = await visitTaskCount();
out.push(`info 오늘 관리 방문상담 업무 수: 적용 전 ${beforeCount} → 적용 직후(백필) ${afterBackfill}`);
check("백필 세대가 오늘 관리 방문상담 업무로 표시", (await queueRow(pre))?.reason_codes?.includes("VISIT_NEEDED"), await queueRow(pre));

// ---------- 신규 저장 → 방문대상 생성·중복 방지 ----------
const t1 = await unit("C");
check("관리자: 수동지정+방문 필요 저장 성공", (await special(UA, t1, true)).ok);
let t1T = await targets(t1);
check("방문대상 1건 생성(SPECIAL_CASE, VISIT_NEEDED, 부재 0, 등록자=저장자)", t1T.length === 1 && t1T[0].source === "SPECIAL_CASE"
  && t1T[0].status === "VISIT_NEEDED" && t1T[0].absence_streak_at_open === 0 && t1T[0].created_by === MA && t1T[0].grade_before === "C", t1T);
check("오늘 관리 방문상담 목록에 표시(VISIT_NEEDED)", (await queueRow(t1))?.reason_codes?.includes("VISIT_NEEDED"), await queueRow(t1));
await special(UA, t1, true);
check("같은 값 재저장: 방문대상 중복 생성 없음(1건)", (await targets(t1)).length === 1);
check("방문 필요 해제 저장 성공", (await special(UA, t1, false)).ok);
t1T = await targets(t1);
check("해제해도 방문대상·이력 삭제·변경 없음", t1T.length === 1 && t1T[0].status === "VISIT_NEEDED" && t1T[0].visit_count === 0, t1T);
await special(UA, t1, true);
check("진행 중 대상이 있는 채로 다시 지정: 중복 없음(1건)", (await targets(t1)).length === 1);
await special(UA, t1, false, false);
check("특별관리 수동지정 해제: 방문대상 유지", (await targets(t1)).length === 1);

// ---------- 기존 연속 부재 대상과 공존 ----------
const t2 = await unit("C", { absences: 2 });
const s2 = await save(UC, t2, "부재");
let t2T = await targets(t2);
check("기존 규칙: 상담사 전화 부재 3회 → ABSENCE_STREAK 대상 생성 + 자동 D", s2.ok && t2T.length === 1 && t2T[0].source === "ABSENCE_STREAK"
  && t2T[0].absence_streak_at_open === 3 && (await grade(t2)) === "D", { s2, t2T });
await special(UA, t2, true);
t2T = await targets(t2);
check("부재 대상 진행 중 '방문 필요' 지정: 새 대상 없음·기존 대상 불변", t2T.length === 1 && t2T[0].source === "ABSENCE_STREAK" && t2T[0].status === "VISIT_NEEDED", t2T);
const badStreak = await db.query(`insert into public.move_in_visit_target(project_id,unit_id,contract_id,customer_id,source,absence_streak_at_open,created_by)
  values ($1,$2,$3,$4,'ABSENCE_STREAK',2,$5)`, [STAYJ, preOff.u, preOff.k, preOff.c, MA]).then(() => "inserted", (e) => e.code);
check("기존 제약 유지: ABSENCE_STREAK는 부재 3회 미만 불가", badStreak === "23514", badStreak);

// ---------- 방문 결과·재방문·완료 ----------
await special(UA, t1, true);
check("수동지정+방문 필요 재지정(진행 중 대상 있음): 1건 유지", (await targets(t1)).length === 1);
const vt1 = (await targets(t1))[0].visit_target_id;
const next = new Date(Date.now() + 3 * 86400e3).toISOString();
const r1 = await visitResult(UC, t1, vt1, "REVISIT_NEEDED", null, next);
t1T = await targets(t1);
check("상담사: 재방문 필요 저장 성공(다음 방문일 지정)", r1.ok && t1T[0].status === "REVISIT_NEEDED" && t1T[0].visit_count === 1, { r1, t1T });
const next1 = (await db.query(`select next_contact_at from public.unit_occupancy_status where unit_id = $1`, [t1.u])).rows[0].next_contact_at;
check("재방문: 다음 방문일이 다음 관리일로 기록(기존 규칙)", next1 && Math.abs(new Date(next1) - new Date(next)) < 1000, next1);
const r2 = await visitResult(UC, t1, vt1, "VISITED", "SELF_MOVE_IN");
t1T = await targets(t1);
check("상담사: 방문 완료 저장 성공(대상 종료)", r2.ok && t1T[0].status === "VISITED" && t1T[0].visit_count === 2, { r2, t1T });
check("완료 후 오늘 관리에서 '방문 완료'로 표시", (await queueRow(t1))?.reason_codes?.includes("VISIT_DONE"), await queueRow(t1));
const r3 = await visitResult(UC, t1, vt1, "VISITED", "SELF_MOVE_IN");
check("종료된 대상 재처리 거부", !r3.ok && /closed/.test(r3.error), r3);
await special(UA, t1, true);
check("완료 후 같은 '방문 필요' 유지 재저장: 재생성 없음", (await targets(t1)).length === 1);
await special(UA, t1, false); await special(UA, t1, true);
t1T = await targets(t1);
check("완료 후 해제→재지정: 새 방문 요청 1건(이전 완료 이력 보존)", t1T.length === 2 && t1T[0].status === "VISITED" && t1T[1].status === "VISIT_NEEDED", t1T);

// ---------- 권한(변경 없음 확인) ----------
const t3 = await unit("C");
const sc = await special(UC, t3, true);
check("상담사 특별관리 저장은 기존처럼 거부(42501), 대상 없음", !sc.ok && sc.code === "42501" && (await targets(t3)).length === 0, sc);
const sp = await special(UP, t3, true);
check("타 프로젝트 관리자 저장 거부, 대상 없음", !sp.ok && (await targets(t3)).length === 0, sp);
const sx = await special(UX, t3, true);
check("비활성 직원 저장 거부, 대상 없음", !sx.ok && (await targets(t3)).length === 0, sx);
await special(UA, t3, true);
const vt3 = (await targets(t3))[0].visit_target_id;
const rp = await visitResult(UP, t3, vt3, "VISITED", "SELF_MOVE_IN");
check("타 프로젝트 관리자의 방문 결과 저장 거부(대상 불변)", !rp.ok && rp.code === "42501" && (await targets(t3))[0].status === "VISIT_NEEDED", rp);
const rx = await visitResult(UX, t3, vt3, "VISITED", "SELF_MOVE_IN");
check("비활성 직원의 방문 결과 저장 거부(대상 불변)", !rx.ok && (await targets(t3))[0].status === "VISIT_NEEDED", rx);
const vis = await asUser(UP, `select count(*)::int n from public.move_in_visit_target where project_id = $1`, [STAYJ]);
check("타 프로젝트 관리자는 Stay J 방문대상 조회 0건(RLS)", vis.ok && vis.rows[0].n === 0, vis);
const ra = await visitResult(UA, t3, vt3, "VISITED", "SELF_MOVE_IN");
check("관리자 방문 완료 저장 정상", ra.ok && (await targets(t3))[0].status === "VISITED", ra);
const t4 = await unit("C");
await special(UA, t4, true);
const ro = await visitResult(UO, t4, (await targets(t4))[0].visit_target_id, "VISITED", "SELF_MOVE_IN");
check("같은 현장 미배정 상담사 방문 결과 저장 가능(화양 공유현장 기존 규칙, A12 무관)", ro.ok, ro);

// ---------- 상담사 등급 변경(A10, 관리자 권한 부여 없음) ----------
const t5 = await unit("C");
const g1 = await save(UC, t5, "D");
check("상담사 C→D 저장 성공", g1.ok && (await grade(t5)) === "D", g1);
const g2 = await save(UC, t5, "B");
check("상담사 D→B 저장 성공", g2.ok && (await grade(t5)) === "B", g2);
const h5 = await gradeHistory(t5);
check("등급 변경 이력 2건(C→D, D→B)", h5.length === 2 && h5[0].old_value === "C" && h5[0].new_value === "D" && h5[1].old_value === "D" && h5[1].new_value === "B", h5);
const gP = await save(UP, t5, "D");
check("타 프로젝트 관리자 등급 변경 거부", !gP.ok && (await grade(t5)) === "B", gP);
const gX = await save(UX, t5, "D");
check("비활성 직원 등급 변경 거부", !gX.ok && (await grade(t5)) === "B", gX);
const roleNow = (await db.query(`select role from public.project_member where id = $1`, [MC])).rows[0].role;
check("상담사 역할 그대로(COUNSELOR)", roleNow === "COUNSELOR");

// ---------- 오류 시 전체 롤백 ----------
const t6 = await unit("C");
await db.query(`alter table public.move_in_visit_target add constraint iso_force_fail check (source <> 'SPECIAL_CASE' or project_id is null) not valid`);
const f6 = await special(UA, t6, true);
const sc6 = (await db.query(`select count(*)::int n from public.move_in_special_case where unit_id = $1`, [t6.u])).rows[0].n;
check("방문대상 생성 실패 시 특별관리 저장까지 전체 롤백(행 0, 대상 0)", !f6.ok && sc6 === 0 && (await targets(t6)).length === 0, { f6, sc6 });
await db.query(`alter table public.move_in_visit_target drop constraint iso_force_fail`);
check("강제 오류 제거 후 같은 저장 정상", (await special(UA, t6, true)).ok && (await targets(t6)).length === 1);

const finalCount = await visitTaskCount();
out.push(`info 오늘 관리 방문상담 업무 수(진행 중 VISIT_NEEDED·REVISIT_NEEDED): 적용 전 ${beforeCount} → 시나리오 종료 ${finalCount}`);

// ---------- 롤백 파일 ----------
const rbBlocked = await db.query(read(RB12)).then(() => null, (e) => e.message); await db.query("rollback").catch(() => {});
check("롤백: SPECIAL_CASE 대상이 있으면 아무것도 바꾸지 않고 중단", /special case visit targets exist/.test(rbBlocked ?? ""), rbBlocked);
await db.end();

const db2 = await freshDb("stayj_a12_rb");
const c0 = (await db2.query(`select conname, pg_get_constraintdef(oid) d from pg_constraint where conrelid = 'public.move_in_visit_target'::regclass and contype = 'c' order by 1`)).rows;
await db2.query(read(A12));
await db2.query(read(RB12));
const c1 = (await db2.query(`select conname, pg_get_constraintdef(oid) d from pg_constraint where conrelid = 'public.move_in_visit_target'::regclass and contype = 'c' order by 1`)).rows;
const trg = (await db2.query(`select count(*)::int n from pg_trigger where tgname = 'open_visit_target_from_special_case'`)).rows[0].n;
check("롤백(대상 없음): 제약 원래 정의로 복원·트리거 제거", JSON.stringify(c0) === JSON.stringify(c1) && trg === 0, { c0, c1, trg });
let re = true; try { await db2.query(read(A12)); } catch (e) { re = e.message; }
check("롤백 후 재적용 성공", re === true, re);
await db2.end();

console.log(out.join("\n"));
console.log(`\n${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
