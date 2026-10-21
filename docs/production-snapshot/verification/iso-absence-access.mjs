// 20261019100000 빠른 경로 권한 추가 확인 — 운영 스키마 + 실제 PostgreSQL 17
// 비활성 멤버·TEAM_LEAD는 0건, 일반 프로젝트 상담사는 미배정 세대 0건·담당 세대만,
// 일반 프로젝트 관리자·Stay J 현장 멤버는 전체, 결과는 항상 RLS 경로와 동일
// 사용: node iso-absence-access.mjs <운영 스키마 SQL>
import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const read = (p) => fs.readFileSync(path.join(root, "supabase", p), "utf8");
const base = { host: "127.0.0.1", port: 54329, user: "postgres", password: "localtest" };
const MIGS = ["20261015100000_today_queue_cd_focus", "20261017100000_absence_streak_visit_target",
  "20261017110000_consultation_d_grade_admin_guard", "20261017120000_absence_auto_d_grade", "20261019100000_absence_streak_rule_fast_path"];
let pass = 0, fail = 0;
const out = [];
const check = (name, cond, detail) => { if (cond) { pass++; out.push(`ok   ${name}`); } else { fail++; out.push(`FAIL ${name} :: ${JSON.stringify(detail)}`); } };

const a = new pg.Client({ ...base, database: "postgres" }); await a.connect();
await a.query("drop database if exists stayj_absacc"); await a.query("create database stayj_absacc"); await a.end();
const db = new pg.Client({ ...base, database: "stayj_absacc" }); await db.connect(); db.on("notice", () => {});
await db.query(fs.readFileSync(path.join(here, "isolated-supabase-bootstrap.sql"), "utf8"));
await db.query(fs.readFileSync(process.argv[2], "utf8"));
for (const m of MIGS) await db.query(read(`migrations/${m}.sql`));

const STAYJ = "1283e198-5043-4027-96d6-edcc7a6686c6", P2 = "21000000-0000-4000-8000-000000000002";
const id = (p, n) => `${p}-0000-4000-8000-${String(n).padStart(12, "0")}`;
// 사용자: [user, member, project, role, active]
const M = {
  sjCounselor: [id("31000000", 1), id("41000000", 1), STAYJ, "COUNSELOR", true],
  sjInactive: [id("31000000", 2), id("41000000", 2), STAYJ, "COUNSELOR", false],
  sjLead: [id("31000000", 3), id("41000000", 3), STAYJ, "TEAM_LEAD", true],
  sjClient: [id("31000000", 4), id("41000000", 4), STAYJ, "CLIENT_MANAGER", true],
  p2Admin: [id("31000000", 5), id("41000000", 5), P2, "PROJECT_ADMIN", true],
  p2CounselorA: [id("31000000", 6), id("41000000", 6), P2, "COUNSELOR", true],
  p2CounselorB: [id("31000000", 7), id("41000000", 7), P2, "COUNSELOR", true],
  p2Inactive: [id("31000000", 8), id("41000000", 8), P2, "PROJECT_ADMIN", false],
};
await db.query(`insert into public.organization(id,name) values ('11000000-0000-4000-8000-000000000001','o')`);
await db.query(`insert into public.project(id,organization_id,name) values ($1,'11000000-0000-4000-8000-000000000001','s'),($2,'11000000-0000-4000-8000-000000000001','p2')`, [STAYJ, P2]);
for (const [u, m, p, role, active] of Object.values(M)) {
  await db.query(`insert into auth.users(id) values ($1)`, [u]);
  await db.query(`insert into public.project_member(id,project_id,user_id,role,active) values ($1,$2,$3,$4,$5)`, [m, p, u, role, active]);
}
let seq = 0;
async function unitWith3(project, assignedMember, author) {
  seq++;
  const u = id("8e000000", seq), c = id("51000000", seq);
  await db.query(`insert into public.project_unit(unit_id,project_id,building_no,unit_no) values ($1,$2,'9',$3)`, [u, project, String(seq)]);
  await db.query(`insert into public.customer(id,project_id,name,phone,phone_raw,assigned_counselor_id) values ($1,$2,'n',$3,$3,$4)`, [c, project, `010-6${String(seq).padStart(3, "0")}-0000`, assignedMember]);
  const k = (await db.query(`insert into public.contract(project_id,customer_id,unit_id,contract_status) values ($1,$2,$3,'ACTIVE') returning contract_id`, [project, c, u])).rows[0].contract_id;
  await db.query(`insert into public.unit_occupancy_status(project_id,unit_id,contract_id,legacy_grade) values ($1,$2,$3,'B')`, [project, u, k]);
  for (let i = 0; i < 3; i++) await db.query(`insert into public.consultation(project_id,customer_id,counselor_id,consulted_at,content,created_by,unit_id,contact_type,structured_tags)
    values ($1,$2,$3, now() - make_interval(hours => $4::int), 'h', $3, $5, 'CALL', '{"legacy_grade":"부재"}')`, [project, c, author, 10 + i, u]);
  return u;
}
const sjAssigned = await unitWith3(STAYJ, M.sjCounselor[1], M.sjCounselor[1]);
const sjUnassigned = await unitWith3(STAYJ, null, M.sjClient[1]);
const p2A = await unitWith3(P2, M.p2CounselorA[1], M.p2Admin[1]);
const p2B = await unitWith3(P2, M.p2CounselorB[1], M.p2Admin[1]);
const p2None = await unitWith3(P2, null, M.p2Admin[1]);

