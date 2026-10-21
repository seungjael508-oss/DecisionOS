import { expect, test, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import ExcelJS from 'exceljs';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { LEDGER_COLUMNS, ledgerCells } from '@/lib/move-in/ledger-presentation';
import { buildLedgerWorkbook } from '@/lib/move-in/ledger-export';
import { LedgerPrintTable } from '@/components/move-in/ledger-print-table';
import { LedgerTable } from '@/components/move-in/ledger-table';

const EXPECTED = ['동/호수','현재등급','전화번호','납부상태','계약자','계약자 주소','아파트 분양금액','발코니 확장금액','추가옵션금액','분양대금 실납입액','아파트 분양 잔금','발코니 납부액','발코니 미납액','옵션 납부액','옵션 미납액','전체 미납액','연체 여부','은행명','가상계좌번호','계좌 용도','입주의향','자금/대출','입주진행','매매/임대','접촉상태','최종접촉','최근시도','담당자','특별관리','금전소비대차','입주예약','이사예정일','문제세대','관리사유'];
const row = { unitId:'u1', buildingNo:'101', unitNo:'1001', currentGrade:'C', phone:'010-0000-0000', customerName:'테스트', effectiveIntent:'UNDECIDED', rentalType:null,
  funding:'LOAN_NEEDED', moveIn:'NOT_STARTED', dealTypes:[], contactStatus:'CONTACTED', lastAttempt:'2026-10-01T01:00:00Z', lastContact:'2026-10-01T01:00:00Z', nextContact:'2026-12-31T01:00:00Z', assigneeId:null, specialReasons:[],
  management:{ loanAgreement:'TARGET', moveReservation:'BOOKED', movingDate:'2026-11-01', problemHousehold:'UNKNOWN', managementReasons:[] } } as never;

test('컬럼: 접촉상태·최종접촉·최근시도 포함, 다음접촉 제외, 나머지 순서 유지', () => {
  expect([...LEDGER_COLUMNS]).toEqual(EXPECTED);
});
test('셀: 컬럼 수 일치, 최종접촉=lastContact, nextContact 미노출', () => {
  const cells = ledgerCells(row, {});
  expect(cells.length).toBe(LEDGER_COLUMNS.length);
  expect(cells[LEDGER_COLUMNS.indexOf('최종접촉')]).toMatch(/2026/);
  expect(cells.join('|')).not.toMatch(/12/);  // nextContact(12-31) 값이 어느 셀에도 없음
  expect(cells[LEDGER_COLUMNS.indexOf('금전소비대차')]).toBe('대상');
  expect(cells[LEDGER_COLUMNS.indexOf('입주예약')]).toBe('예약완료');
  expect(cells[LEDGER_COLUMNS.indexOf('문제세대')]).toBe('원천 확인필요');
  expect(ledgerCells({ ...(row as object), lastContact: null } as never, {})[LEDGER_COLUMNS.indexOf('최종접촉')]).toBe('—');
});
test('화면 표·인쇄 헤더', () => {
  const screen = renderToStaticMarkup(createElement(LedgerTable, { rows: [row], assignees: {} }));
  const print = renderToStaticMarkup(createElement(LedgerPrintTable, { rows: [ledgerCells(row, {})], asOf: 'x' }));
  for (const html of [screen, print]) { expect(html).toContain('최종접촉'); expect(html).not.toContain('다음접촉'); }
  // 최근시도는 기본 화면에서만 숨기고 인쇄·엑셀에는 유지
  expect((screen.match(/role="cell"/g) ?? []).length).toBe(EXPECTED.length - 1);
  expect(screen).not.toContain('최근시도');
  expect(print).toContain('최근시도');
});
test('엑셀 내보내기 헤더·행', async () => {
  const wb = new ExcelJS.Workbook(); await wb.xlsx.load(Buffer.from(await buildLedgerWorkbook([ledgerCells(row, {})]), 'base64') as never);
  const sheet = wb.getWorksheet('통합원장')!;
  expect((sheet.getRow(1).values as unknown[]).slice(1)).toEqual(EXPECTED);
  expect((sheet.getRow(2).values as unknown[]).length - 1).toBe(EXPECTED.length);
  expect(sheet.autoFilter).toBe('A1:AH2');  // AH = 34번째 열
});
