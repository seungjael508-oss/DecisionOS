// A8(20261019120000_rls_membership_set)·A9(20261019130000_today_queue_materialize) 검증 — 운영 스키마 조립본 + 실제 PostgreSQL 17
// 1) 권한 동등성: 사용자 13종(관리자·상담사·고객관리자·팀장·비활성·타 프로젝트 담당/미담당·다중 소속·종료 프로젝트·비활성 조직·소속 없음·anon)
//    × 대상 테이블 17개 + 오늘 관리대상·장기 부재 RPC의 보이는 행이 적용 전 = 적용 후 = 롤백 후
// 2) 사전 점검: A8 재실행·미적용 상태 R8 실행은 중단, 롤백 후 정책 원문 md5 복원
// 3) 성능: 운영 규모(Stay J 851세대·상담 3,758건) 상담사·관리자 EXPLAIN ANALYZE 전후 비교
// 사용: node iso-a8-rls.mjs <운영 스키마 SQL>   (PG: 127.0.0.1:54329 postgres/localtest)
import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const base = { host: "127.0.0.1", port: 54329, user: "postgres", password: "localtest" };
const MIGS = ["20261015100000_today_queue_cd_focus", "20261017100000_absence_streak_visit_target", "20261017110000_consultation_d_grade_admin_guard",
  "20261017120000_absence_auto_d_grade", "20261019100000_absence_streak_rule_fast_path", "20261019110000_today_task_completion"];
