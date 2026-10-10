import { describe, expect, test, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { lookupContractAddress } from '@/lib/move-in/contract-address';
import { LEDGER_COLUMNS, ledgerCells } from '@/lib/move-in/ledger-presentation';

const P = 'project-a';
const entries = { u1: { contractId: 'k1', customerId: 'c1', address: '(12345) 서울시 테스트구 테스트로 1 101호' } };
const id = { projectId: P, unitId: 'u1', contractId: 'k1', customerId: 'c1' };

describe('계약자 주소: 현재 ACTIVE 계약자 일치 시에만', () => {
  test('계약·고객 ID 모두 일치하면 주소', () => {
    expect(lookupContractAddress(P, entries, id)).toBe(entries.u1.address);
  });
  test('명의변경(계약 ID 변경)이면 이전 계약자 주소 차단', () => {
    expect(lookupContractAddress(P, entries, { ...id, contractId: 'k2' })).toBeNull();
  });
  test('같은 계약이라도 고객 ID 다르면 차단', () => {
    expect(lookupContractAddress(P, entries, { ...id, customerId: 'c2' })).toBeNull();
  });
  test('다른 프로젝트는 차단', () => {
    expect(lookupContractAddress(P, entries, { ...id, projectId: 'project-b' })).toBeNull();
  });
  test('명부에 없는 세대·프로토타입 키는 null', () => {
    expect(lookupContractAddress(P, entries, { ...id, unitId: 'u9' })).toBeNull();
    expect(lookupContractAddress(P, entries, { ...id, unitId: 'toString' })).toBeNull();
  });
});

describe('통합원장 계약자 주소 컬럼', () => {
  const base = { unitId: 'u1', buildingNo: '101', unitNo: '1001', currentGrade: 'C', phone: '010', customerName: '테스트', effectiveIntent: 'UNDECIDED', rentalType: null,
    funding: 'NORMAL', moveIn: 'NOT_STARTED', dealTypes: [], contactStatus: 'CONTACTED', lastAttempt: null, lastContact: null, assigneeId: null, specialReasons: [] };
  test('계약자 바로 다음 열', () => {
    expect(LEDGER_COLUMNS.indexOf('계약자 주소')).toBe(LEDGER_COLUMNS.indexOf('계약자') + 1);
  });
  test('주소 있으면 표시, 없으면 미등록', () => {
    const at = LEDGER_COLUMNS.indexOf('계약자 주소');
    expect(ledgerCells({ ...base, contractAddress: '서울 주소' } as never, {})[at]).toBe('서울 주소');
    expect(ledgerCells({ ...base, contractAddress: null } as never, {})[at]).toBe('미등록');
    expect(ledgerCells(base as never, {})[at]).toBe('미등록');
  });
});