// RLS 경로 기준(같은 본문 invoker 함수)
const mig = read(`migrations/${MIGS.at(-1)}.sql`);
const rlsBody = mig.slice(mig.indexOf("  return query\n") + "  return query\n".length, mig.indexOf(";\nend;\n$function$;"));
const sigLine = mig.match(/ RETURNS TABLE\([^\n]+\)/)[0];
await db.query(`create function public.test_absence_rls(p_project_id uuid)\n${sigLine}\nlanguage sql stable set search_path to '' as $f$\n${rlsBody}\n$f$; grant execute on function public.test_absence_rls(uuid) to authenticated;`);
async function units(user, fn, project) {
  await db.query("begin");
  await db.query("select set_config('request.jwt.claim.sub', $1, true)", [user]);
  await db.query("set local role authenticated");
  const r = (await db.query(`select unit_id from public.${fn}($1) order by unit_id`, [project])).rows.map((x) => x.unit_id);
  await db.query("rollback");
  return r;
}
const cases = [
  ["Stay J 상담사(공동 현장): 담당·미배정 모두", M.sjCounselor, STAYJ, [sjAssigned, sjUnassigned]],
  ["Stay J 고객사 담당(CLIENT_MANAGER): 전체", M.sjClient, STAYJ, [sjAssigned, sjUnassigned]],
  ["Stay J 비활성 멤버: 0건", M.sjInactive, STAYJ, []],
  ["Stay J TEAM_LEAD(조회 역할 아님): 0건", M.sjLead, STAYJ, []],
  ["일반 프로젝트 상담사 A: 담당 세대만(미배정·타 상담사 세대 0)", M.p2CounselorA, P2, [p2A]],
  ["일반 프로젝트 상담사 B: 담당 세대만", M.p2CounselorB, P2, [p2B]],
  ["일반 프로젝트 관리자: 전체", M.p2Admin, P2, [p2A, p2B, p2None]],
  ["일반 프로젝트 비활성 관리자: 0건", M.p2Inactive, P2, []],
  ["Stay J 상담사가 일반 프로젝트 조회: 0건", M.sjCounselor, P2, []],
  ["일반 프로젝트 관리자가 Stay J 조회: 0건", M.p2Admin, STAYJ, []],
];
for (const [label, [user], project, expected] of cases) {
  const fast = await units(user, "get_move_in_absence_candidates", project);
  const rls = await units(user, "test_absence_rls", project);
  const exp = [...expected].sort();
  check(label, JSON.stringify(fast) === JSON.stringify(exp) && JSON.stringify(rls) === JSON.stringify(exp), { fast: fast.length, rls: rls.length, expected: exp.length });
}
// 보조 함수를 직접 불러도 같은 경계
for (const [label, [user], project] of [["비활성 멤버", M.sjInactive, STAYJ], ["일반 프로젝트 상담사", M.p2CounselorA, P2], ["TEAM_LEAD", M.sjLead, STAYJ]]) {
  const r = await units(user, "test_absence_rls", project).then(() => null);
  await db.query("begin"); await db.query("select set_config('request.jwt.claim.sub', $1, true)", [user]); await db.query("set local role authenticated");
  const n = (await db.query(`select count(*)::int n from private.move_in_absence_candidates_full_view($1)`, [project])).rows[0].n;
  await db.query("rollback");
  check(`보조 함수 직접 호출(${label}): 0건`, n === 0 && r === null, n);
}
await db.end();
console.log(out.join("\n"));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
