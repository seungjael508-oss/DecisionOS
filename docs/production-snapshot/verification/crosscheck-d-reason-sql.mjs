// d-grade-reason-sql-editor.sql ↔ src/lib/move-in/d-grade-reasons.ts 세대 단위 대조(로컬 격리 PostgreSQL, 무작위 데이터)
// 선행: node verification/start.mjs (127.0.0.1:54329). 실행: node docs/production-snapshot/verification/crosscheck-d-reason-sql.mjs
import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const { deriveDGradeReasons } = await import(pathToFileURL(path.join(root, "src/lib/move-in/d-grade-reasons.ts")).href);
const P = "1283e198-5043-4027-96d6-edcc7a6686c6";
const base = { host: "127.0.0.1", port: 54329, user: "postgres", password: "localtest" };

const admin = new pg.Client({ ...base, database: "postgres" });
await admin.connect();
await admin.query("drop database if exists stayj_dreason");
await admin.query("create database stayj_dreason");
await admin.end();
const db = new pg.Client({ ...base, database: "stayj_dreason" });
await db.connect();
await db.query(fs.readFileSync(path.join(here, "stub-schema.sql"), "utf8").replace(/create role (\w+) nologin;/g, (_, role) => `do $r$ begin create role ${role} nologin; exception when duplicate_object then null; end $r$;`));

const sql = fs.readFileSync(path.join(root, "docs/production-snapshot/d-grade-reason-sql-editor.sql"), "utf8");
const lists = (name) => [...sql.match(new RegExp(`${name}\\(b, u\\) as \\(values ([^)]*(?:\\)[^)]*)*?)\\)\\s*,\\n`))[1].matchAll(/\('(\d+)','(\d+)'\)/g)].map(m => `${m[1]}-${m[2]}`);
const aselKeys = new Set(lists("asel_src")), delinquentKeys = new Set(lists("delinquent_src"));
const sourceKeys = [...new Set([...aselKeys, ...delinquentKeys])];

let seed = 20261017;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const uid = (n, p) => `${p}-0000-4000-8000-${String(n).padStart(12, "0")}`;
const t0 = Date.UTC(2026, 8, 1);
const iso = (min) => new Date(t0 + min * 60000).toISOString();

