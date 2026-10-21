// 20261020120000_recovery_session_membership_block 격리 검증 — 운영 스키마 조립본 + A1~A11 + 실제 PostgreSQL 17
// 1) 적용 전: 복구 세션(amr=recovery)이 일반 로그인과 같은 권한(취약점 재현)
// 2) 적용 후: 복구 세션(단독·password와 혼합)은 RLS 테이블 28개 전부 "소속 없는 사용자"와 같은 행만 보이고, 쓰기 RPC는 42501
//    일반 로그인(password)·초대(invite)·otp·amr 없음은 사용자 4종 × RLS 테이블 28개 보이는 행이 적용 전과 같음
//    상담 저장·초대(invite_project_member)·구성원 목록·오늘 관리대상·전화번호 변경: 일반 로그인 성공, 복구 세션 거부
// 3) 롤백 후 함수 원문 md5 복원(=복구 세션 권한도 적용 전과 같아짐), 재적용 정상, 중복 적용·미적용 상태 롤백은 사전 점검에서 중단
// 4) 참고: 적용 후 A12(20261021100000) 적용 가능 여부와 적용 후에도 차단 유지
// 사용: node iso-recovery-membership-block.mjs <운영 스키마 SQL>   (PG: 127.0.0.1:54329 postgres/localtest)
import pg from "pg";
import fs from "node:fs";
import path from "node:path";

const REPO = "C:/Users/PC-1/DecisionOS-today";
const read = (p) => fs.readFileSync(path.join(REPO, p), "utf8");
const base = { host: "127.0.0.1", port: 54329, user: "postgres", password: "localtest" };
const PRIOR = ["20261015100000_today_queue_cd_focus", "20261017100000_absence_streak_visit_target",
  "20261017110000_consultation_d_grade_admin_guard", "20261017120000_absence_auto_d_grade",
  "20261019100000_absence_streak_rule_fast_path", "20261019110000_today_task_completion",
  "20261019120000_rls_membership_set", "20261019130000_today_queue_materialize",
  "20261020100000_counselor_grade_change", "20261020110000_trade_funding_type"];
