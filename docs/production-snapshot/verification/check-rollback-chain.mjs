// 마이그레이션 적용 → 역순 롤백 후 DB가 적용 전 상태로 돌아오는지(함수 원문 md5·ACL·정책·제약·컬럼·트리거) 실제 PostgreSQL에서 확인
// 사용: node check-rollback-chain.mjs stub                 → 축소 스텁 + A1~A4(20261009 상태로 복귀)
//       node check-rollback-chain.mjs <운영 스키마 SQL>    → 운영 스키마 + 전체 체인 A1~A6·A8~A11·A13(+A12)
//   전체 체인에서는 추가로 A13(20261020120000) 사전 점검(A8 없이·중복 적용·미적용 롤백 중단)과 A12·A13 적용 순서 무관을 확인한다.
import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const mode = process.argv[2] ?? "stub";
const read = (p) => fs.readFileSync(path.join(root, "supabase", p), "utf8");
const stripPreflight = (sql) => sql.replace(/do \$preflight\$[\s\S]*?\$preflight\$;/, "");
const idem = (sql) => sql.replace(/create role (\w+) nologin;/g, (_, r) => `do $r$ begin create role ${r} nologin; exception when duplicate_object then null; end $r$;`);
const base = { host: "127.0.0.1", port: 54329, user: "postgres", password: "localtest" };
const A1_A4 = ["20261015100000_today_queue_cd_focus", "20261017100000_absence_streak_visit_target",
  "20261017110000_consultation_d_grade_admin_guard", "20261017120000_absence_auto_d_grade"];
const A13 = "20261020120000_recovery_session_membership_block", A12 = "20261021100000_special_case_visit_target";
// E0 적용 순서(A7 없음). A12는 별도 판단이므로 체인 끝에서 따로 다룬다.
const FULL = [...A1_A4, "20261019100000_absence_streak_rule_fast_path", "20261019110000_today_task_completion",
  "20261019120000_rls_membership_set", "20261019130000_today_queue_materialize",
  "20261020100000_counselor_grade_change", "20261020110000_trade_funding_type", A13];
const MIGS = mode === "stub" ? A1_A4 : FULL;
let pass = 0, fail = 0;
const check = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"} ${name}${ok || detail === undefined ? "" : " :: " + JSON.stringify(detail).slice(0, 1500)}`); };

const admin = new pg.Client({ ...base, database: "postgres" });
await admin.connect();
await admin.query("drop database if exists stayj_rollback");
await admin.query("create database stayj_rollback");
await admin.end();
const db = new pg.Client({ ...base, database: "stayj_rollback" });
await db.connect();
db.on("notice", () => {});
if (mode === "stub") {
  await db.query(idem(fs.readFileSync(path.join(here, "stub-schema.sql"), "utf8")));
  await db.query(stripPreflight(read("migrations/20261009100000_absent_contact_separation.sql")));
  await db.query(fs.readFileSync(path.join(here, "guarded18.sql"), "utf8"));
} else {
  await db.query(fs.readFileSync(path.join(here, "isolated-supabase-bootstrap.sql"), "utf8"));
  await db.query(fs.readFileSync(mode, "utf8"));
}

// 공백 차이를 없앤 함수 원문 md5 + ACL + 테이블 목록. 전체 체인은 private 함수·정책·제약·컬럼·트리거까지 비교한다.
const norm = (e) => `md5(regexp_replace(${e}, '\\s+', ' ', 'g'))`;
const snapshot = async () => (await db.query(mode === "stub" ? `
  select 'fn:' || p.oid::regprocedure::text as obj, ${norm("pg_get_functiondef(p.oid)")} as sig, coalesce(p.proacl::text, '') as acl
  from pg_proc p where p.pronamespace = 'public'::regnamespace
    and p.proname in ('create_move_in_consultation', 'get_move_in_today_queue', 'get_move_in_absence_candidates', 'record_move_in_visit_result')
  union all
  select 'table:' || c.oid::regclass::text, '', coalesce(c.relacl::text, '') from pg_class c
  where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' and c.relname like 'move_in_%'
  order by 1` : `
  select 'fn:' || p.oid::regprocedure::text as obj, ${norm("pg_get_functiondef(p.oid)")} as sig, coalesce(p.proacl::text, '') as acl
  from pg_proc p where p.pronamespace in ('public'::regnamespace, 'private'::regnamespace) and p.prokind = 'f'
  union all
  select 'table:' || c.oid::regclass::text, c.relrowsecurity::text, coalesce(c.relacl::text, '') from pg_class c
  where c.relnamespace in ('public'::regnamespace, 'private'::regnamespace) and c.relkind in ('r', 'v', 'm')
  union all
  select 'col:' || table_schema || '.' || table_name || '.' || column_name, data_type || ' ' || is_nullable, coalesce(column_default, '')
  from information_schema.columns where table_schema in ('public', 'private')
  union all
  select 'con:' || conrelid::regclass::text || '.' || conname, ${norm("pg_get_constraintdef(oid)")}, '' from pg_constraint
  where connamespace in ('public'::regnamespace, 'private'::regnamespace)
  union all
  select 'pol:' || schemaname || '.' || tablename || '.' || policyname, ${norm("coalesce(qual, '') || '|' || coalesce(with_check, '')")}, cmd || ' ' || permissive || ' ' || roles::text
  from pg_policies where schemaname in ('public', 'private')
  union all
  select 'trg:' || tgrelid::regclass::text || '.' || tgname, ${norm("pg_get_triggerdef(oid)")}, tgenabled::text from pg_trigger
  where not tgisinternal and tgrelid in (select oid from pg_class where relnamespace in ('public'::regnamespace, 'private'::regnamespace))
  union all
  select 'idx:' || indexrelid::regclass::text, ${norm("pg_get_indexdef(indexrelid)")}, '' from pg_index
  where indrelid in (select oid from pg_class where relnamespace in ('public'::regnamespace, 'private'::regnamespace))
  order by 1`)).rows;