await db.query(`insert into public.project values ($1,'hwayang')`, [P]);
await db.query(`insert into public.project_member values ($1,$2,$3,'PROJECT_ADMIN',true)`, [uid(1, "40000000"), P, uid(1, "30000000")]);
const truth = new Map();
const N = 400;
for (let i = 1; i <= N; i++) {
  const unitId = uid(i, "8f000000"), contractId = uid(i, "c0000000"), cust = uid(i, "50000000"), prevCust = uid(i, "5e000000");
  const useSource = rand() < 0.3;
  let [b, u] = useSource ? pick(sourceKeys).split("-") : [String(101 + (i % 8)), String(1000 + i)];
  const pad = rand() < 0.15; // 원본과 표기 차이(앞자리 0)
  const bStored = pad ? `0${b}` : b, uStored = pad ? `0${u}` : u;
  const grade = pick(["D", "D", "D", "C", "B", null]);
  const funding = pick(["NORMAL", "LOAN_NEEDED", "LOAN_LIMIT_SHORTAGE", "FUNDING_SHORTAGE", "EXISTING_HOME_UNSOLD", "UNKNOWN"]);
  const moveIn = pick(["NOT_CONTACTED", "CONTACTED", "PLANNED", "DELAYED"]);
  const prior = rand() < 0.25;
  await db.query(`insert into public.project_unit values ($1,$2,$3,$4)`, [unitId, P, bStored, uStored]);
  await db.query(`insert into public.customer values ($1,$2,'x',null),($3,$2,'y',null)`, [cust, P, prevCust]);
  if (prior) await db.query(`insert into public.contract values ($1,$2,$3,$4,'CANCELLED')`, [uid(i, "cf000000"), P, unitId, prevCust]);
  await db.query(`insert into public.contract values ($1,$2,$3,$4,'ACTIVE')`, [contractId, P, unitId, cust]);
  await db.query(`insert into public.unit_occupancy_status(project_id,unit_id,contract_id,legacy_grade,funding_status,move_in_status) values ($1,$2,$3,$4,$5,$6)`,
    [P, unitId, contractId, grade, funding === "LOAN_LIMIT_SHORTAGE" ? "UNKNOWN" : funding, moveIn]);
  // 스텁 enum에 없는 LOAN_LIMIT_SHORTAGE는 텍스트 비교용으로 별도 보관
  if (funding === "LOAN_LIMIT_SHORTAGE") await db.query(`alter type public.funding_status add value if not exists 'LOAN_LIMIT_SHORTAGE'`).catch(() => {});
  if (funding === "LOAN_LIMIT_SHORTAGE") await db.query(`update public.unit_occupancy_status set funding_status='LOAN_LIMIT_SHORTAGE' where unit_id=$1`, [unitId]);
  const contacts = [], history = [];
  const nC = Math.floor(rand() * 8);
  for (let k = 0; k < nC; k++) {
    const own = !prior || rand() < 0.7;
    const at = Math.floor(rand() * 40) * 10; // 같은 시각 충돌 허용
    const tag = pick(["A", "B", "C", "D", "부재", "부재", "부재", "상담거절", null]);
    const type = pick(["CALL", "CALL", "CALL", "VISIT", "MESSAGE"]);
    const id = uid(i * 100 + k, "a0000000");
    await db.query(`insert into public.consultation(id,project_id,customer_id,counselor_id,consulted_at,content,created_by,unit_id,contact_type,structured_tags)
      values ($1,$2,$3,$4,$5,'x',$4,$6,$7,$8)`, [id, P, own ? cust : prevCust, uid(1, "40000000"), iso(at), unitId, type, tag === null ? null : JSON.stringify({ legacy_grade: tag })]);
    if (own) contacts.push({ id, consultedAt: iso(at), contactType: type, legacyGrade: tag });
  }
  const nH = Math.floor(rand() * 3);
  for (let k = 0; k < nH; k++) {
    const onCurrent = !prior || rand() < 0.6;
    const at = Math.floor(rand() * 40) * 10;
    const prev = pick(["A", "B", "C", "D", null]), next = pick(["C", "D", "D"]);
    const hid = uid(i * 100 + k, "b0000000");
    await db.query(`insert into public.contract_status_history(history_id,project_id,contract_id,unit_id,field_changed,previous_value,new_value,changed_by,changed_at)
      values ($1,$2,$3,$4,'legacy_grade',$5,$6,$7,$8)`, [hid, P, onCurrent ? contractId : uid(i, "cf000000"), unitId, prev, next, uid(1, "40000000"), iso(at)]);
    if (onCurrent) history.push({ id: hid, changedAt: iso(at), previousValue: prev, newValue: next });
  }
  const key = `${b}-${u}`;
  const sourceTags = [...(aselKeys.has(key) ? ["ASEL"] : []), ...(delinquentKeys.has(key) ? ["DELINQUENT"] : [])];
  truth.set(unitId, deriveDGradeReasons({ currentGrade: grade, sourceTags, holderChanged: prior, funding, moveIn, contacts, gradeHistory: history }));
}

const perUnitSql = sql.replace(/\nselect\n  count\(\*\) as d_total[\s\S]*$/, "\nselect unit_id, asel, delinquent, c_downgrade, move_in_difficulty, absence_3plus from counted;");
await db.query("begin read only");
const rows = (await db.query(perUnitSql)).rows;
const totals = (await db.query(sql)).rows[0];
await db.query("rollback");

const names = { asel: "ASEL", delinquent: "DELINQUENT", c_downgrade: "C_DOWNGRADE", move_in_difficulty: "MOVE_IN_DIFFICULTY", absence_3plus: "ABSENCE_STREAK" };
let mismatch = [];
const sqlUnits = new Set(rows.map(r => r.unit_id));
for (const r of rows) {
  const fromSql = Object.entries(names).filter(([col]) => r[col]).map(([, n]) => n);
  const fromTs = truth.get(r.unit_id) ?? [];
  if (JSON.stringify(fromSql) !== JSON.stringify(fromTs)) mismatch.push({ unit: r.unit_id, fromSql, fromTs });
}
const tsD = [...truth.entries()].filter(([, v]) => v !== undefined);
const dUnitsTs = (await db.query(`select count(*)::int n from public.unit_occupancy_status where legacy_grade='D'`)).rows[0].n;
const tsCounts = Object.fromEntries(Object.values(names).map(n => [n, [...truth.values()].filter(v => v.includes(n)).length]));
console.log(JSON.stringify({ units: N, dUnits: dUnitsTs, sqlRows: sqlUnits.size, totals, tsCounts }, null, 0));
console.log(mismatch.length ? `MISMATCH ${mismatch.length}: ${JSON.stringify(mismatch.slice(0, 5))}` : `MATCH: ${rows.length} D세대 사유가 SQL·앱 판정 일치`);
await db.end();
process.exit(mismatch.length || sqlUnits.size !== dUnitsTs ? 1 : 0);
