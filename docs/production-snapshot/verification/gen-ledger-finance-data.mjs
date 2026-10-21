// 통합원장 금액·계좌 서버 전용 데이터 생성기(개인정보 원문은 저장하지 않음)
// 입력: 세대별 가상계좌리스트, 동호차수별입금현황(발코니), 동호차수별입금현황(옵션) 엑셀(읽기 전용)
// 출력: src/lib/move-in/ledger-finance-data.server.ts (.gitignore 대상)
//  - 계좌: 동-호 → 은행·가상계좌(분양 잔금 전용)
//  - 발코니·옵션: 동-호 → 회차별 약정·납부원금, 계약자명 SHA-256 앞 24자리(원문 미저장), 차기계약자 존재 여부
// 검증: 회차 합계 = 소계, 세대당 계약자 1명, 금액 정수·0 이상, 동·호 형식. 하나라도 어긋나면 중단(값은 출력하지 않음)
// 사용: node gen-ledger-finance-data.mjs <가상계좌.xlsx> <발코니.xlsx> <옵션.xlsx> <out.ts>
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, "../../../package.json"));
const ExcelJS = require("exceljs");
const [accountFile, balconyFile, optionFile, outFile] = process.argv.slice(2);
if (!outFile) { console.error("usage: gen-ledger-finance-data.mjs <account> <balcony> <option> <out.ts>"); process.exit(2); }

const fail = (message) => { console.error(`FAIL ${message}`); process.exit(1); };
const sha = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const cell = (row, i) => { let v = row.getCell(i).value; if (v && typeof v === "object" && "result" in v) v = v.result; if (v && typeof v === "object" && v.richText) v = v.richText.map((t) => t.text).join(""); return v; };
const text = (v) => (v === null || v === undefined ? "" : String(v).normalize("NFKC").trim());
const unitKey = (dong, ho) => {
  const d = text(dong), h = text(ho);
  if (!/^\d{3,4}$/.test(d) || !/^\d{3,4}$/.test(h)) return null;
  return `${Number(d)}-${Number(h)}`;
};
const holderHash = (name) => crypto.createHash("sha256").update(text(name).replace(/\s+/g, "")).digest("hex").slice(0, 24);
const money = (v, where) => {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v !== "number" || !Number.isSafeInteger(v) || v < 0) fail(`금액 형식 오류 ${where}`);
  return v;
};
const date = (v, where) => {
  const s = text(v);
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) fail(`날짜 형식 오류 ${where}`);
  return s;
};
const load = async (file) => { const wb = new ExcelJS.Workbook(); await wb.xlsx.readFile(file); return wb.worksheets[0]; };

// 1) 가상계좌: 3행 머리글(가상계좌 | 은행명 | 동 | 호수 | 수취조회명)
const accounts = {};
{
  const ws = await load(accountFile);
  const header = [1, 2, 3, 4].map((i) => text(cell(ws.getRow(3), i)));
  if (header.join("|") !== "가상계좌|은행명|동|호수") fail("가상계좌 머리글이 예상과 다름");
  ws.eachRow((row, n) => {
    if (n <= 3) return;
    const key = unitKey(cell(row, 3), cell(row, 4));
    const number = text(cell(row, 1)), bank = text(cell(row, 2));
    if (!key && !number) return;
    if (!key || !/^[0-9-]{8,20}$/.test(number) || !bank) fail(`가상계좌 행 형식 오류 r${n}`);
    if (accounts[key]) fail(`가상계좌 동호 중복 r${n}`);
    accounts[key] = { bank, number };
  });
}

