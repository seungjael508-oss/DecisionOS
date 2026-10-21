// 20261019110000(오늘 관리대상 업무 처리) 검증 — 운영 스키마(CSV 조립본) + 실제 PostgreSQL 17
// 저장 성공 후 완료·중복 호출·저장 실패/권한 오류·다음 관리일 재노출·새 사유 재노출·다음 관리일 도래·
// 방문 부재 다음 방문일·세대 지정 판정 = 전체 판정·롤백/재적용
// 사용: node iso-today-task.mjs <운영 스키마 SQL>
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
const NEW = "20261019110000_today_task_completion";
let pass = 0, fail = 0;
const out = [];
const check = (name, cond, detail) => { if (cond) { pass++; out.push(`ok   ${name}`); } else { fail++; out.push(`FAIL ${name} :: ${JSON.stringify(detail)}`); } };

const a = new pg.Client({ ...base, database: "postgres" }); await a.connect();
await a.query("drop database if exists stayj_todaytask"); await a.query("create database stayj_todaytask"); await a.end();
const db = new pg.Client({ ...base, database: "stayj_todaytask" }); await db.connect(); db.on("notice", () => {});
await db.query(fs.readFileSync(path.join(here, "isolated-supabase-bootstrap.sql"), "utf8"));
await db.query(fs.readFileSync(process.argv[2], "utf8"));
for (const m of MIGS) await db.query(read(`migrations/${m}.sql`));
const defs = async () => (await db.query(`select p.oid::regprocedure::text f, md5(pg_get_functiondef(p.oid)) d, coalesce(p.proacl::text,'') acl
  from pg_proc p where p.pronamespace in ('public'::regnamespace,'private'::regnamespace)
  and p.proname in ('get_move_in_today_queue','complete_or_snooze_move_in_tracking','record_move_in_visit_result','move_in_today_queue') order by 1`)).rows;
const before = await defs();
let applied = true;
try { await db.query(read(`migrations/${NEW}.sql`)); } catch (e) { applied = false; check("마이그레이션 적용", false, e.message); }
if (applied) check("마이그레이션 6개 순서 적용(운영 스키마 원본)", true);
const again = await db.query(read(`migrations/${NEW}.sql`)).then(() => null, (e) => e.message);
await db.query("rollback").catch(() => {});
check("재실행 시 사전 점검이 중단", /abort/.test(again ?? ""), again);

const STAYJ = "1283e198-5043-4027-96d6-edcc7a6686c6", P2 = "21000000-0000-4000-8000-000000000002";
const id = (p, n) => `${p}-0000-4000-8000-${String(n).padStart(12, "0")}`;
const UC = id("31000000", 1), MC = id("41000000", 1); // Stay J 상담사
const UA = id("31000000", 2), MA = id("41000000", 2); // Stay J 관리자
const UP = id("31000000", 3), MP = id("41000000", 3); // P2 관리자
const UQ = id("31000000", 4), MQ = id("41000000", 4); // P2 상담사
await db.query(`insert into public.organization(id,name) values ('11000000-0000-4000-8000-000000000001','o')`);
await db.query(`insert into public.project(id,organization_id,name) values ($1,'11000000-0000-4000-8000-000000000001','s'),($2,'11000000-0000-4000-8000-000000000001','p2')`, [STAYJ, P2]);
for (const [u, m, p, role] of [[UC, MC, STAYJ, "COUNSELOR"], [UA, MA, STAYJ, "PROJECT_ADMIN"], [UP, MP, P2, "PROJECT_ADMIN"], [UQ, MQ, P2, "COUNSELOR"]]) {
  await db.query(`insert into auth.users(id) values ($1)`, [u]);
  await db.query(`insert into public.project_member(id,project_id,user_id,role) values ($1,$2,$3,$4)`, [m, p, u, role]);
}
for (const p of [STAYJ, P2]) await db.query(`insert into public.move_in_tracking_policy(project_id,reason_code,stale_after,created_by) values
  ($1,'C_GRADE_STALE','7 days',$2),($1,'D_GRADE_STALE','7 days',$2),($1,'ABSENCE_RETRY','1 day',$2)`, [p, p === STAYJ ? MA : MP]);
