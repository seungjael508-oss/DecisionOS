// 복구 세션(amr=recovery) JWT의 DB 권한 = 일반 로그인(amr=password) JWT와 같은지 격리 검증(운영 스키마 + A1~A11)
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

const a = new pg.Client({ ...base, database: "postgres" }); await a.connect();
await a.query("drop database if exists stayj_recovery"); await a.query("create database stayj_recovery"); await a.end();
const db = new pg.Client({ ...base, database: "stayj_recovery" }); await db.connect(); db.on("notice", () => {});
await db.query(fs.readFileSync(path.join(HERE, "isolated-supabase-bootstrap.sql"), "utf8"));
await db.query(fs.readFileSync(process.argv[2], "utf8"));
for (const m of PRIOR) await db.query(read(`migrations/${m}.sql`));

const STAYJ = "1283e198-5043-4027-96d6-edcc7a6686c6";
const U = "31000000-0000-4000-8000-000000000001", M = "41000000-0000-4000-8000-000000000001";
await db.query(`insert into public.organization(id,name) values ('11000000-0000-4000-8000-000000000001','o')`);
await db.query(`insert into public.project(id,organization_id,name) values ($1,'11000000-0000-4000-8000-000000000001','s')`, [STAYJ]);
await db.query(`insert into auth.users(id) values ($1)`, [U]);
await db.query(`insert into public.project_member(id,project_id,user_id,role) values ($1,$2,$3,'COUNSELOR')`, [M, STAYJ, U]);
const unit = "8e000000-0000-4000-8000-000000000001", cust = "51000000-0000-4000-8000-000000000001";
await db.query(`insert into public.project_unit(unit_id,project_id,building_no,unit_no) values ($1,$2,'9','1')`, [unit, STAYJ]);
await db.query(`insert into public.customer(id,project_id,name,phone,phone_raw,assigned_counselor_id) values ($1,$2,'n','010-1','010-1',$3)`, [cust, STAYJ, M]);
const k = (await db.query(`insert into public.contract(project_id,customer_id,unit_id,contract_status) values ($1,$2,$3,'ACTIVE') returning contract_id`, [STAYJ, cust, unit])).rows[0].contract_id;
await db.query(`insert into public.unit_occupancy_status(project_id,unit_id,contract_id,legacy_grade) values ($1,$2,$3,'C')`, [STAYJ, unit, k]);

async function as(method, sql, params, commit = false) {
  const claims = { sub: U, role: "authenticated", aal: "aal1", amr: [{ method, timestamp: Math.floor(Date.now() / 1000) }] };
  await db.query("begin");
  try {
    await db.query("select set_config('request.jwt.claims', $1, true), set_config('request.jwt.claim.sub', $2, true)", [JSON.stringify(claims), U]);
    await db.query("set local role authenticated");
    const r = await db.query(sql, params);
    await db.query(commit ? "commit" : "rollback");
    return { ok: true, rows: r.rows };
  } catch (e) { await db.query("rollback"); return { ok: false, code: e.code }; }
}
const SAVE = `select public.create_move_in_consultation(p_project_id:=$1,p_unit_id:=$2,p_customer_id:=$3,p_consultation_type:='OUTBOUND',p_content:='x',p_expected_contract_id:=$4,
  p_legacy_grade:='B',p_next_contact_at:=null,p_occupancy_intent:=null,p_funding_status:=null,p_move_in_status:=null,p_planned_move_in_date:=null,
  p_balance_paid_at:=null,p_actual_move_in_date:=null,p_reason:=null,p_business_purpose:=null,p_clear_next_contact_at:=false,p_operational_intent:=null) as id`;
const rows = [];
for (const method of ["password", "recovery"]) {
  const cust = await as(method, `select count(*)::int n, bool_or(phone is not null) phone from public.customer where project_id = $1`, [STAYJ]);
  const proj = await as(method, `select count(*)::int n from public.project where id = $1`, [STAYJ]);
  const save = await as(method, SAVE, [STAYJ, unit, "51000000-0000-4000-8000-000000000001", k]); // 롤백(데이터 미변경)
  rows.push({ method, customerRows: cust.rows?.[0]?.n, phoneVisible: cust.rows?.[0]?.phone, projectRows: proj.rows?.[0]?.n, consultationSave: save.ok ? "성공" : `거부 ${save.code}` });
}
console.table(rows);
await db.end();