// 2) 발코니·옵션: 1행 머리글, 세대별 회차 행 + 소계 행
const EXPECTED = { 2: "동", 3: "호수", 4: "주택형", 7: "계약자명", 10: "차수", 11: "약정일자", 12: "약정금액", 19: "납부원금", 29: "초과금액", 31: "미환불금액", 32: "차기계약자" };
async function installmentsOf(file, label) {
  const ws = await load(file);
  for (const [i, name] of Object.entries(EXPECTED)) if (text(cell(ws.getRow(1), Number(i))) !== name) fail(`${label} 머리글 ${i}열이 예상과 다름`);
  const units = {};
  let subtotalRows = 0, installmentRows = 0;
  ws.eachRow((row, n) => {
    if (n === 1) return;
    const key = unitKey(cell(row, 2), cell(row, 3));
    if (!key) {
      // 마지막 '합계' 행만 건너뛴다. 그 외 동·호 형식 오류는 중단
      if (n === ws.rowCount && text(cell(row, 2)) === "합계" && !text(cell(row, 3))) return;
      fail(`${label} 동호 형식 오류 r${n}`);
    }
    const u = units[key] ??= { names: new Set(), transferred: false, installments: [], subtotal: null, excess: 0, unrefunded: 0 };
    if (text(cell(row, 4)) === "소계") {
      if (u.subtotal) fail(`${label} 소계 중복 r${n}`);
      u.subtotal = { scheduled: money(cell(row, 12), `${label} r${n}`), paid: money(cell(row, 19), `${label} r${n}`) };
      subtotalRows++;
      return;
    }
    const type = text(cell(row, 10));
    if (!/^(계약|잔금|[1-9]차)$/.test(type)) fail(`${label} 차수 형식 오류 r${n}`);
    const name = text(cell(row, 7));
    if (!name) fail(`${label} 계약자명 없음 r${n}`);
    u.names.add(holderHash(name));
    if (text(cell(row, 32))) u.transferred = true;
    // 초과입금·미환불은 납부원금(미납 계산)에 넣지 않고 별도 표시용으로만 합친다
    u.excess += money(cell(row, 29), `${label} r${n}`);
    u.unrefunded += money(cell(row, 31), `${label} r${n}`);
    u.installments.push({ type, dueDate: date(cell(row, 11), `${label} r${n}`), scheduled: money(cell(row, 12), `${label} r${n}`), paid: money(cell(row, 19), `${label} r${n}`) });
    installmentRows++;
  });
  const out = {};
  for (const [key, u] of Object.entries(units)) {
    if (!u.subtotal) fail(`${label} 소계 없음 ${key.replace(/\d/g, "#")}`);
    const s = u.installments.reduce((a, r) => a + r.scheduled, 0), p = u.installments.reduce((a, r) => a + r.paid, 0);
    if (s !== u.subtotal.scheduled || p !== u.subtotal.paid) fail(`${label} 회차 합계 ≠ 소계`);
    if (u.names.size !== 1) fail(`${label} 세대당 계약자 2명 이상`);
    out[key] = { holderHash: [...u.names][0], transferred: u.transferred, installments: u.installments, excess: u.excess, unrefunded: u.unrefunded };
  }
  return { units: out, subtotalRows, installmentRows, transferred: Object.values(out).filter((u) => u.transferred).length };
}
const balcony = await installmentsOf(balconyFile, "발코니");
const option = await installmentsOf(optionFile, "옵션");

const keys = [...new Set([...Object.keys(accounts), ...Object.keys(balcony.units), ...Object.keys(option.units)])].sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
const data = Object.fromEntries(keys.map((k) => [k, {
  ...(accounts[k] ? { account: accounts[k] } : {}),
  ...(balcony.units[k] ? { balcony: balcony.units[k] } : {}),
  ...(option.units[k] ? { option: option.units[k] } : {}),
}]));
// 파일명 앞 6자리(YYMMDD)가 자료 기준일
const asOf = (file) => { const m = path.basename(file).match(/^(\d{2})(\d{2})(\d{2})/); return m ? `20${m[1]}-${m[2]}-${m[3]}` : null; };
const manifest = {
  accountAsOf: asOf(accountFile), balconyAsOf: asOf(balconyFile), optionAsOf: asOf(optionFile),
  accountSourceFile: path.basename(accountFile), accountSourceSha256: sha(accountFile), accountUnitCount: Object.keys(accounts).length,
  balconySourceFile: path.basename(balconyFile), balconySourceSha256: sha(balconyFile), balconyUnitCount: Object.keys(balcony.units).length,
  balconyInstallmentRowCount: balcony.installmentRows, balconyTransferredUnitCount: balcony.transferred,
  optionSourceFile: path.basename(optionFile), optionSourceSha256: sha(optionFile), optionUnitCount: Object.keys(option.units).length,
  optionInstallmentRowCount: option.installmentRows, optionTransferredUnitCount: option.transferred,
  holderHash: "sha256(NFKC 계약자명, 공백 제거) 앞 24자리",
};
const ts = `import 'server-only';
import type { LedgerFinanceSource } from '@/lib/move-in/ledger-finance.server';

/** Generated by docs/production-snapshot/verification/gen-ledger-finance-data.mjs from read-only workbooks.
 * Contractor names are stored only as a SHA-256 prefix; phones and addresses are excluded. Account numbers are server-only. */
export const LEDGER_FINANCE_MANIFEST = ${JSON.stringify(manifest, null, 2)} as const;

export const LEDGER_FINANCE_SOURCE: Record<string, LedgerFinanceSource> = ${JSON.stringify(data, null, 2)};
`;
fs.writeFileSync(outFile, ts);
console.log(JSON.stringify({ units: keys.length, accounts: manifest.accountUnitCount, balcony: manifest.balconyUnitCount, balconyTransferred: balcony.transferred,
  option: manifest.optionUnitCount, optionTransferred: option.transferred }));