const diff = (x, y) => {
  const mx = new Map(x.map((r) => [r.obj, JSON.stringify(r)])), my = new Map(y.map((r) => [r.obj, JSON.stringify(r)]));
  return [...new Set([...mx.keys(), ...my.keys()])].filter((k) => mx.get(k) !== my.get(k));
};
const tryQuery = async (sql) => { try { await db.query(sql); return "ok"; } catch (e) { await db.query("rollback").catch(() => {}); return e.message; } };
const rows = (sql) => db.query(sql).then(r => r.rows);
const dataSql = "select (select count(*) from public.consultation) c, (select count(*) from public.contract_status_history) h";

const before = await snapshot();
if (mode !== "stub") {
  // A13 사전 점검: A8(소속 목록 함수) 없이 적용하면 중단·변경 없음
  for (const m of FULL.slice(0, FULL.indexOf("20261019120000_rls_membership_set"))) await db.query(read(`migrations/${m}.sql`));
  const s = await snapshot();
  check("A13 사전 점검: A8 미적용 상태면 중단", /A8 20261019120000 not applied/.test(await tryQuery(read(`migrations/${A13}.sql`))));
  check("A13 사전 점검 중단 후 변경 없음", diff(s, await snapshot()).length === 0);
  for (const m of [...FULL.slice(0, FULL.indexOf("20261019120000_rls_membership_set"))].reverse()) await db.query(read(`rollback/${m}.rollback.sql`));
  check("A1~A6 역순 롤백 후 적용 전과 같음(중간 점검)", diff(before, await snapshot()).length === 0, diff(before, await snapshot()));
}
for (const m of MIGS) await db.query(read(`migrations/${m}.sql`));
const applied = await snapshot();
const dataBefore = await rows(dataSql);
if (mode !== "stub") {
  check("A13 사전 점검: 중복 적용 중단", /not the expected definition/.test(await tryQuery(read(`migrations/${A13}.sql`))));
  check("A13 중복 적용 중단 후 변경 없음", diff(applied, await snapshot()).length === 0);
  // A12·A13 적용 순서 무관: A12를 A13 뒤에 적용한 상태 = A13을 롤백 → A12 → A13 재적용한 상태
  await db.query(read(`migrations/${A12}.sql`));
  const a13ThenA12 = await snapshot();
  await db.query(read(`rollback/${A13}.rollback.sql`));
  check("R13 사전 점검: 미적용 상태 롤백 중단", /not the expected recovery-block state/.test(await tryQuery(read(`rollback/${A13}.rollback.sql`))));
  await db.query(read(`migrations/${A13}.sql`));
  check("A12·A13 적용 순서 무관(최종 상태 같음)", diff(a13ThenA12, await snapshot()).length === 0, diff(a13ThenA12, await snapshot()));
  await db.query(read(`rollback/${A13}.rollback.sql`));
  await db.query(read(`rollback/${A12}.rollback.sql`));
  await db.query(read(`migrations/${A13}.sql`));
  check("R12 → A11+A13 상태 복귀", diff(applied, await snapshot()).length === 0, diff(applied, await snapshot()));
}
for (const m of [...MIGS].reverse()) await db.query(read(`rollback/${m}.rollback.sql`));
const after = await snapshot();
const dataAfter = await rows(dataSql);
console.log(`적용 전 객체 ${before.length}개 → 적용 후 ${applied.length}개(변경 ${diff(before, applied).length}개) → 역순 롤백 후 ${after.length}개`);
check(`역순 롤백 ${MIGS.length}개 후 ${mode === "stub" ? "함수 원문·ACL·테이블이 20261009 상태" : "함수·ACL·테이블·컬럼·제약·정책·트리거·인덱스가 운영 스키마 상태"}와 동일`, diff(before, after).length === 0, diff(before, after));
check("롤백이 상담·등급 이력 데이터를 지우지 않음", JSON.stringify(dataBefore) === JSON.stringify(dataAfter));
// 롤백 후 재적용 가능(사전 점검 통과)
for (const m of MIGS) await db.query(read(`migrations/${m}.sql`));
check("롤백 후 재적용 시 같은 상태", diff(applied, await snapshot()).length === 0, diff(applied, await snapshot()));
await db.end();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