let seq = 0;
async function unit(project, grade, { lastContactDays = 30, assigned = null } = {}) {
  seq++;
  const u = id("8e000000", seq), c = id("51000000", seq);
  await db.query(`insert into public.project_unit(unit_id,project_id,building_no,unit_no) values ($1,$2,'9',$3)`, [u, project, String(seq)]);
  await db.query(`insert into public.customer(id,project_id,name,phone,phone_raw,assigned_counselor_id) values ($1,$2,'n',$3,$3,$4)`, [c, project, `010-5${String(seq).padStart(3, "0")}-0000`, assigned]);
  const k = (await db.query(`insert into public.contract(project_id,customer_id,unit_id,contract_status) values ($1,$2,$3,'ACTIVE') returning contract_id`, [project, c, u])).rows[0].contract_id;
  await db.query(`insert into public.unit_occupancy_status(project_id,unit_id,contract_id,legacy_grade,last_contact_at) values ($1,$2,$3,$4, now() - make_interval(days => $5::int))`, [project, u, k, grade, lastContactDays]);
  await db.query(`insert into public.consultation(project_id,customer_id,counselor_id,consulted_at,content,created_by,unit_id,contact_type,structured_tags)
    values ($1,$2,$3, now() - make_interval(days => $4::int), 'h', $3, $5, 'CALL', $6)`, [project, c, project === STAYJ ? MA : MP, lastContactDays, u, JSON.stringify({ legacy_grade: grade })]);
  return { u, c, k, project };
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
const SAVE = `select public.create_move_in_consultation(p_project_id:=$1,p_unit_id:=$2,p_customer_id:=$3,p_consultation_type:='OUTBOUND',p_content:='x',p_expected_contract_id:=$5,
  p_legacy_grade:=$4,p_next_contact_at:=$6::timestamptz,p_occupancy_intent:=null,p_funding_status:=null,p_move_in_status:=null,p_planned_move_in_date:=null,
  p_balance_paid_at:=null,p_actual_move_in_date:=null,p_reason:=null,p_business_purpose:=null,p_clear_next_contact_at:=false,p_operational_intent:=null) as id`;
const save = (user, t, grade, next = null) => asUser(user, SAVE, [t.project, t.u, t.c, grade, t.k, next]);
const complete = (user, t, action = "COMPLETE", until = null) =>
  asUser(user, `select public.complete_or_snooze_move_in_tracking($1,$2,$3,$4::timestamptz) as d`, [t.project, t.u, action, until]);
const inQueue = async (t, at = null, user = UA) => {
  const r = await asUser(user, `select unit_id, reason_codes from public.get_move_in_today_queue($1, coalesce($2::timestamptz, now()))`, [t.project, at]);
  return r.rows?.find((x) => x.unit_id === t.u) ?? null;
};
const dispositions = async (t) => Number((await db.query(`select count(*) from public.move_in_tracking_disposition where unit_id = $1`, [t.u])).rows[0].count);
const consultCount = async (t) => Number((await db.query(`select count(*) from public.consultation where unit_id = $1`, [t.u])).rows[0].count);
const kstMidnight = async (days) => (await db.query(`select (date_trunc('day', now() at time zone 'Asia/Seoul') + make_interval(days => $1::int)) at time zone 'Asia/Seoul' as t`, [days])).rows[0].t;

// 1) 전화 부재 저장 → 완료 → 오늘 목록 제외, 부재·상담 유지
const t1 = await unit(STAYJ, "C");
check("C등급 경과 세대가 오늘 관리대상에 표시", !!(await inQueue(t1))?.reason_codes?.includes("C_GRADE_STALE"), await inQueue(t1));
const s1 = await save(UC, t1, "부재");
const c1 = await complete(UC, t1);
check("전화 부재 저장 성공 후 완료 RPC 성공", s1.ok && c1.ok && !!c1.rows[0].d, { s1, c1 });
check("완료 후 오늘 목록에서 제외", (await inQueue(t1)) === null);
check("완료 처리는 상담·부재 기록을 바꾸지 않음(상담 2건 유지)", (await consultCount(t1)) === 2);
const c1b = await complete(UC, t1);
check("중복 호출: 기록 1건 유지(갱신)", c1b.ok && (await dispositions(t1)) === 1, { c1b, n: await dispositions(t1) });
check("다음 날에는 같은 사유로 다시 표시(오늘 완료는 오늘만)", !!(await inQueue(t1, await kstMidnight(1))));

// 2) 저장 실패·권한 오류 시 완료 기록 없음
const t2 = await unit(STAYJ, "C");
const s2 = await save(UP, t2, "부재"); // 타 프로젝트 관리자 저장 실패
const c2 = await complete(UP, t2);
check("타 프로젝트 관리자: 저장·완료 모두 거부, 기록 0건", !s2.ok && !c2.ok && (await dispositions(t2)) === 0, { s2: s2.code, c2: c2.code });
const t2b = await unit(P2, "C", { assigned: MP });
const c2b = await complete(UQ, t2b); // 일반 프로젝트 상담사, 미배정 세대
check("일반 프로젝트 상담사: 담당 아닌 세대 완료 거부(IDOR)", !c2b.ok && (await dispositions(t2b)) === 0, c2b);
const c2c = await asUser(UC, `select public.complete_or_snooze_move_in_tracking($1,$2,'COMPLETE',null) as d`, [STAYJ, t2b.u]);
check("다른 프로젝트 세대 ID로 완료 시도 거부", !c2c.ok, c2c);
const tA = await unit(STAYJ, "A", { lastContactDays: 1 });
const cA = await complete(UC, tA);
check("관리대상이 아닌 세대: null, 기록 없음", cA.ok && cA.rows[0].d === null && (await dispositions(tA)) === 0, cA);
const anon = await db.query(`select has_function_privilege('anon','public.complete_or_snooze_move_in_tracking(uuid,uuid,text,timestamptz,text)','EXECUTE') a,
  has_function_privilege('anon','private.move_in_today_queue(uuid,timestamptz,uuid)','EXECUTE') b,
  has_function_privilege('anon','public.record_move_in_visit_result(uuid,uuid,uuid,text,text,occupancy_intent,timestamptz)','EXECUTE') c,
  has_function_privilege('authenticated','public.record_move_in_visit_result(uuid,uuid,uuid,text,text,occupancy_intent,timestamptz)','EXECUTE') d`);
check("ACL: anon 실행 불가, 방문 7인자 authenticated 허용", !anon.rows[0].a && !anon.rows[0].b && !anon.rows[0].c && anon.rows[0].d, anon.rows[0]);

// 3) 다음 관리일 미루기: 지정일 전 숨김, 지정일 표시, 새 사유는 즉시 표시
const t3 = await unit(STAYJ, "C");
const d3 = await kstMidnight(3);
const due3 = new Date(new Date(d3).getTime() + 9 * 3600e3).toISOString(); // 지정일 KST 09:00
const s3 = await save(UC, t3, "부재", due3);
const c3 = await complete(UC, t3, "SNOOZE", due3);
check("부재 + 다음 관리일 저장 후 미루기 성공", s3.ok && c3.ok && !!c3.rows[0].d, { s3, c3 });
check("오늘·지정일 전날까지 숨김", (await inQueue(t3)) === null && (await inQueue(t3, await kstMidnight(1))) === null && (await inQueue(t3, new Date(new Date(d3).getTime() - 60e3).toISOString())) === null);
const on3 = await inQueue(t3, new Date(new Date(d3).getTime() + 3600e3).toISOString());
check("지정일에 다시 표시(다음 관리일 도래 사유 포함)", !!on3 && on3.reason_codes.includes("NEXT_CONTACT_DUE") && on3.reason_codes.includes("C_GRADE_STALE"), on3);
await db.query(`update public.unit_occupancy_status set funding_status = 'FUNDING_SHORTAGE' where unit_id = $1`, [t3.u]);
const urgent = await inQueue(t3, await kstMidnight(1));
check("지정일 전이라도 새 사유(자금관리)가 생기면 다시 표시", !!urgent && urgent.reason_codes.includes("C_GRADE_FUNDING"), urgent);
const bad = await complete(UC, t3, "SNOOZE", new Date(Date.now() - 86400e3).toISOString());
check("과거 날짜로 미루기 거부", !bad.ok && bad.code === "23514", bad);

// 4) 다음 관리일 도래: 지정일 이후 접촉 시도가 없으면 표시, 시도하면 사라짐
const t4 = await unit(STAYJ, "C", { lastContactDays: 1 });
check("최근 접촉한 C 세대는 표시 안 됨", (await inQueue(t4)) === null);
await db.query(`update public.unit_occupancy_status set next_contact_at = now() - interval '1 hour' where unit_id = $1`, [t4.u]);
await db.query(`update public.consultation set consulted_at = now() - interval '2 days' where unit_id = $1`, [t4.u]);
const due4 = await inQueue(t4);
check("다음 관리일 도래 세대 표시", !!due4 && due4.reason_codes.includes("NEXT_CONTACT_DUE"), due4);
const s4 = await save(UC, t4, "B");
check("관리일 이후 상담하면 다음 관리일 도래 사라짐", s4.ok && (await inQueue(t4)) === null, await inQueue(t4));

// 5) 방문 부재: 재방문 필요 + 다음 방문일 → 지정일까지 숨김, 일정 1건
const t5 = await unit(STAYJ, "D");
const vt = (await db.query(`insert into public.move_in_visit_target(project_id,unit_id,contract_id,customer_id,status,source,absence_streak_at_open,grade_before,created_by,updated_by)
  values ($1,$2,$3,$4,'VISIT_NEEDED','ABSENCE_STREAK',3,'D',$5,$5) returning visit_target_id`, [STAYJ, t5.u, t5.k, t5.c, MA])).rows[0].visit_target_id;
const d5 = await kstMidnight(2);
const due5 = new Date(new Date(d5).getTime() + 9 * 3600e3).toISOString();
const v5 = await asUser(UC, `select public.record_move_in_visit_result($1,$2,$3,'REVISIT_NEEDED','부재',null,$4::timestamptz) as id`, [STAYJ, vt, t5.k, due5]);
const sch = (await db.query(`select count(*) filter (where status='PENDING') p, count(*) filter (where status='PENDING' and contact_type='VISIT' and planned_at=$2::timestamptz) v from public.contact_schedule where unit_id=$1`, [t5.u, due5])).rows[0];
const vst = (await db.query(`select status from public.move_in_visit_target where visit_target_id=$1`, [vt])).rows[0].status;
check("재방문 필요 + 다음 방문일 저장: 상태 REVISIT_NEEDED, 방문 일정 1건", v5.ok && vst === "REVISIT_NEEDED" && Number(sch.p) === 1 && Number(sch.v) === 1, { v5, vst, sch });
const c5 = await complete(UC, t5, "SNOOZE", due5);
check("다음 방문일까지 숨김", c5.ok && (await inQueue(t5)) === null && (await inQueue(t5, await kstMidnight(1))) === null, c5);
const on5 = await inQueue(t5, new Date(new Date(d5).getTime() + 3600e3).toISOString());
check("다음 방문일에 재방문 필요로 다시 표시", !!on5 && on5.reason_codes.includes("REVISIT_NEEDED"), on5);
const v5b = await asUser(UC, `select public.record_move_in_visit_result($1,$2,$3,'REVISIT_NEEDED','부재',null,$4::timestamptz) as id`, [STAYJ, vt, t5.k, new Date(Date.now() - 3600e3).toISOString()]);
check("과거 다음 방문일 거부", !v5b.ok && v5b.code === "23514", v5b);
const v5c = await asUser(UC, `select public.record_move_in_visit_result($1,$2,$3,'VISITED','완료','SELF_MOVE_IN') as id`, [STAYJ, vt, t5.k]);
check("기존 6인자 방문 결과 저장 유지(방문 완료)", v5c.ok && (await db.query(`select status from public.move_in_visit_target where visit_target_id=$1`, [vt])).rows[0].status === "VISITED", v5c);

// 5b) 문자(MESSAGE)는 실제 접촉·접촉 시도·부재 판정에서 제외(장기 부재 규칙과 같음)
const SAVE_MSG = SAVE.replace("p_consultation_type:='OUTBOUND'", "p_consultation_type:='MESSAGE'");
const saveMsg = (user, t) => asUser(user, SAVE_MSG, [t.project, t.u, t.c, null, t.k, null]);
const queueRow = async (t) => (await asUser(UA, `select unit_id, reason_codes, last_contact_at from public.get_move_in_today_queue($1, now())`, [t.project])).rows?.find((x) => x.unit_id === t.u) ?? null;
{
  const tm = await unit(STAYJ, "D");
  const before = await queueRow(tm);
  const m1 = await saveMsg(UC, tm);
  const after = await queueRow(tm);
  const uosLast = (await db.query(`select last_contact_at from public.unit_occupancy_status where unit_id = $1`, [tm.u])).rows[0].last_contact_at;
  check("문자 저장 후에도 D등급 재접촉 유지(문자는 실제 접촉 아님)", m1.ok && !!after?.reason_codes?.includes("D_GRADE_STALE"), { m1, after });
  check("문자 저장이 last_contact_at을 갱신해도 오늘 관리 최종 접촉일은 마지막 실제 접촉", !!before && !!after && String(after.last_contact_at) === String(before.last_contact_at)
    && new Date(uosLast).getTime() > new Date(before.last_contact_at).getTime(), { before: before?.last_contact_at, after: after?.last_contact_at, uosLast });

  const tr = await unit(STAYJ, "C", { lastContactDays: 3 }); // C 경과(7일) 전, 부재(2일 전)가 마지막 시도가 되게
  const sr = await save(UC, tr, "부재");
  await db.query(`update public.consultation set consulted_at = now() - interval '2 days' where unit_id = $1 and structured_tags->>'legacy_grade' = '부재'`, [tr.u]);
  const r0 = await queueRow(tr);
  const mr = await saveMsg(UC, tr);
  const r1 = await queueRow(tr);
  check("부재 후 문자: 부재 재접촉 유지(문자는 부재를 끝내지 않음)", sr.ok && mr.ok && !!r0?.reason_codes?.includes("ABSENCE_RETRY") && !!r1?.reason_codes?.includes("ABSENCE_RETRY"), { r0, r1 });

  const tn = await unit(STAYJ, "C", { lastContactDays: 1 });
  await db.query(`update public.unit_occupancy_status set next_contact_at = now() - interval '1 hour' where unit_id = $1`, [tn.u]);
  await db.query(`update public.consultation set consulted_at = now() - interval '2 days' where unit_id = $1`, [tn.u]);
  const mn = await saveMsg(UC, tn);
  const n1 = await queueRow(tn);
  check("다음 관리일 이후 문자만 보냄: 다음 관리일 도래 유지", mn.ok && !!n1?.reason_codes?.includes("NEXT_CONTACT_DUE"), n1);
  const sn = await save(UC, tn, "B");
  check("이후 실제 상담하면 다음 관리일 도래 사라짐", sn.ok && (await queueRow(tn)) === null, await queueRow(tn));
}

// 6) 세대 지정 판정 = 전체 판정(모든 세대, 같은 시각)
const at = new Date().toISOString();
const full = (await asUser(UA, `select * from private.move_in_today_queue($1, $2::timestamptz, null) order by unit_id`, [STAYJ, at])).rows;
let same = full.length > 0;
for (const row of full) {
  const one = (await asUser(UA, `select * from private.move_in_today_queue($1, $2::timestamptz, $3)`, [STAYJ, at, row.unit_id])).rows;
  if (one.length !== 1 || JSON.stringify(one[0]) !== JSON.stringify(row)) same = false;
}
check(`세대 지정 판정 = 전체 판정(${full.length}세대)`, same);
const pub = (await asUser(UA, `select * from public.get_move_in_today_queue($1, $2::timestamptz) order by unit_id`, [STAYJ, at])).rows;
check("공개 함수 = 내부 함수(열·값 동일, reason_fingerprint 제외)", JSON.stringify(pub) === JSON.stringify(full.map(({ reason_fingerprint, ...r }) => r)));

// 6b) 경합: 같은 세대 완료 10건 동시 → 모두 성공·기록 1건, 상담 저장과 완료 동시 → 둘 다 성공·상담 1건 추가
{
  const t6 = await unit(STAYJ, "D");
  const cfg = { ...base, database: "stayj_todaytask" };
  const sessions = await Promise.all(Array.from({ length: 10 }, async () => { const c = new pg.Client(cfg); await c.connect(); return c; }));
  const call = async (c, sql, params) => {
    await c.query("begin");
    try {
      await c.query("select set_config('request.jwt.claim.sub', $1, true)", [UC]);
      await c.query("set local role authenticated");
      const r = await c.query(sql, params); await c.query("commit"); return { ok: true, rows: r.rows };
    } catch (e) { await c.query("rollback"); return { ok: false, error: e.message }; }
  };
  const res = await Promise.all(sessions.map((c) => call(c, `select public.complete_or_snooze_move_in_tracking($1,$2,'COMPLETE',null) as d`, [STAYJ, t6.u])));
  check("경합: 같은 세대 완료 10건 동시 → 모두 성공, 기록 1건", res.every((r) => r.ok) && (await dispositions(t6)) === 1, { fails: res.filter((r) => !r.ok).slice(0, 2), n: await dispositions(t6) });
  const t7 = await unit(STAYJ, "D");
  const beforeCons = await consultCount(t7);
  const [rs, rc] = await Promise.all([
    call(sessions[0], SAVE, [t7.project, t7.u, t7.c, "부재", t7.k, null]),
    call(sessions[1], `select public.complete_or_snooze_move_in_tracking($1,$2,'COMPLETE',null) as d`, [STAYJ, t7.u]),
  ]);
  check("경합: 상담 저장과 완료 동시 → 둘 다 성공, 상담 1건 추가", rs.ok && rc.ok && (await consultCount(t7)) === beforeCons + 1, { rs, rc });
  await Promise.all(sessions.map((c) => c.end()));
}

// 7) 롤백 → 이전 정의 복원 → 재적용
await db.query(read(`rollback/${NEW}.rollback.sql`));
check("롤백 후 함수 원문·ACL이 적용 전과 동일", JSON.stringify(await defs()) === JSON.stringify(before), await defs());
const afterRb = await asUser(UA, `select count(*)::int n from public.get_move_in_today_queue($1, now())`, [STAYJ]);
check("롤백 후 오늘 관리대상 조회 정상(처리 기록 유지)", afterRb.ok && Number((await db.query(`select count(*) from public.move_in_tracking_disposition`)).rows[0].count) > 0, afterRb);
let re = true; try { await db.query(read(`migrations/${NEW}.sql`)); } catch (e) { re = e.message; }
check("롤백 후 재적용(오늘 처리 기록이 있으면 사전 점검이 중단)", typeof re === "string" && /dispositions/.test(re), re);

await db.end();
console.log(out.join("\n"));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