const A8 = read("supabase/migrations/20261019120000_rls_membership_set.sql");
const R8 = read("supabase/rollback/20261019120000_rls_membership_set.rollback.sql");
const A9 = read("supabase/migrations/20261019130000_today_queue_materialize.sql");
const R9 = read("supabase/rollback/20261019130000_today_queue_materialize.rollback.sql");
const original = JSON.parse(fs.readFileSync(path.join(here, "a8-policies-original.json"), "utf8"));
const STAYJ = "1283e198-5043-4027-96d6-edcc7a6686c6";
let pass = 0, fail = 0;
const check = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok || detail === undefined ? "" : " :: " + JSON.stringify(detail).slice(0, 600)}`); };

async function freshDb(name) {
  const a = new pg.Client({ ...base, database: "postgres" }); await a.connect();
  await a.query(`drop database if exists ${name}`); await a.query(`create database ${name}`); await a.end();
  const db = new pg.Client({ ...base, database: name }); await db.connect(); db.on("notice", () => {});
  await db.query(read("docs/production-snapshot/verification/isolated-supabase-bootstrap.sql"));
  await db.query(fs.readFileSync(process.argv[2], "utf8"));
  for (const m of MIGS) await db.query(read(`supabase/migrations/${m}.sql`));
  return db;
}
const uid = (p, n) => `${p}-0000-4000-8000-${String(n).padStart(12, "0")}`;

// ---------- 1) 권한 동등성 ----------
const db = await freshDb("stayj_a8_rls");
const O1 = uid("a1000000", 1), O2 = uid("a1000000", 2);
const P2 = uid("a2000000", 2), P3 = uid("a2000000", 3), P4 = uid("a2000000", 4);
await db.query(`insert into public.organization(id,name,status) values ($1,'o1','ACTIVE'),($2,'o2','INACTIVE')`, [O1, O2]);
await db.query(`insert into public.project(id,organization_id,name,status) values ($1,$5,'stayj','ACTIVE'),($2,$5,'p2','ACTIVE'),($3,$5,'p3','CLOSED'),($4,$6,'p4','ACTIVE')`, [STAYJ, P2, P3, P4, O1, O2]);
// [이름, [프로젝트, 역할, active]...]
const USERS = [
  ["admin_stayj", [[STAYJ, "PROJECT_ADMIN", true]]],
  ["counselor_stayj", [[STAYJ, "COUNSELOR", true]]],
  ["client_mgr_stayj", [[STAYJ, "CLIENT_MANAGER", true]]],
  ["team_lead_stayj", [[STAYJ, "TEAM_LEAD", true]]],
  ["inactive_counselor_stayj", [[STAYJ, "COUNSELOR", false]]],
  ["counselor_p2_assigned", [[P2, "COUNSELOR", true]]],
  ["counselor_p2_unassigned", [[P2, "COUNSELOR", true]]],
  ["admin_p2", [[P2, "PROJECT_ADMIN", true]]],
  ["client_mgr_p2", [[P2, "CLIENT_MANAGER", true]]],
  ["multi_counselor_stayj_admin_p2", [[STAYJ, "COUNSELOR", true], [P2, "PROJECT_ADMIN", true]]],
  ["admin_closed_p3", [[P3, "PROJECT_ADMIN", true]]],
  ["admin_inactive_org_p4", [[P4, "PROJECT_ADMIN", true]]],
  ["no_membership", []],
];
const userId = {}, memberId = {};
let m = 0;
for (const [i, [name, ms]] of USERS.entries()) {
  userId[name] = uid("a3000000", i + 1);
  await db.query(`insert into auth.users(id) values ($1)`, [userId[name]]);
  for (const [p, role, active] of ms) {
    m++; const mid = uid("a4000000", m); memberId[`${name}:${p}`] = mid;
    await db.query(`insert into public.project_member(id,project_id,user_id,role,active) values ($1,$2,$3,$4,$5)`, [mid, p, userId[name], role, active]);
  }
}
const adminOf = { [STAYJ]: memberId[`admin_stayj:${STAYJ}`], [P2]: memberId[`admin_p2:${P2}`], [P3]: memberId[`admin_closed_p3:${P3}`], [P4]: memberId[`admin_inactive_org_p4:${P4}`] };
const assignees = { [STAYJ]: [memberId[`counselor_stayj:${STAYJ}`], memberId[`inactive_counselor_stayj:${STAYJ}`], memberId[`multi_counselor_stayj_admin_p2:${STAYJ}`], null],
  [P2]: [memberId[`counselor_p2_assigned:${P2}`], null, adminOf[P2]], [P3]: [null], [P4]: [null] };
let n = 0;
for (const p of [STAYJ, P2, P3, P4]) {
  await db.query(`insert into public.move_in_tracking_policy(project_id,reason_code,stale_after,created_by) values ($1,'C_GRADE_STALE','7 days',$2),($1,'D_GRADE_STALE','7 days',$2),($1,'ABSENCE_RETRY','1 day',$2)`, [p, adminOf[p]]);
  const office = uid("a5000000", ++n);
  await db.query(`insert into public.brokerage_office(id,project_id,name) values ($1,$2,'office')`, [office, p]);
  for (let k = 0; k < 6; k++) {
    n++;
    const u = uid("a6000000", n), c = uid("a7000000", n), k1 = uid("a8000000", n), k0 = uid("a9000000", n), cOld = uid("aa000000", n);
    const assigned = assignees[p][k % assignees[p].length];
    await db.query(`insert into public.project_unit(unit_id,project_id,building_no,unit_no) values ($1,$2,'101',$3)`, [u, p, String(100 + n)]);
    await db.query(`insert into public.customer(id,project_id,name,phone,phone_raw,assigned_counselor_id) values ($1,$2,'n',$3,$3,$4),($5,$2,'old',$6,$6,null)`, [c, p, `010-1${String(n).padStart(3, "0")}-0000`, assigned, cOld, `010-2${String(n).padStart(3, "0")}-0000`]);
    await db.query(`insert into public.contract(contract_id,project_id,customer_id,unit_id,contract_status,cancellation_reason) values ($1,$2,$3,$4,'ACTIVE',null),($5,$2,$6,$4,'CANCELLED','test')`, [k1, p, c, u, k0, cOld]);
    const grade = ["C", "D", "A", "C", "D", "B"][k];
    await db.query(`insert into public.unit_occupancy_status(project_id,unit_id,contract_id,legacy_grade,last_contact_at) values ($1,$2,$3,$4, now() - interval '20 days')`, [p, u, k1, grade]);
    for (let j = 0; j < 4; j++) {
      await db.query(`insert into public.consultation(project_id,customer_id,counselor_id,consulted_at,content,created_by,unit_id,contact_type,structured_tags)
        values ($1,$2,$3, now() - make_interval(days => $4::int), 'h', $3, $5, 'CALL', $6)`, [p, j === 3 ? cOld : c, adminOf[p], 20 + j, u, JSON.stringify({ legacy_grade: k === 4 ? "부재" : grade })]);
    }
    await db.query(`insert into public.contact_schedule(project_id,customer_id,contract_id,unit_id,contact_type,planned_at,status,created_by) values ($1,$2,$3,$4,'VISIT', now() + interval '1 day','PENDING',$5)`, [p, c, k1, u, adminOf[p]]);
    await db.query(`insert into public.contract_status_history(project_id,contract_id,unit_id,field_changed,previous_value,new_value,changed_by) values ($1,$2,$3,'legacy_grade','C','D',$4)`, [p, k1, u, adminOf[p]]);
    if (k % 2 === 0) await db.query(`insert into public.move_in_tracking_disposition(project_id,unit_id,contract_id,tracking_date,source_fingerprint,action,created_by) values ($1,$2,$3,(now() at time zone 'Asia/Seoul')::date - 1,'f','COMPLETE',$4)`, [p, u, k1, adminOf[p]]);
    if (k === 5) await db.query(`insert into public.move_in_tracking_exclusion(project_id,unit_id,contract_id,reason,approved_by) values ($1,$2,$3,'r',$4)`, [p, u, k1, adminOf[p]]);
    const deal = uid("ab000000", n);
    await db.query(`insert into public.unit_deal(id,project_id,unit_id,contract_id,customer_id,consent_status,deal_status,updated_by_project_member_id) values ($1,$2,$3,$4,$5,'NOT_CONSENTED','IN_PROGRESS',$6)`, [deal, p, u, k1, c, adminOf[p]]);
    await db.query(`insert into public.unit_deal_brokerage(unit_deal_id,brokerage_office_id) values ($1,$2)`, [deal, office]);
    await db.query(`insert into public.move_in_special_case(project_id,unit_id,contract_id,manually_flagged,created_by,updated_by) values ($1,$2,$3,true,$4,$4),($1,$2,$5,true,$4,$4)`, [p, u, k1, adminOf[p], k0]);
  }
}
const KEYS = {
  consultation: "id", customer: "id", project_unit: "unit_id", contract: "contract_id", unit_occupancy_status: "occupancy_status_id",
  contact_schedule: "schedule_id", contract_status_history: "history_id", move_in_tracking_disposition: "disposition_id",
  move_in_tracking_exclusion: "exclusion_id", move_in_tracking_policy: "policy_id", unit_deal: "id",
  unit_deal_brokerage: "unit_deal_id::text || ':' || brokerage_office_id::text", move_in_special_case: "special_case_id",
};
const visibility = async () => {
  const out = {};
  for (const name of [...USERS.map((u) => u[0]), "anon"]) {
    await db.query("begin");
    if (name === "anon") await db.query("set local role anon");
    else { await db.query("select set_config('request.jwt.claim.sub', $1, true)", [userId[name]]); await db.query("set local role authenticated"); }
    const row = {};
    for (const [t, k] of Object.entries(KEYS)) {
      try { const r = await db.query(`select count(*)::int n, coalesce(md5(string_agg(${k}::text, ',' order by ${k}::text)), '-') h from public.${t}`); row[t] = `${r.rows[0].n}:${r.rows[0].h.slice(0, 8)}`; }
      catch (e) { row[t] = `ERR ${e.code}`; await db.query("rollback"); await db.query("begin"); if (name === "anon") await db.query("set local role anon"); else { await db.query("select set_config('request.jwt.claim.sub', $1, true)", [userId[name]]); await db.query("set local role authenticated"); } }
    }
    for (const [fn, sql] of [["today_queue", `select count(*)::int n, coalesce(md5(string_agg(unit_id::text || array_to_string(reason_codes, ','), ',' order by unit_id)), '-') h from public.get_move_in_today_queue($1, now())`],
      ["absence", `select count(*)::int n, coalesce(md5(string_agg(unit_id::text, ',' order by unit_id)), '-') h from public.get_move_in_absence_candidates($1)`]]) {
      for (const p of [STAYJ, P2]) {
        try { const r = await db.query(sql, [p]); row[`${fn}:${p === STAYJ ? "stayj" : "p2"}`] = `${r.rows[0].n}:${r.rows[0].h.slice(0, 8)}`; }
        catch (e) { row[`${fn}:${p === STAYJ ? "stayj" : "p2"}`] = `ERR ${e.code}`; await db.query("rollback"); await db.query("begin"); if (name === "anon") await db.query("set local role anon"); else { await db.query("select set_config('request.jwt.claim.sub', $1, true)", [userId[name]]); await db.query("set local role authenticated"); } }
      }
    }
    await db.query("rollback");
    out[name] = row;
  }
  return out;
};
const policyMd5 = async () => (await db.query(`select policyname, md5(qual) h from pg_policies where schemaname='public' and policyname = any($1) order by 1`, [original.map((o) => o.p)])).rows;

const before = await visibility();
const nonTrivial = Object.values(before).some((r) => r.consultation.startsWith("0:")) && Object.values(before).some((r) => !r.consultation.startsWith("0:"));
check("시드: 보이는 사용자·안 보이는 사용자가 모두 있음(비교가 의미 있음)", nonTrivial, before);
const rDown = await db.query(R8).then(() => null, (e) => e.message); await db.query("rollback").catch(() => {});
check("미적용 상태에서 R8 실행 → 사전 점검 중단", /not the expected A8 state/.test(rDown ?? ""), rDown);
await db.query(A8);
const again = await db.query(A8).then(() => null, (e) => e.message); await db.query("rollback").catch(() => {});
check("A8 재실행 → 사전 점검 중단(변경 없음)", /abort/.test(again ?? ""), again);
const acl = (await db.query(`select has_function_privilege('anon','private.current_project_memberships()','EXECUTE') a, has_function_privilege('authenticated','private.current_project_memberships()','EXECUTE') b`)).rows[0];
check("보조 함수 ACL: anon 불가·authenticated 가능", !acl.a && acl.b, acl);
const r9early = await db.query(R9).then(() => null, (e) => e.message); await db.query("rollback").catch(() => {});
check("A9 미적용 상태에서 R9 실행 → 사전 점검 중단", /abort/.test(r9early ?? ""), r9early);
await db.query(A9);
const a9again = await db.query(A9).then(() => null, (e) => e.message); await db.query("rollback").catch(() => {});
check("A9 재실행 → 사전 점검 중단(변경 없음)", /abort/.test(a9again ?? ""), a9again);
const after = await visibility();
for (const name of Object.keys(before)) {
  const diff = Object.keys(before[name]).filter((k) => before[name][k] !== after[name][k]);
  check(`권한·오늘 관리 결과 동등(적용 전 = A8+A9 후): ${name}`, diff.length === 0, diff.map((k) => `${k} ${before[name][k]} → ${after[name][k]}`));
}
await db.query(R9);
await db.query(R8);
const restored = await visibility();
const back = Object.keys(before).filter((name) => JSON.stringify(before[name]) !== JSON.stringify(restored[name]));
check("롤백 후 권한 = 적용 전(전 사용자)", back.length === 0, back);
const md5s = await policyMd5();
check(`롤백 후 정책 원문 md5 ${original.length}개 복원`, md5s.length === original.length && md5s.every((r) => original.find((o) => o.p === r.policyname).h === r.h), md5s);
check("롤백 후 보조 함수 삭제", (await db.query(`select to_regprocedure('private.current_project_memberships()') f`)).rows[0].f === null);
console.log("\n[권한 매트릭스: 테이블별 보이는 행 수, 적용 전]");
for (const [name, row] of Object.entries(before)) console.log(name.padEnd(32), Object.entries(row).map(([k, v]) => `${k.replace(/_/g, "").slice(0, 10)}=${v.split(":")[0]}`).join(" "));
await db.end();

// ---------- 3) 성능 ----------
const perf = await freshDb("stayj_a8_perf");
await perf.query(`insert into public.organization(id,name) values ('${O1}','o')`);
await perf.query(`insert into public.project(id,organization_id,name) values ('${STAYJ}','${O1}','stayj')`);
const PA = uid("b1000000", 1), PC = uid("b1000000", 2), MA = uid("b2000000", 1), MC = uid("b2000000", 2);
await perf.query(`insert into auth.users(id) values ('${PA}'),('${PC}')`);
await perf.query(`insert into public.project_member(id,project_id,user_id,role) values ('${MA}','${STAYJ}','${PA}','PROJECT_ADMIN'),('${MC}','${STAYJ}','${PC}','COUNSELOR')`);
await perf.query(`insert into public.move_in_tracking_policy(project_id,reason_code,stale_after,created_by) values ('${STAYJ}','C_GRADE_STALE','7 days','${MA}'),('${STAYJ}','D_GRADE_STALE','7 days','${MA}'),('${STAYJ}','ABSENCE_RETRY','1 day','${MA}')`);
await perf.query(`
  insert into public.project_unit(unit_id,project_id,building_no,unit_no) select ('c1000000-0000-4000-8000-' || lpad(g::text,12,'0'))::uuid, '${STAYJ}', (100 + g / 100)::text, (g % 100 + 100)::text from generate_series(1,851) g;
  insert into public.customer(id,project_id,name,phone,phone_raw,assigned_counselor_id) select ('c2000000-0000-4000-8000-' || lpad(g::text,12,'0'))::uuid, '${STAYJ}', 'n', '010-0000-' || lpad(g::text,4,'0'), '010-0000-' || lpad(g::text,4,'0'), case when g % 3 = 0 then '${MC}'::uuid end from generate_series(1,851) g;
  insert into public.contract(contract_id,project_id,customer_id,unit_id,contract_status) select ('c3000000-0000-4000-8000-' || lpad(g::text,12,'0'))::uuid, '${STAYJ}', ('c2000000-0000-4000-8000-' || lpad(g::text,12,'0'))::uuid, ('c1000000-0000-4000-8000-' || lpad(g::text,12,'0'))::uuid, 'ACTIVE' from generate_series(1,851) g;
  insert into public.unit_occupancy_status(project_id,unit_id,contract_id,legacy_grade,last_contact_at) select '${STAYJ}', ('c1000000-0000-4000-8000-' || lpad(g::text,12,'0'))::uuid, ('c3000000-0000-4000-8000-' || lpad(g::text,12,'0'))::uuid, (array['A','B','C','D'])[1 + g % 4], now() - make_interval(days => g % 40) from generate_series(1,851) g;
  insert into public.consultation(project_id,customer_id,counselor_id,consulted_at,content,created_by,unit_id,contact_type,structured_tags)
    select '${STAYJ}', ('c2000000-0000-4000-8000-' || lpad((1 + g % 851)::text,12,'0'))::uuid, '${MA}', now() - make_interval(hours => g), 'h', '${MA}', ('c1000000-0000-4000-8000-' || lpad((1 + g % 851)::text,12,'0'))::uuid,
      (array['CALL','CALL','MESSAGE','VISIT'])[1 + g % 4], jsonb_build_object('legacy_grade', (array['부재','C','D','B','부재'])[1 + g % 5]) from generate_series(1,3758) g;
  analyze;`);
const QUERY = `explain (analyze, format json) select
  (select count(*) from public.get_move_in_today_queue('${STAYJ}', now())) q, (select count(*) from public.get_move_in_absence_candidates('${STAYJ}')) a,
  (select count(*) from public.consultation where project_id = '${STAYJ}') k, (select count(*) from public.project_unit where project_id = '${STAYJ}') u,
  (select count(*) from public.contract where project_id = '${STAYJ}') c, (select count(*) from public.customer where project_id = '${STAYJ}') cu,
  (select count(*) from public.unit_occupancy_status where project_id = '${STAYJ}') o`;
const timeAs = async (user) => {
  const runs = [];
  for (let i = 0; i < 3; i++) {
    await perf.query("begin"); await perf.query("select set_config('request.jwt.claim.sub', $1, true)", [user]); await perf.query("set local role authenticated");
    const plan = (await perf.query(QUERY)).rows[0]["QUERY PLAN"][0];
    await perf.query("rollback");
    const parts = (plan.Plan.Plans ?? []).map((p) => Math.round(p["Actual Total Time"]));
    runs.push({ total: Math.round(plan["Execution Time"]), parts });
  }
  return runs.sort((a, b) => a.total - b.total)[1]; // 중앙값
};
const pb = { counselor: await timeAs(PC), admin: await timeAs(PA) };
await perf.query(A8);
const pa = { counselor: await timeAs(PC), admin: await timeAs(PA) };
await perf.query(A9);
const p9 = { counselor: await timeAs(PC), admin: await timeAs(PA) };
console.log("\n[성능: 중앙값 ms, parts = 오늘관리RPC·장기부재RPC·상담·세대·계약·고객·점유]");
for (const r of ["counselor", "admin"]) console.log(`${r.padEnd(10)} 전 ${String(pb[r].total).padStart(6)}ms ${JSON.stringify(pb[r].parts)} | A8 후 ${String(pa[r].total).padStart(6)}ms ${JSON.stringify(pa[r].parts)} | A8+A9 후 ${String(p9[r].total).padStart(6)}ms ${JSON.stringify(p9[r].parts)}`);
check("성능: 상담사·관리자 모두 A8+A9 후 오늘 관리 RPC 1초 미만", p9.counselor.parts[0] < 1000 && p9.admin.parts[0] < 1000, { pb, pa, p9 });
await perf.end();

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
