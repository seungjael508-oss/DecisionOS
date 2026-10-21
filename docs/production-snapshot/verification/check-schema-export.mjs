// schema-export-sql-editor.sql 방식 검증(로컬): 원본 DB(20261009 상태) → 추출(읽기 전용) → CSV → 조립 → 빈 DB 복원 →
// 원본과 비교(함수 원문·권한·테이블 권한·정책·인덱스·제약·트리거) → 재구성 DB에서 마이그레이션 4개·롤백 체인 실행
import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const { parseCsv, rebuild } = await import(pathToFileURL(path.join(here, "rebuild-from-export.mjs")).href);
const base = { host: "127.0.0.1", port: 54329, user: "postgres", password: "localtest" };
const sup = (f) => fs.readFileSync(path.join(root, "supabase", f), "utf8");
const idem = (s) => s.replace(/create role (\w+) nologin;/g, (_, r) => `do $r$ begin create role ${r} nologin; exception when duplicate_object then null; end $r$;`);
let pass = 0, fail = 0;
const check = (n, ok, d) => { ok ? pass++ : fail++; console.log(`${ok ? "ok  " : "FAIL"} ${n}${ok || d === undefined ? "" : " :: " + JSON.stringify(d).slice(0, 600)}`); };
async function fresh(name) {
  const a = new pg.Client({ ...base, database: "postgres" }); await a.connect();
  await a.query(`drop database if exists ${name}`); await a.query(`create database ${name}`); await a.end();
  const c = new pg.Client({ ...base, database: name }); await c.connect(); c.on("notice", () => {}); return c;
}

// 원본: 운영과 같은 20261009 상태(스텁 + 추가 객체: private 함수·트리거·컬럼 권한 등)
const src = await fresh("stayj_export_src");
await src.query(idem(fs.readFileSync(path.join(here, "stub-schema.sql"), "utf8")));
await src.query(sup("migrations/20261009100000_absent_contact_separation.sql").replace(/do \$preflight\$[\s\S]*?\$preflight\$;/, ""));
await src.query(fs.readFileSync(path.join(here, "guarded18.sql"), "utf8"));
await src.query(`revoke all on function public.create_move_in_consultation(uuid,uuid,uuid,text,text,text,timestamptz,public.occupancy_intent,public.funding_status,public.move_in_status,date,timestamptz,timestamptz,text,text,boolean,public.operational_intent) from public, authenticated;
  create index consultation_unit_idx on public.consultation(unit_id, consulted_at desc);
  create function public.touch() returns trigger language plpgsql as $$ begin return new; end $$;
  create trigger consultation_touch before update on public.consultation for each row execute function public.touch();
  grant select (id, name) on public.project to anon;`);

// 추출(읽기 전용) → CSV
const exportSql = fs.readFileSync(path.join(root, "docs/production-snapshot/schema-export-sql-editor.sql"), "utf8");
await src.query("begin read only");
const rows = (await src.query(exportSql)).rows;
await src.query("rollback");
const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const toCsv = (list) => ["ord,kind,name,ddl,total_rows", ...list.map(r => [r.ord, r.kind, r.name, r.ddl, r.total_rows].map(esc).join(","))].join("\n");
const csv = toCsv(rows);
// 잘린 CSV(마지막 5행 누락)는 조립 단계에서 거부되어야 한다
let truncErr = null; try { rebuild(parseCsv(toCsv(rows.slice(0, -5)))); } catch (e) { truncErr = e.message; }
const csvPath = path.join(here, "..", "..", "..", "..", "AppData/Local/Temp/schema-export-test.csv");
const r = rebuild(parseCsv(csv));
check("추출은 읽기 전용 트랜잭션에서 성공", rows.length > 0, rows.length);
check("CSV 왕복 후 항목 수 유지", r.items === rows.filter(x => x.ddl).length, { csv: r.items, rows: rows.length });
check("비밀정보 의심 패턴 0", r.secretHits === 0, r.secretHits);
check("잘린 CSV는 조립 거부", /행 수 불일치/.test(truncErr ?? ""), truncErr);

// 복원
const dst = await fresh("stayj_export_dst");
await dst.query(fs.readFileSync(path.join(here, "isolated-supabase-bootstrap.sql"), "utf8"));
let restoreError = null;
try { await dst.query(r.sql); } catch (e) { restoreError = e.message; }
check("재구성 SQL 복원 성공", !restoreError, restoreError);

// 비교
const fp = async (db) => {
  const q = (s) => db.query(s).then(x => x.rows.map(r => Object.values(r).join(" | ")).sort());
  return {
    functions: await q(`select p.oid::regprocedure::text, md5(regexp_replace(pg_get_functiondef(p.oid), '\s+', ' ', 'g')), coalesce((select string_agg(x, ',' order by x) from unnest(p.proacl::text[]) x),'') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private')`),
    tables: await q(`select c.oid::regclass::text, coalesce((select string_agg(x, ',' order by x) from unnest(c.relacl::text[]) x),''), c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','private') and c.relkind in ('r','p','v')`),
    columns: await q(`select a.attrelid::regclass::text, a.attname, format_type(a.atttypid,a.atttypmod), a.attnotnull, coalesce(pg_get_expr(d.adbin,d.adrelid),''), coalesce((select string_agg(x, ',' order by x) from unnest(a.attacl::text[]) x),'') from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where n.nspname in ('public','private') and c.relkind in ('r','p') and a.attnum>0 and not a.attisdropped`),
    constraints: await q(`select conrelid::regclass::text, conname, pg_get_constraintdef(oid) from pg_constraint where connamespace in (select oid from pg_namespace where nspname in ('public','private')) and contype <> 'n'`),
    indexes: await q(`select indexrelid::regclass::text, pg_get_indexdef(indexrelid) from pg_index x join pg_class c on c.oid=x.indrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','private')`),
    policies: await q(`select schemaname, tablename, policyname, permissive, cmd, roles::text, coalesce(qual,''), coalesce(with_check,'') from pg_policies where schemaname in ('public','private')`),
    triggers: await q(`select tgrelid::regclass::text, tgname, pg_get_triggerdef(oid) from pg_trigger where not tgisinternal`),
    types: await q(`select t.typname, (select string_agg(enumlabel, ',' order by enumsortorder) from pg_enum where enumtypid=t.oid) from pg_type t join pg_namespace n on n.oid=t.typnamespace where n.nspname in ('public','private') and t.typtype='e'`),
  };
};
const a = await fp(src), b = await fp(dst);
for (const k of Object.keys(a)) {
  const missing = a[k].filter(x => !b[k].includes(x)), extra = b[k].filter(x => !a[k].includes(x));
  check(`원본과 동일: ${k} (${a[k].length}개)`, !missing.length && !extra.length, { missing: missing.slice(0, 3), extra: extra.slice(0, 3) });
}

// 재구성 DB에서 신규 마이그레이션 4개(사전 점검 포함) → 역순 롤백
const MIGS = ["20261015100000_today_queue_cd_focus", "20261017100000_absence_streak_visit_target", "20261017110000_consultation_d_grade_admin_guard", "20261017120000_absence_auto_d_grade"];
let migError = null;
try { for (const m of MIGS) await dst.query(sup(`migrations/${m}.sql`)); for (const m of [...MIGS].reverse()) await dst.query(sup(`rollback/${m}.rollback.sql`)); }
catch (e) { migError = e.message; }
check("재구성 DB에서 마이그레이션 4개 적용·역순 롤백", !migError, migError);
await src.end(); await dst.end();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
