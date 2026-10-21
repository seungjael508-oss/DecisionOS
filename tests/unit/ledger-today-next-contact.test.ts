import { describe, expect, test } from 'vitest';
import { applyLedgerQuery, parseLedgerQuery, type LedgerFilterRow } from '@/lib/move-in/ledger-filters';

// 오늘 관리대상 C·D 집중관리(20261015): FOLLOW_UP_DUE 사유가 사라져도 기존 next_contact 링크가 빈 목록이 되지 않아야 함
const row = (unitNo: string, queue: LedgerFilterRow['queue'], moveIn: string | null = null): LedgerFilterRow => ({
  unitId: `00000000-0000-4000-8000-${unitNo.padStart(12, '0')}`, buildingNo: '101', unitNo,
  currentGrade: 'C', customerName: null, phone: null, assigneeId: null, effectiveIntent: null, rentalType: null,
  funding: null, moveIn, nextContact: null, specialReasons: [], specialPriority: null,
  dealTypes: [], payment: null, balance: null, views: [], queue,
});

describe('통합원장 오늘 관리대상 view의 next_contact 필터', () => {
  const rows = [
    row('1001', { order: 1, reasonCodes: ['C_GRADE_FUNDING'] }),
    row('1002', { order: 2, reasonCodes: ['SALE_TRACKING'] }, 'DELAYED'),
    row('1003', null),
  ];
  const now = new Date('2026-10-15T00:00:00Z');
  const units = (query: string) => applyLedgerQuery(rows, parseLedgerQuery(new URLSearchParams(query)), now).filteredSorted.map(r => r.unitNo);

  test('기존 next_contact 링크는 전체(오늘 관리대상 행 전부)로 처리', () => {
    expect(units('view=today&filter=next_contact')).toEqual(['1001', '1002']);
    expect(units('view=today&filter=next_contact')).toEqual(units('view=today'));
  });
  test('funding·delayed 필터는 그대로 동작', () => {
    expect(units('view=today&filter=funding')).toEqual(['1001']);
    expect(units('view=today&filter=delayed')).toEqual(['1002']);
  });
  test('Queue 행이 없는 세대는 오늘 관리대상 view에 포함되지 않음', () => {
    expect(units('view=today&filter=next_contact')).not.toContain('1003');
  });
});
