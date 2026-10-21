// cutover/ 패키지 리허설(로컬 PostgreSQL 17, 축소 스텁 스키마). 운영에 연결하지 않는다.
// 검증 SQL은 모두 'begin read only' 안에서 실행해 쓰기가 섞이면 실패하게 한다.
import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const cut = (f) => fs.readFileSync(path.join(root, "docs/production-snapshot/cutover", f), "utf8");
const sup = (f) => fs.readFileSync(path.join(root, "supabase", f), "utf8");
const P = "1283e198-5043-4027-96d6-edcc7a6686c6";
const base = { host: "127.0.0.1", port: 54329, user: "postgres", password: "localtest" };
const MIGS = ["20261015100000_today_queue_cd_focus", "20261017100000_absence_streak_visit_target",
  "20261017110000_consultation_d_grade_admin_guard", "20261017120000_absence_auto_d_grade"];
let pass = 0, fail = 0;
const check = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok || detail === undefined ? "" : " :: " + JSON.stringify(detail)}`); };

const admin = new pg.Client({ ...base, database: "postgres" });
await admin.connect();
await admin.query("drop database if exists stayj_cutover"); await admin.query("create database stayj_cutover");
await admin.end();
const db = new pg.Client({ ...base, database: "stayj_cutover" });
await db.connect(); db.on("notice", () => {});
const ro = async (sql) => { await db.query("begin read only"); try { return (await db.query(sql)).rows; } finally { await db.query("rollback"); } };
const roFails = async (sql) => { try { await ro(sql); return null; } catch (e) { return e.message; } };

// 스키마: 스텁 + 운영에 있는 시각 컬럼·테이블 보강(테스트 DB 전용)
await db.query(fs.readFileSync(path.join(here, "stub-schema.sql"), "utf8")
  .replace(/create role (\w+) nologin;/g, (_, r) => `do $r$ begin create role ${r} nologin; exception when duplicate_object then null; end $r$;`));
await db.query(`
  alter table public.consultation add column created_at timestamptz not null default now(), add column updated_at timestamptz not null default now();
  alter table public.contract add column updated_at timestamptz not null default now();
  alter table public.contact_schedule add column created_at timestamptz not null default now(), add column updated_at timestamptz not null default now();
  alter table public.customer add column updated_at timestamptz not null default now();
  alter table public.unit_occupancy_status add column updated_at timestamptz not null default now();
  create table public.unit_deal (id uuid primary key default gen_random_uuid(), project_id uuid, unit_id uuid, updated_at timestamptz not null default now());
  create table public.move_in_special_case (project_id uuid, unit_id uuid, contract_id uuid, updated_at timestamptz not null default now());`);
await db.query(sup("migrations/20261009100000_absent_contact_separation.sql").replace(/do \$preflight\$[\s\S]*?\$preflight\$;/, ""));
await db.query(fs.readFileSync(path.join(here, "guarded18.sql"), "utf8"));

// 데이터: 관리자·상담사, 세대 4개(B 2회 부재 이력 1세대 포함)
const uid = (n, p) => `${p}-0000-4000-8000-${String(n).padStart(12, "0")}`;
const COUN_U = uid(1, "30000000"), COUN_M = uid(1, "40000000");
await db.query(`insert into public.project values ($1,'stayj'); insert into public.project_member values ($2,$1,$3,'COUNSELOR',true)`.replace("$2", `'${COUN_M}'`).replace("$3", `'${COUN_U}'`).replace(/\$1/g, `'${P}'`));
for (let i = 1; i <= 4; i++) {
  await db.query(`insert into public.project_unit values ($1,$2,'101',$3)`, [uid(i, "8f000000"), P, String(i)]);
  await db.query(`insert into public.customer(id,project_id,name,assigned_counselor_id) values ($1,$2,'x',$3)`, [uid(i, "50000000"), P, COUN_M]);
  await db.query(`insert into public.contract(contract_id,project_id,unit_id,customer_id) values ($1,$2,$3,$4)`, [uid(i, "c0000000"), P, uid(i, "8f000000"), uid(i, "50000000")]);
  await db.query(`insert into public.unit_occupancy_status(project_id,unit_id,contract_id,legacy_grade) values ($1,$2,$3,$4)`, [P, uid(i, "8f000000"), uid(i, "c0000000"), ["B", "C", "D", null][i - 1]]);
}
for (const h of [10, 9]) await db.query(`insert into public.consultation(project_id,customer_id,counselor_id,consulted_at,content,created_by,unit_id,contact_type,structured_tags,created_at,updated_at)
  values ($1,$2,$3, now()-make_interval(hours=>$4::int),'x',$3,$5,'CALL','{"legacy_grade":"부재"}', now()-interval '1 day', now()-interval '1 day')`, [P, uid(1, "50000000"), COUN_M, h, uid(1, "8f000000")]);
await db.query(`update public.unit_occupancy_status set updated_at = now()-interval '1 day'; update public.contract set updated_at = now()-interval '1 day';
  update public.customer set updated_at = now()-interval '1 day'; update public.consultation set created_at = now()-interval '1 day', updated_at = now()-interval '1 day'`);

// T2 01
check("01: 처리 기록 없음 → PASS", (await ro(cut("01-precheck-dispositions-today.sql")))[0].verdict === "PASS");
await db.query(`insert into public.move_in_tracking_disposition(project_id,unit_id,contract_id,tracking_date,source_fingerprint,action) values ($1,$2,$3,(now() at time zone 'Asia/Seoul')::date,'x','DONE')`, [P, uid(1, "8f000000"), uid(1, "c0000000")]);
check("01: 오늘 처리 기록 있으면 STOP", (await ro(cut("01-precheck-dispositions-today.sql")))[0].verdict === "STOP");
await db.query(`delete from public.move_in_tracking_disposition`);

// T3 02
const q02 = cut("02-precheck-no-writes-since-stop.sql");
check("02: 중지 시각 미기입이면 실행 거부", /invalid input syntax/.test(await roFails(q02) ?? ""));
const overall = (rows) => rows.find(r => r.item === "OVERALL").verdict;
check("02: 중지 이후 쓰기 없음 → PASS", overall(await ro(q02.replace("<STOP_TIME_KST>", new Date(Date.now() - 3600e3).toISOString()))) === "PASS");
check("02: 중지 이후 쓰기 있음 → STOP", overall(await ro(q02.replace("<STOP_TIME_KST>", new Date(Date.now() - 3 * 86400e3).toISOString()))) === "STOP");

// T4 03
const toMap = (rows) => Object.fromEntries(rows.map(r => [r.item, r.value]));
const b03 = toMap(await ro(cut("03-baseline-db-state.sql")));
check("03: 기준선 20261009만 적용", b03.mig_20261009_absent_separation === "true" && ["mig_20261015_cd_focus", "mig_20261017100000_visit_target", "mig_20261017110000_d_admin_guard", "mig_20261017120000_auto_d"].every(k => b03[k] === "false"), b03);
check("03: 방문대상 n/a(테이블 없음)", b03["move_in_visit_target rows"] === "n/a");
check("05a: 적용 전 테이블 없음 처리", (await ro(cut("05a-visit-targets-snapshot.sql")))[0].table_exists === false);

// T5 적용 → T6 04
for (const m of MIGS) await db.query(sup(`migrations/${m}.sql`));
const r04 = await ro(cut("04-postcheck-after-migration.sql"));
const a04 = toMap(r04);
check("04: ABS 항목 전부 PASS", r04.filter(r => r.verdict === "FAIL").length === 0 && r04.find(r => r.item === "ABS 항목 FAIL 수").verdict === "PASS", r04.filter(r => r.verdict === "FAIL"));
check("04: 누락 항목 없음", r04.find(r => r.item.startsWith("누락 항목")).verdict === "PASS");
check("04: UNCHECKED 항목 없음(기대값 표가 결과와 맞음)", r04.every(r => r.verdict !== "UNCHECKED"), r04.filter(r => r.verdict === "UNCHECKED").map(r => r.item));
const same = r04.filter(r => r.verdict === "SAME"), changed = r04.filter(r => r.verdict === "CHANGED");
check("04: SAME 항목이 03과 같음(18인자·권한·등급 분포·건수)", same.length > 0 && same.every(r => b03[r.item] === r.value), same.filter(r => b03[r.item] !== r.value));
check("04: CHANGED 항목이 03과 다름(17인자·큐)", changed.length === 2 && changed.every(r => b03[r.item] !== r.value));

// T8 이후 상황: 자동 D 전환 발생 → 05a·06
await db.query("begin"); await db.query("select set_config('request.jwt.claim.sub',$1,true)", [COUN_U]); await db.query("set local role authenticated");
await db.query(`select public.create_move_in_consultation(p_project_id:=$1,p_unit_id:=$2,p_customer_id:=$3,p_consultation_type:='OUTBOUND',p_content:='x',p_legacy_grade:='부재')`, [P, uid(1, "8f000000"), uid(1, "50000000")]);
await db.query("commit");
const s05a = (await ro(cut("05a-visit-targets-snapshot.sql")))[0];
check("05a: 자동 전환 후 방문대상 1건 지문", s05a.total_rows === "1" && /VISIT_NEEDED=1/.test(s05a.rows_by_status), s05a);
const s06 = await ro(cut("06-auto-d-history.sql"));
check("06: 자동 D 1건(B→D, 현재 D)", s06.length === 1 && s06[0].previous_grade === "B" && Number(s06[0].auto_d_changes) === 1 && Number(s06[0].still_d_now) === 1, s06);
check("06b: 상세 1건, 고객 이름·전화 없음", (await ro(cut("06b-auto-d-history-detail.sql"))).every(r => !("name" in r) && !("phone" in r)) && (await ro(cut("06b-auto-d-history-detail.sql"))).length === 1);
check("05b: 내보내기 1행", (await ro(cut("05b-visit-targets-export.sql"))).length === 1);

// 롤백 대비: E1 → 05c
const SUF = "20261020_0630";
const q05c = cut("05c-verify-visit-target-backup.sql");
check("05c: 백업 접미사 미기입이면 실행 거부", /does not exist/.test(await roFails(q05c) ?? ""));
await db.query(cut("exec/E1-backup-visit-targets.EXEC.sql").replaceAll("<BACKUP_SUFFIX>", SUF));
const v1 = (await ro(q05c.replaceAll("<BACKUP_SUFFIX>", SUF)))[0];
check("E1 + 05c: 백업 직후 PASS(동일)", v1.verdict === "PASS(동일)" && Number(v1.backup_rows) === 1, v1);
check("E1: 백업 테이블에 authenticated 권한 없음", (await db.query(`select has_table_privilege('authenticated','cutover_backup."move_in_visit_target_${SUF}"','SELECT') p`)).rows[0].p === false);
const consBefore = (await db.query("select count(*)::int n from public.consultation")).rows[0].n;

// R1·R2 부분 롤백 → legacy_grade 이력이 있으면 R3 전체 중단(아무것도 바뀌지 않음)
const [R1, R2, R3, R4] = [...MIGS].reverse();
await db.query(sup(`rollback/${R1}.rollback.sql`));
await db.query(sup(`rollback/${R2}.rollback.sql`));
const r3err = await db.query(sup(`rollback/${R3}.rollback.sql`)).then(() => null, (e) => e.message);
await db.query("rollback").catch(() => {});
check("R3: legacy_grade 이력이 있으면 롤백 중단", /legacy_grade rows/.test(r3err ?? ""), r3err);
check("R3 중단 후: 방문대상 테이블·백업 행 유지", (await db.query("select count(*)::int n from public.move_in_visit_target")).rows[0].n === 1);

// 이하 R3·R4·E2 절차 리허설은 legacy_grade 이력 처리를 별도 승인으로 정한 경우를 가정한다.
// 이 격리 DB에서만 이력을 임시 테이블로 옮겼다가 재적용 후 되돌린다(운영에서는 이력 삭제·수정 금지).
await db.query("create temporary table rehearsal_legacy as select * from public.contract_status_history where field_changed = 'legacy_grade'");
await db.query("delete from public.contract_status_history where field_changed = 'legacy_grade'");
// 롤백 R3→R4 → 03 재확인
for (const m of [R3, R4]) await db.query(sup(`rollback/${m}.rollback.sql`));
const after = toMap(await ro(cut("03-baseline-db-state.sql")));
check("롤백 후 03: 마이그레이션 단계가 기준선과 같음", ["mig_20261009_absent_separation", "mig_20261015_cd_focus", "mig_20261017100000_visit_target", "mig_20261017110000_d_admin_guard", "mig_20261017120000_auto_d"].every(k => after[k] === b03[k]));
check("롤백 후 03: 17·18인자·큐 지문이 기준선과 같음", ["create_move_in_consultation(17) md5", "create_move_in_consultation(18) md5", "get_move_in_today_queue md5"].every(k => after[k] === b03[k]));
check("롤백 후: 자동 D·상담은 남음", (await db.query("select legacy_grade from public.unit_occupancy_status where unit_id=$1", [uid(1, "8f000000")])).rows[0].legacy_grade === "D"
  && (await db.query("select count(*)::int n from public.consultation")).rows[0].n === consBefore);

// 재적용 → E2 → 05c
for (const m of MIGS) await db.query(sup(`migrations/${m}.sql`));
await db.query("insert into public.contract_status_history select * from rehearsal_legacy");
await db.query(cut("exec/E2-restore-visit-targets.EXEC.sql").replaceAll("<BACKUP_SUFFIX>", SUF));
const v2 = (await ro(q05c.replaceAll("<BACKUP_SUFFIX>", SUF)))[0];
check("재적용 + E2 + 05c: 방문대상 복구 PASS", v2.verdict.startsWith("PASS") && Number(v2.backup_rows_missing_in_live) === 0, v2);
await db.query(cut("exec/E2-restore-visit-targets.EXEC.sql").replaceAll("<BACKUP_SUFFIX>", SUF));
check("E2 재실행해도 중복 없음", (await db.query("select count(*)::int n from public.move_in_visit_target")).rows[0].n === 1);

await db.end();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
