// ledger-chapter-sql-editor.sql ↔ 앱 챕터 판정(ledger-chapters.ts + intent.ts + d-grade-reasons.ts) 세대 단위 대조
// 로컬 격리 PostgreSQL(127.0.0.1:54329), 무작위 데이터. pg 패키지가 있는 폴더에서 실행(경로는 here 기준).
import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const mod = (p) => import(pathToFileURL(path.join(root, p)).href);
const { matchesLedgerChapter } = await mod("src/lib/move-in/ledger-chapters.ts");
const { resolveEffectiveMoveInIntent } = await mod("src/lib/move-in/intent.ts");
const { currentAbsenceStreak } = await mod("src/lib/move-in/d-grade-reasons.ts");
const P = "1283e198-5043-4027-96d6-edcc7a6686c6";
const base = { host: "127.0.0.1", port: 54329, user: "postgres", password: "localtest" };

const admin = new pg.Client({ ...base, database: "postgres" });
await admin.connect();
await admin.query("drop database if exists stayj_chapter");
await admin.query("create database stayj_chapter");
await admin.end();
const db = new pg.Client({ ...base, database: "stayj_chapter" });
await db.connect();
await db.query(fs.readFileSync(path.join(here, "stub-schema.sql"), "utf8")
  .replace(/create role (\w+) nologin;/g, (_, role) => `do $r$ begin create role ${role} nologin; exception when duplicate_object then null; end $r$;`));

let seed = 1017;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = (a) => a[Math.floor(rand() * a.length)];
const uid = (n, p) => `${p}-0000-4000-8000-${String(n).padStart(12, "0")}`;
const iso = (min) => new Date(Date.UTC(2026, 8, 1) + min * 60000).toISOString();
await db.query(`insert into public.project values ($1,'hwayang')`, [P]);
await db.query(`insert into public.project_member values ($1,$2,$3,'PROJECT_ADMIN',true)`, [uid(1, "40000000"), P, uid(1, "30000000")]);

const truth = [];
const N = 500;
for (let i = 1; i <= N; i++) {
  const unitId = uid(i, "8f000000"), contractId = uid(i, "c0000000"), cust = uid(i, "50000000"), prev = uid(i, "5e000000");
  const grade = pick(["A", "B", "C", "C", "D", "D", null, "부재"]);
  const op = pick(["MOVE_IN", "CONSIDERING_MOVE_IN", "SALE_TRANSFER", "RENT", "TERMINATION", "ABANDONMENT", "UNDECIDED", null, null]);
  const occ = pick(["SELF_MOVE_IN", "SALE", "JEONSE", "MONTHLY_RENT", "UNDECIDED"]);
  const prior = rand() < 0.2;
  await db.query(`insert into public.project_unit values ($1,$2,'101',$3)`, [unitId, P, String(i)]);
  await db.query(`insert into public.customer values ($1,$2,'x',null),($3,$2,'y',null)`, [cust, P, prev]);
  if (prior) await db.query(`insert into public.contract values ($1,$2,$3,$4,'CANCELLED')`, [uid(i, "cf000000"), P, unitId, prev]);
  await db.query(`insert into public.contract values ($1,$2,$3,$4,'ACTIVE')`, [contractId, P, unitId, cust]);
  await db.query(`insert into public.unit_occupancy_status(project_id,unit_id,contract_id,legacy_grade,occupancy_intent,operational_intent) values ($1,$2,$3,$4,$5,$6)`,
    [P, unitId, contractId, grade, occ, op]);
  const contacts = [];
  for (let k = 0, n = Math.floor(rand() * 7); k < n; k++) {
    const own = !prior || rand() < 0.6;
    const at = Math.floor(rand() * 30) * 10;
    const tag = pick(["A", "B", "C", "D", "부재", "부재", "부재", "부재", "상담거절", null]);
    const type = pick(["CALL", "CALL", "CALL", "VISIT", "MESSAGE"]);
    const id = uid(i * 100 + k, "a0000000");
    await db.query(`insert into public.consultation(id,project_id,customer_id,counselor_id,consulted_at,content,created_by,unit_id,contact_type,structured_tags)
      values ($1,$2,$3,$4,$5,'x',$4,$6,$7,$8)`, [id, P, own ? cust : prev, uid(1, "40000000"), iso(at), unitId, type, tag === null ? null : JSON.stringify({ legacy_grade: tag })]);
    if (own) contacts.push({ id, consultedAt: iso(at), contactType: type, legacyGrade: tag });
  }
  const intent = resolveEffectiveMoveInIntent(op, occ);
  const row = { unitId, currentGrade: grade, effectiveIntent: intent.value, rentalType: intent.rentalType, absenceStreak: currentAbsenceStreak(contacts) };
  truth.push(row);
}
const app = { all_units: N, a_total: 0, b_total: 0, c_total: 0, d_total: 0, grade_other: 0, cd_sale: 0, cd_jeonse: 0, cd_monthly_rent: 0, cd_rent_type_unknown: 0,
  c_undecided: 0, d_undecided: 0, cd_sale_rent: 0, absence_3plus: 0 };
for (const r of truth) {
  if (r.currentGrade === "A") app.a_total++;
  if (r.currentGrade === "B") app.b_total++;
  if (r.currentGrade === "C") app.c_total++;
  if (r.currentGrade === "D") app.d_total++;
  if (!["A", "B", "C", "D"].includes(r.currentGrade)) app.grade_other++;
  const cd = r.currentGrade === "C" || r.currentGrade === "D";
  if (cd && r.effectiveIntent === "SALE_TRANSFER") app.cd_sale++;
  if (cd && r.effectiveIntent === "RENT" && r.rentalType === "JEONSE") app.cd_jeonse++;
  if (cd && r.effectiveIntent === "RENT" && r.rentalType === "MONTHLY_RENT") app.cd_monthly_rent++;
  if (cd && r.effectiveIntent === "RENT" && !r.rentalType) app.cd_rent_type_unknown++;
  if (matchesLedgerChapter(r, "c_undecided")) app.c_undecided++;
  if (matchesLedgerChapter(r, "d_undecided")) app.d_undecided++;
  if (matchesLedgerChapter(r, "cd_sale_rent")) app.cd_sale_rent++;
  if (matchesLedgerChapter(r, "absence_visit")) app.absence_3plus++;
}
const sql = fs.readFileSync(path.join(root, "docs/production-snapshot/ledger-chapter-sql-editor.sql"), "utf8");
await db.query("begin read only");
const got = (await db.query(sql)).rows[0];
await db.query("rollback");
const fromSql = Object.fromEntries(Object.entries(got).map(([k, v]) => [k, Number(v)]));
console.log(JSON.stringify({ sql: fromSql, app }));
const same = JSON.stringify(fromSql) === JSON.stringify(app);
console.log(same ? "MATCH: 챕터 숫자 SQL·앱 판정 일치" : "MISMATCH");
await db.end();
process.exit(same ? 0 : 1);
