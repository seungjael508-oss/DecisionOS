// 저장소 pgTAP 파일을 실제 PostgreSQL 17 + 실제 pgTAP(v1.3.3 SQL 설치)로 실행
// pgtap.sql 준비: https://github.com/theory/pgtap/archive/refs/tags/v1.3.3.tar.gz 압축 해제 후
//   sed -e 's,MODULE_PATHNAME,$libdir/pgtap,g' -e 's,__OS__,windows,g' -e 's,__VERSION__,1.3,g' sql/pgtap.sql.in > pgtap.sql
//   (C 확장 없이 순수 SQL로 설치됨. 2026-10-17 PostgreSQL 17.5에서 확인)
// 사용: node run-real-pgtap.mjs <스키마모드> [pgtap.sql 경로]
//   스키마모드 stub   : verification/stub-schema.sql(축소 스텁) 위에 마이그레이션 적용
//   스키마모드 <파일> : 운영 스키마 전용 덤프 파일(수신 후). 덤프 위에는 이미 적용된 20261009 이후만 적용
// 픽스처는 verification/pgtap-fixture.sql(비식별 고정 ID)을 사용한다.
import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const mode = process.argv[2] ?? "stub";
const pgtapSql = fs.readFileSync(process.argv[3] ?? path.join(here, "pgtap.sql"), "utf8");
const read = (p) => fs.readFileSync(path.join(root, "supabase", p), "utf8");
const stripPreflight = (sql) => sql.replace(/do \$preflight\$[\s\S]*?\$preflight\$;/, "");
const idempotentRoles = (sql) => sql.replace(/create role (\w+) nologin;/g, (_, r) => `do $r$ begin create role ${r} nologin; exception when duplicate_object then null; end $r$;`);
const base = { host: "127.0.0.1", port: 54329, user: "postgres", password: "localtest" };
const TESTS = [
  "move_in_absent_contact_separation.test.sql",
  "move_in_today_queue_cd_focus.test.sql",
  "move_in_absence_streak_visit_target.test.sql",
  "move_in_absence_auto_d_grade.test.sql",
];

async function freshDb(name) {
  const admin = new pg.Client({ ...base, database: "postgres" });
  await admin.connect();
  await admin.query(`drop database if exists ${name}`);
  await admin.query(`create database ${name}`);
  await admin.end();
  const db = new pg.Client({ ...base, database: name });
  await db.connect();
  db.on("notice", () => {});
  return db;
}

let totalFail = 0;
for (const file of TESTS) {
  const db = await freshDb("stayj_pgtap");
  if (mode === "stub") {
    await db.query(idempotentRoles(fs.readFileSync(path.join(here, "stub-schema.sql"), "utf8")));
    await db.query(stripPreflight(read("migrations/20261009100000_absent_contact_separation.sql")));
    await db.query(fs.readFileSync(path.join(here, "guarded18.sql"), "utf8"));
  } else {
    // 운영 스키마 전용 덤프(20261009 적용 상태). 덤프가 빼는 예약 역할·auth·extensions를 먼저 만든다
    await db.query(fs.readFileSync(path.join(here, "isolated-supabase-bootstrap.sql"), "utf8"));
    await db.query(fs.readFileSync(mode, "utf8"));
  }
  for (const m of ["20261015100000_today_queue_cd_focus", "20261017100000_absence_streak_visit_target",
    "20261017110000_consultation_d_grade_admin_guard", "20261017120000_absence_auto_d_grade"]) {
    await db.query(read(`migrations/${m}.sql`));
  }
  await db.query(pgtapSql);
  await db.query(fs.readFileSync(path.join(here, "pgtap-fixture.sql"), "utf8"));
  let lines = [];
  try {
    const res = await db.query(read(`tests/database/${file}`));
    for (const r of [res].flat()) for (const row of r.rows ?? []) lines.push(...Object.values(row).map(String));
  } catch (e) {
    lines.push(`not ok - ERROR ${e.message}`);
  }
  const results = lines.flatMap(l => l.split("\n")).filter(l => /^(not )?ok \d+/.test(l) || l.startsWith("not ok - ERROR"));
  const failed = results.filter(l => l.startsWith("not ok"));
  totalFail += failed.length;
  console.log(`${file}: ${results.length - failed.length}/${results.length} ok`);
  for (const l of failed) console.log(`  ${l}`);
  for (const l of lines.flatMap(x => x.split("\n")).filter(x => x.startsWith("#") && /Failed|have:|want:|caught|expected/.test(x)).slice(0, 12)) console.log(`    ${l}`);
  await db.end();
}
console.log(totalFail ? `\nFAIL ${totalFail}` : "\nALL PASS");
process.exit(totalFail ? 1 : 0);