const FIX = read("supabase/migrations/20261020120000_recovery_session_membership_block.sql");
const UNFIX = read("supabase/rollback/20261020120000_recovery_session_membership_block.rollback.sql");
const A12 = read("supabase/migrations/20261021100000_special_case_visit_target.sql");
let pass = 0, fail = 0;
const check = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok || detail === undefined ? "" : " :: " + JSON.stringify(detail).slice(0, 800)}`); };

const a = new pg.Client({ ...base, database: "postgres" }); await a.connect();
await a.query("drop database if exists stayj_recovery_block"); await a.query("create database stayj_recovery_block"); await a.end();
const db = new pg.Client({ ...base, database: "stayj_recovery_block" }); await db.connect(); db.on("notice", () => {});
await db.query(read("docs/production-snapshot/verification/isolated-supabase-bootstrap.sql"));
await db.query(fs.readFileSync(process.argv[2], "utf8"));
for (const m of PRIOR) await db.query(read(`supabase/migrations/${m}.sql`));

// ---------- 고정 데이터 ----------
const STAYJ = "1283e198-5043-4027-96d6-edcc7a6686c6", ORG = "11000000-0000-4000-8000-000000000001";
const uid = (p, n) => `${p}-0000-4000-8000-${String(n).padStart(12, "0")}`;
const USERS = { admin: uid("31000000", 1), counselor: uid("31000000", 2), client: uid("31000000", 3), none: uid("31000000", 4) };
const MEMBERS = { admin: uid("41000000", 1), counselor: uid("41000000", 2), client: uid("41000000", 3) };
const ROLES = { admin: "PROJECT_ADMIN", counselor: "COUNSELOR", client: "CLIENT_MANAGER" };
const INVITEE = uid("31000000", 9);
await db.query(`insert into public.organization(id,name) values ($1,'o')`, [ORG]);
await db.query(`insert into public.project(id,organization_id,name) values ($1,$2,'s')`, [STAYJ, ORG]);
for (const u of [...Object.values(USERS), INVITEE]) await db.query(`insert into auth.users(id) values ($1)`, [u]);
for (const k of Object.keys(MEMBERS)) {
  await db.query(`insert into public.project_member(id,project_id,user_id,role,display_name) values ($1,$2,$3,$4,$5)`, [MEMBERS[k], STAYJ, USERS[k], ROLES[k], `m-${k}`]);
}
const unit = uid("8e000000", 1), cust = uid("51000000", 1);
await db.query(`insert into public.project_unit(unit_id,project_id,building_no,unit_no) values ($1,$2,'9','1')`, [unit, STAYJ]);
await db.query(`insert into public.customer(id,project_id,name,phone,phone_raw,assigned_counselor_id) values ($1,$2,'n','010-1','010-1',$3)`, [cust, STAYJ, MEMBERS.counselor]);
const k = (await db.query(`insert into public.contract(project_id,customer_id,unit_id,contract_status) values ($1,$2,$3,'ACTIVE') returning contract_id`, [STAYJ, cust, unit])).rows[0].contract_id;
await db.query(`insert into public.unit_occupancy_status(project_id,unit_id,contract_id,legacy_grade) values ($1,$2,$3,'C')`, [STAYJ, unit, k]);

// ---------- 세션 ----------
const AMR = {
  password: [{ method: "password" }], recovery: [{ method: "recovery" }], invite: [{ method: "invite" }], otp: [{ method: "otp" }],
  mixed: [{ method: "password" }, { method: "recovery" }], noamr: null,
};
async function as(user, method, sql, params = [], commit = false) {
  const now = Math.floor(Date.now() / 1000);
  const claims = { sub: USERS[user], role: "authenticated", aal: "aal1" };
  if (AMR[method]) claims.amr = AMR[method].map((e) => ({ ...e, timestamp: now }));
  await db.query("begin");
  try {
    await db.query("select set_config('request.jwt.claims', $1, true), set_config('request.jwt.claim.sub', $2, true)", [JSON.stringify(claims), USERS[user]]);
    await db.query("set local role authenticated");
    const r = await db.query(sql, params);
    await db.query(commit ? "commit" : "rollback");
    return { ok: true, rows: r.rows, rowCount: r.rowCount };
  } catch (e) { await db.query("rollback"); return { ok: false, code: e.code }; }
}
const SAVE = `select public.create_move_in_consultation(p_project_id:=$1,p_unit_id:=$2,p_customer_id:=$3,p_consultation_type:='OUTBOUND',p_content:='x',p_expected_contract_id:=$4,
  p_legacy_grade:='B',p_next_contact_at:=null,p_occupancy_intent:=null,p_funding_status:=null,p_move_in_status:=null,p_planned_move_in_date:=null,
  p_balance_paid_at:=null,p_actual_move_in_date:=null,p_reason:=null,p_business_purpose:=null,p_clear_next_contact_at:=false,p_operational_intent:=null) as id`;
// 상담 1건을 실제로 저장해 consultation 정책도 행이 있는 상태로 비교한다
check("고정 데이터: 상담사 일반 로그인 상담 저장(커밋)", (await as("counselor", "password", SAVE, [STAYJ, unit, cust, k], true)).ok);

const TABLES = (await db.query(`select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity order by 1`)).rows.map((r) => r.relname);
async function snapshot(user, method) {
  const out = {};
  for (const t of TABLES) {
    const r = await as(user, method, `select count(*)::int n from public.${t}`);
    out[t] = r.ok ? r.rows[0].n : `err ${r.code}`;
  }
  return out;
}
async function rpcs(method) {
  const r = {};
  r.save = await as("counselor", method, SAVE, [STAYJ, unit, cust, k]);
  r.invite = await as("admin", method, `select public.invite_project_member($1,$2,'COUNSELOR','신규상담')`, [STAYJ, INVITEE]);
  r.members = await as("admin", method, `select count(*)::int n from public.list_project_members($1)`, [STAYJ]);
  r.queue = await as("admin", method, `select count(*)::int n from public.get_move_in_today_queue($1, now())`, [STAYJ]);
  r.phone = await as("admin", method, `select public.update_customer_phone($1,$2,'010-2','010-1')`, [STAYJ, cust]);
  r.field = await as("admin", method, `select count(*)::int n from public.list_move_in_field_members($1)`, [STAYJ]);
  r.directUpdate = await as("admin", method, `update public.customer set name = 'z' where id = $1`, [cust]);
  return r;
}
const fnMd5 = async () => (await db.query(`select p.proname, md5(p.prosrc) h from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'private' and p.proname in ('current_project_member_id','current_project_memberships') order by 1`)).rows;
const fnAttrs = async () => (await db.query(`select p.oid::regprocedure::text sig, p.prosecdef, p.provolatile, p.proconfig::text, pg_get_userbyid(p.proowner) owner, p.proacl::text acl
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'private' and p.proname in ('current_project_member_id','current_project_memberships') order by 1`)).rows;
const tryQuery = async (sql) => { try { await db.query(sql); return "ok"; } catch (e) { await db.query("rollback").catch(() => {}); return e.message; } };

const USER_KEYS = Object.keys(USERS), NON_RECOVERY = ["password", "invite", "otp", "noamr"];
async function fullState() {
  const s = {};
  for (const u of USER_KEYS) for (const m of Object.keys(AMR)) s[`${u}/${m}`] = await snapshot(u, m);
  return s;
}

// ---------- 1) 적용 전 ----------
const md5Before = await fnMd5(), attrsBefore = await fnAttrs();
const before = await fullState();
const rpcBefore = { password: await rpcs("password"), recovery: await rpcs("recovery") };
check("적용 전(재현): 복구 세션 = 일반 로그인 (사용자 4종 × RLS 테이블)", USER_KEYS.every((u) => JSON.stringify(before[`${u}/recovery`]) === JSON.stringify(before[`${u}/password`])));
check("적용 전(재현): 복구 세션 상담 저장 성공", rpcBefore.recovery.save.ok);
check("적용 전: 상담사 일반 로그인 고객 1행 보임", before["counselor/password"].customer === 1, before["counselor/password"]);
check("적용 전: 관리자 일반 로그인 프로젝트 1행 보임", before["admin/password"].project === 1, before["admin/password"]);

// ---------- 2) 적용 후 ----------
await db.query(FIX);
const after = await fullState();
const rpcAfter = { password: await rpcs("password"), recovery: await rpcs("recovery"), mixed: await rpcs("mixed"), invite: await rpcs("invite") };
check("적용 후: 함수 속성(시그니처·SECURITY DEFINER·STABLE·search_path·소유자·권한) 그대로", JSON.stringify(await fnAttrs()) === JSON.stringify(attrsBefore), await fnAttrs());
for (const u of USER_KEYS) for (const m of NON_RECOVERY) {
  check(`적용 후: ${u}/${m} RLS 테이블 ${TABLES.length}개 보이는 행 = 적용 전`, JSON.stringify(after[`${u}/${m}`]) === JSON.stringify(before[`${u}/${m}`]),
    { before: before[`${u}/${m}`], after: after[`${u}/${m}`] });
}
for (const u of USER_KEYS) for (const m of ["recovery", "mixed"]) {
  check(`적용 후: ${u}/${m} = 소속 없는 사용자(none/password)`, JSON.stringify(after[`${u}/${m}`]) === JSON.stringify(after["none/password"]),
    { got: after[`${u}/${m}`], none: after["none/password"] });
}
const nz = Object.entries(after["counselor/recovery"]).filter(([, v]) => v !== 0);
check("적용 후: 상담사 복구 세션 RLS 테이블 전부 0행", nz.length === 0, nz);
for (const m of ["password", "invite"]) {
  const r = rpcAfter[m];
  check(`적용 후 ${m}: 상담 저장 성공`, r.save.ok, r.save);
  check(`적용 후 ${m}: 초대(invite_project_member) 성공`, r.invite.ok, r.invite);
  check(`적용 후 ${m}: 구성원 목록 = 적용 전`, r.members.ok && r.members.rows[0].n === rpcBefore.password.members.rows[0].n, r.members);
  check(`적용 후 ${m}: 오늘 관리대상 = 적용 전`, r.queue.ok && r.queue.rows[0].n === rpcBefore.password.queue.rows[0].n, r.queue);
  check(`적용 후 ${m}: 전화번호 변경 성공`, r.phone.ok, r.phone);
  check(`적용 후 ${m}: 현장 구성원 목록 = 적용 전`, r.field.ok && r.field.rows[0].n === rpcBefore.password.field.rows[0].n, r.field);
  // authenticated에는 customer UPDATE 권한이 원래 없다(쓰기는 RPC만) → 적용 전과 같은 결과(42501)인지 본다
  check(`적용 후 ${m}: 고객 직접 UPDATE = 적용 전`, JSON.stringify(r.directUpdate) === JSON.stringify(rpcBefore.password.directUpdate), r.directUpdate);
}
for (const m of ["recovery", "mixed"]) {
  const r = rpcAfter[m];
  check(`적용 후 ${m}: 상담 저장 거부 42501`, !r.save.ok && r.save.code === "42501", r.save);
  check(`적용 후 ${m}: 초대 거부 42501`, !r.invite.ok && r.invite.code === "42501", r.invite);
  check(`적용 후 ${m}: 구성원 목록 거부 42501`, !r.members.ok && r.members.code === "42501", r.members);
  check(`적용 후 ${m}: 오늘 관리대상 거부 또는 0행`, (!r.queue.ok && r.queue.code === "42501") || (r.queue.ok && r.queue.rows[0].n === 0), r.queue);
  check(`적용 후 ${m}: 전화번호 변경 거부 42501`, !r.phone.ok && r.phone.code === "42501", r.phone);
  check(`적용 후 ${m}: 현장 구성원 목록 0행`, r.field.ok && r.field.rows[0].n === 0, r.field);
  check(`적용 후 ${m}: 고객 직접 UPDATE 0행`, (r.directUpdate.ok && r.directUpdate.rowCount === 0) || (!r.directUpdate.ok && r.directUpdate.code === "42501"), r.directUpdate);
}
// 서버 키 경로(auth.uid() 없음)는 소속 함수가 원래부터 아무것도 돌려주지 않는다 → 결과 그대로
const svc = await db.query(`select private.current_project_member_id($1, array['PROJECT_ADMIN']::public.project_member_role[]) id`, [STAYJ]);
check("적용 후: auth.uid() 없는 호출 = null(기존과 같음)", svc.rows[0].id === null);

// ---------- 3) 사전 점검·롤백·재적용 ----------
check("사전 점검: 중복 적용 중단", /not the expected definition/.test(await tryQuery(FIX)));
await db.query(UNFIX);
check("롤백: 함수 원문 md5 = 적용 전", JSON.stringify(await fnMd5()) === JSON.stringify(md5Before), await fnMd5());
check("롤백: 함수 속성 = 적용 전", JSON.stringify(await fnAttrs()) === JSON.stringify(attrsBefore));
const rolled = await fullState();
check("롤백: 사용자 4종 × 방식 6종 × RLS 테이블 = 적용 전", JSON.stringify(rolled) === JSON.stringify(before));
check("사전 점검: 미적용 상태 롤백 중단", /not the expected recovery-block state/.test(await tryQuery(UNFIX)));
await db.query(FIX);
check("재적용: 적용 후 상태와 같음", JSON.stringify(await fullState()) === JSON.stringify(after));

// ---------- 4) 참고: A12 ----------
const a12 = await tryQuery(A12);
check("참고: 적용 후 A12 적용 가능", a12 === "ok", a12);
if (a12 === "ok") {
  const s = await snapshot("counselor", "recovery");
  check("참고: A12 적용 후에도 복구 세션 차단 유지", JSON.stringify(s) === JSON.stringify(await snapshot("none", "password")), s);
  check("참고: A12 적용 후 상담사 일반 로그인 상담 저장 성공", (await as("counselor", "password", SAVE, [STAYJ, unit, cust, k])).ok);
}

console.log(`\n${pass} passed, ${fail} failed (RLS 테이블 ${TABLES.length}개)`);
await db.end();
process.exit(fail ? 1 : 0);
