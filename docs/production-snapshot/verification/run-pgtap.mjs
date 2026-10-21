// 저장소 pgTAP 파일을 PGlite + 최소 pgTAP shim으로 실행(축소 스텁 스키마)
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";

const ROOT = "C:/Users/PC-1/DecisionOS-dev/supabase/";
const read = (p) => fs.readFileSync(ROOT + p, "utf8");
const stripPreflight = (sql) => sql.replace(/do \$preflight\$[\s\S]*?\$preflight\$;/, "");
const files = process.argv.slice(2);

const SHIM = `
create table public._tap(n serial primary key, ok boolean, description text, detail text);
grant insert, select on public._tap to authenticated;
grant usage on sequence public._tap_n_seq to authenticated;
create function public.no_plan() returns void language sql as $$ select $$;
create function public.ok(b boolean, d text) returns boolean language plpgsql as $$ begin
  insert into public._tap(ok, description, detail) values (coalesce(b,false), d, case when b is null then 'NULL' end); return coalesce(b,false); end $$;
create function public.is(a anyelement, b anyelement, d text) returns boolean language plpgsql as $$ begin
  insert into public._tap(ok, description, detail) values (a is not distinct from b, d, format('got %s want %s', a, b)); return a is not distinct from b; end $$;
create function public.is(a text, b text, d text) returns boolean language plpgsql as $$ begin
  insert into public._tap(ok, description, detail) values (a is not distinct from b, d, format('got %s want %s', a, b)); return a is not distinct from b; end $$;
create function public.lives_ok(sql text, d text) returns boolean language plpgsql as $$ begin
  begin execute sql; exception when others then
    insert into public._tap(ok, description, detail) values (false, d, sqlerrm); return false; end;
  insert into public._tap(ok, description) values (true, d); return true; end $$;
create function public.throws_ok(sql text, code text, msg text, d text) returns boolean language plpgsql as $$ begin
  begin execute sql; exception when others then
    insert into public._tap(ok, description, detail) values (sqlstate = code and (msg is null or sqlerrm = msg), d, sqlstate || ' ' || sqlerrm);
    return true; end;
  insert into public._tap(ok, description, detail) values (false, d, 'no exception'); return false; end $$;
create function public.results_eq(a text, b text, d text) returns boolean language plpgsql as $$ declare n int; m int; begin
  execute format('select count(*) from ((%s) except all (%s)) x', a, b) into n;
  execute format('select count(*) from ((%s) except all (%s)) x', b, a) into m;
  insert into public._tap(ok, description, detail) values (n = 0 and m = 0, d, format('diff %s/%s', n, m)); return n = 0 and m = 0; end $$;
create function public.finish() returns setof text language sql as $$ select '' where false $$;
grant execute on all functions in schema public to authenticated;
`;
const FIXTURE = `
insert into public.project values ('20000000-0000-4000-8000-000000000001','fixture');
insert into public.project_member values ('40000000-0000-4000-8000-0000000000c1','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-0000000000c1','PROJECT_ADMIN',true);
insert into public.customer values ('50000000-0000-4000-8000-0000000000a1','20000000-0000-4000-8000-000000000001','fixture',null);
create function public.create_contract(p_project_id uuid, p_customer_id uuid, p_unit_id uuid) returns uuid language plpgsql security definer set search_path to '' as $$
declare v uuid; begin
  perform private.require_project_admin(p_project_id, private.write_rpc_actor(p_project_id));
  insert into public.contract(project_id, unit_id, customer_id) values (p_project_id, p_unit_id, p_customer_id) returning contract_id into v;
  insert into public.unit_occupancy_status(project_id, unit_id, contract_id) values (p_project_id, p_unit_id, v);
  return v; end $$;
grant execute on function public.create_contract(uuid,uuid,uuid) to authenticated;
`;

let failed = 0;
for (const file of files) {
  const db = new PGlite();
  await db.exec(fs.readFileSync(new URL("./stub-schema.sql", import.meta.url), "utf8"));
  await db.exec(stripPreflight(read("migrations/20261009100000_absent_contact_separation.sql")));
  await db.exec(fs.readFileSync(new URL("./guarded18.sql", import.meta.url), "utf8"));
  const upTo = file.includes("absence_separation") ? 0 : 0;
  await db.exec(read("migrations/20261015100000_today_queue_cd_focus.sql"));
  await db.exec(read("migrations/20261017100000_absence_streak_visit_target.sql"));
  await db.exec(read("migrations/20261017110000_consultation_d_grade_admin_guard.sql"));
  await db.exec(read("migrations/20261017120000_absence_auto_d_grade.sql"));
  await db.exec(SHIM + FIXTURE);
  // 테스트는 begin…rollback으로 감싸져 있으므로 rollback을 commit 전 결과 조회로 바꾼다
  const body = read("tests/database/" + file).replace(/\nrollback;\s*$/, "\n");
  try { await db.exec(body); }
  catch (e) { console.log(`${file}: ERROR ${e.message}`); failed++; continue; }
  const rows = (await db.query("select ok, description, detail from public._tap order by n")).rows;
  await db.exec("rollback");
  const bad = rows.filter((r) => !r.ok);
  failed += bad.length;
  console.log(`${file}: ${rows.length - bad.length}/${rows.length} ok`);
  for (const r of bad) console.log(`  FAIL ${r.description} :: ${r.detail}`);
}
process.exit(failed ? 1 : 0);
