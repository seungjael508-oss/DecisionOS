import { describe, expect, test } from 'vitest';
import { orderedIdsFromLoadedLedger, resolveWorkspaceAdjacentIds, parseWorkspaceContext } from '@/lib/move-in/ledger-context';
import { applyLedgerQuery, type LedgerFilterRow } from '@/lib/move-in/ledger-filters';

const P = 'p-1';
type Row = LedgerFilterRow & { projectId: string };
function row(unitId: string, buildingNo: string, unitNo: string, currentGrade: string, phone: string, projectId = P): Row {
  return {
    projectId, unitId, buildingNo, unitNo, currentGrade, customerName: `고객${unitId}`, phone,
    assigneeId: null, effectiveIntent: 'MOVE_IN', rentalType: null, funding: 'NORMAL', moveIn: 'NOT_CONTACTED',
    nextContact: null, contactStatus: 'CONTACTED', specialReasons: [], specialPriority: null, dealTypes: [],
    payment: 'UNREGISTERED', balance: null, views: [],
  };
}
const rows = [
  row('u1', '101', '201', 'A', '010-1111-0001'), row('u2', '101', '202', 'C', '010-1111-0002'),
  row('u3', '102', '101', 'D', '010-1111-0003'), row('u4', '102', '102', 'C', '010-1111-0004'),
  row('u5', '103', '501', 'B', '010-1111-0005'),
];
const loaded = { rows, snapshotAsOf: '2026-10-10T02:00:00.000Z' };
const base = `/projects/${P}/move-in/ledger`;

// 서버 /context 라우트와 동일한 계산(applyLedgerQuery)을 기준값으로 사용
function serverOrder(returnTo: string) {
  const context = parseWorkspaceContext(P, returnTo);
  return applyLedgerQuery(rows, context.state, new Date(loaded.snapshotAsOf)).filteredSorted.map((r) => r.unitId);
}

describe('이전·다음 세대 순서: 이미 받은 원장 재사용', () => {
  test.each([
    base,
    `${base}?grade=C`,
    `${base}?sort=phone&direction=desc`,
    `${base}?unitSearch=102`,
    `${base}?grade=C&sort=unit&direction=desc&page=2`,
  ])('서버 /context와 같은 순서: %s', (returnTo) => {
    expect(orderedIdsFromLoadedLedger(P, returnTo, loaded)).toEqual(serverOrder(returnTo));
  });

  test('필터·정렬 유지된 상태에서 다음 세대 계산', () => {
    const ids = orderedIdsFromLoadedLedger(P, `${base}?grade=C`, loaded)!;
    expect(ids).toEqual(['u2', 'u4']);
    expect(resolveWorkspaceAdjacentIds(ids, 'u2')).toMatchObject({ previous: null, next: 'u4', currentFound: true });
  });

  test('다른 프로젝트 행이 섞이면 사용하지 않고 서버로 대체', () => {
    const mixed = { ...loaded, rows: [...rows, row('x1', '101', '203', 'A', '010-9999-0000', 'other')] };
    expect(orderedIdsFromLoadedLedger(P, base, mixed)).toBeNull();
  });

  test('받은 원장이 없거나 비어 있으면 서버로 대체', () => {
    expect(orderedIdsFromLoadedLedger(P, base, null)).toBeNull();
    expect(orderedIdsFromLoadedLedger(P, base, { rows: [], snapshotAsOf: loaded.snapshotAsOf })).toBeNull();
  });

  test('잘못된 returnTo(외부 URL)는 계산하지 않고 서버로 대체(서버는 400)', () => {
    expect(parseWorkspaceContext(P, 'https://evil.example/x').valid).toBe(false);
    expect(orderedIdsFromLoadedLedger(P, 'https://evil.example/x', loaded)).toBeNull();
  });
});
