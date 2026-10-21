// SQL Editor용 진단 쿼리를 로컬 격리 DB(stayj_iso, 경합 테스트 데이터)에서 실행해 문법·결과 확인
import pg from "pg";
import fs from "node:fs";

const sql = fs.readFileSync("C:/Users/PC-1/DecisionOS-dev/docs/production-snapshot/absence-streak-sql-editor.sql", "utf8")
  .replaceAll("1283e198-5043-4027-96d6-edcc7a6686c6", "10000000-0000-4000-8000-000000000001");
const [, q1, q2] = sql.split(/-- =+ 쿼리 [12]:[^\n]*\n/);
const c = new pg.Client({ host: "127.0.0.1", port: 54329, user: "postgres", password: "localtest", database: "stayj_iso" });
await c.connect();
await c.query("begin read only");
console.log("Q1", JSON.stringify((await c.query(q1)).rows));
console.log("Q2", JSON.stringify((await c.query(q2)).rows));
await c.query("rollback");
// 직접 계산과 대조: 함수 기준 연속 부재
const fn = (await c.query(`select count(*) filter (where absence_streak >= 3) n3 from public.get_move_in_absence_candidates('10000000-0000-4000-8000-000000000001')`)).rows[0];
console.log("FN streak_3_plus", fn.n3);
await c.end();
