// schema-export-sql-editor.sql 결과 CSV(ord, kind, name, ddl) → 격리 DB 복원용 SQL 조립
// 사용: node rebuild-from-export.mjs <export.csv> <out.sql>
// - 함수 원문의 비밀정보 의심 패턴은 건수만 출력하고 값은 출력하지 않는다(1건 이상이면 중단).
// - 복원은 isolated-supabase-bootstrap.sql 적용 후 실행한다. SQL 함수 본문 검사를 끄고(check_function_bodies) 순서대로 만든다.
import fs from "node:fs";

export function parseCsv(text) {
  const rows = []; let row = [], field = "", i = 0, quoted = false;
  text = text.replace(/^﻿/, "");
  while (i < text.length) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i += 2; continue; }
      if (ch === '"') { quoted = false; i++; continue; }
      field += ch; i++; continue;
    }
    if (ch === '"') { quoted = true; i++; continue; }
    if (ch === ",") { row.push(field); field = ""; i++; continue; }
    if (ch === "\r") { i++; continue; }
    if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; i++; continue; }
    field += ch; i++;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

export const SECRET_PATTERNS = [/USER MAPPING/i, /eyJ[A-Za-z0-9_-]{20,}\./, /sk_(live|test)_[A-Za-z0-9]{10,}/, /sb_secret_[A-Za-z0-9_-]{10,}/,
  /Bearer [A-Za-z0-9._-]{20,}/, /(password|passwd|secret|api_?key|token)\s*[:=]\s*'[^']{8,}'/i];

export function rebuild(rows) {
  const [header, ...data] = rows;
  const idx = Object.fromEntries(header.map((h, k) => [h.trim().toLowerCase(), k]));
  for (const col of ["ord", "kind", "name", "ddl"]) if (!(col in idx)) throw new Error(`CSV에 ${col} 열이 없음`);
  const rowsWithData = data.filter(r => r.length >= 4 && r[idx.ord] !== "");
  // 결과 행 제한으로 잘린 CSV 차단: 모든 행의 total_rows 와 실제 행 수가 같아야 한다
  if (!("total_rows" in idx)) throw new Error("CSV에 total_rows 열이 없음(최신 schema-export-sql-editor.sql 결과가 아님)");
  const totals = new Set(rowsWithData.map(r => r[idx.total_rows]));
  if (totals.size !== 1 || Number([...totals][0]) !== rowsWithData.length)
    throw new Error(`CSV 행 수 불일치(받은 ${rowsWithData.length}행 / 전체 ${[...totals].join(",")}행) — SQL Editor 결과 행 제한을 해제하고 다시 내보내기`);
  const items = rowsWithData.filter(r => r[idx.ddl]).map(r => ({ ord: Number(r[idx.ord]), kind: r[idx.kind], name: r[idx.name], ddl: r[idx.ddl] }));
  const secretHits = items.reduce((n, it) => n + SECRET_PATTERNS.filter(p => p.test(it.ddl)).length, 0);
  items.sort((a, b) => a.ord - b.ord || a.name.localeCompare(b.name));
  const counts = items.reduce((m, it) => (m[it.kind] = (m[it.kind] ?? 0) + 1, m), {});
  const sql = ["-- rebuild-from-export.mjs 생성(운영 정의 재구성, 데이터 없음)", "set check_function_bodies = off;",
    ...items.map(it => `-- [${it.ord} ${it.kind}] ${it.name}\n${it.ddl.trim().replace(/;?\s*$/, ";")}`)].join("\n");
  return { sql, counts, secretHits, items: items.length };
}

if (process.argv[1] && process.argv[1].endsWith("rebuild-from-export.mjs")) {
  const [, , csvPath, outPath] = process.argv;
  const r = rebuild(parseCsv(fs.readFileSync(csvPath, "utf8")));
  console.log(`항목 ${r.items}개: ${JSON.stringify(r.counts)}`);
  console.log(`비밀정보 의심 패턴: ${r.secretHits} (0이어야 함)`);
  if (r.secretHits) { console.log("중단: 비밀정보 의심 패턴이 있어 복원용 파일을 만들지 않음"); process.exit(1); }
  fs.writeFileSync(outPath, r.sql);
  console.log(`작성: ${outPath}`);
}
