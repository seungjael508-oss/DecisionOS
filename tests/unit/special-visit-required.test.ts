import { describe, expect, test } from 'vitest';
import { resolveCurrentUnitSnapshot } from '@/lib/move-in/current-unit-snapshot';
import { deriveSpecialManagementReasons } from '@/lib/move-in/intent';
import { applyLedgerQuery, parseLedgerQuery, type LedgerFilterRow } from '@/lib/move-in/ledger-filters';
import { ledgerOptions } from '@/lib/move-in/ledger-presentation';
import type { AuthorizedAccess, CurrentUnitRecord, SpecialRecord } from '@/lib/move-in/ledger-types';
import type { LedgerClientRow } from '@/lib/move-in/ledger-types';

const P = '1283e198-5043-4027-96d6-edcc7a6686c6';
const now = new Date('2026-10-20T03:00:00Z');
const access = (role: 'PROJECT_ADMIN' | 'COUNSELOR', memberId = 'm-1') =>
  ({ ok: true, projectId: P, userId: 'u-1', memberId, role }) as unknown as AuthorizedAccess;
function unit(contractId: string, grade = 'A'): CurrentUnitRecord {
  return {
    project_id: P, unit_id: 'unit-1', building_no: '101', unit_no: '101', unit_type: null,
    contracts: [{ project_id: P, unit_id: 'unit-1', contract_id: contractId, customer_id: 'cust-1', contract_status: 'ACTIVE', updated_at: '2026-10-01T00:00:00Z',
      holder: { id: 'cust-1', project_id: P, name: 'n', phone: null, phone_quality: null, assigned_counselor_id: 'm-1' } }],
    occupancy: { project_id: P, unit_id: 'unit-1', contract_id: contractId, legacy_grade: grade, occupancy_intent: 'SELF_MOVE_IN', operational_intent: 'MOVE_IN',
      funding_status: 'NORMAL', move_in_status: 'CONTACTED', last_contact_at: null, next_contact_at: null, balance_paid_at: null,
      planned_move_in_date: null, actual_move_in_date: null, updated_at: '2026-10-01T00:00:00Z' },
  };
}
const special = (contractId: string, visit: boolean, manual = true): SpecialRecord =>
  ({ project_id: P, unit_id: 'unit-1', contract_id: contractId, manually_flagged: manual, visit_required: visit, updated_at: '2026-10-02T00:00:00Z' });
const reasonsOf = (u: CurrentUnitRecord, s: SpecialRecord | null, role: 'PROJECT_ADMIN' | 'COUNSELOR' = 'PROJECT_ADMIN', memberId = 'm-1') => {
  const r = resolveCurrentUnitSnapshot({ unit: u, access: access(role, memberId), special: s, sourceTags: [], now });
  return r.kind === 'ok' ? r.snapshot.specialReasons : null;
};

describe('특별관리 방문 필요 판정', () => {
  test('visit_required = true → 방문 필요(등급 무관, A등급도)', () => {
    expect(reasonsOf(unit('k-1', 'A'), special('k-1', true))).toEqual(['MANUAL', 'VISIT_REQUIRED']);
  });
  test('해제하면 제외, 수동 지정은 유지', () => {
    expect(reasonsOf(unit('k-1'), special('k-1', false))).toEqual(['MANUAL']);
  });
  test('현재 ACTIVE 계약 기록만: 이전 계약자의 방문 필요는 승계하지 않음', () => {
    expect(reasonsOf(unit('k-new'), special('k-old', true))).toEqual([]);
  });
  test('상담사는 기존처럼 본인 배정 세대의 특별관리 기록만 반영', () => {
    expect(reasonsOf(unit('k-1'), special('k-1', true), 'COUNSELOR', 'm-1')).toContain('VISIT_REQUIRED');
    expect(reasonsOf(unit('k-1'), special('k-1', true), 'COUNSELOR', 'm-2')).toEqual([]);
  });
  test('D등급과 방문 필요 동시', () => {
    expect(deriveSpecialManagementReasons({ effectiveIntent: 'MOVE_IN', legacyGrade: 'D', visitRequired: true })).toEqual(['GRADE_D', 'VISIT_REQUIRED']);
  });
});

describe('특별관리 필터(원장·오늘 관리 공통)', () => {
  const row = (unitId: string, grade: string, reasons: string[]): LedgerFilterRow => ({
    unitId, buildingNo: '101', unitNo: unitId, currentGrade: grade, customerName: null, phone: null, assigneeId: null,
    effectiveIntent: 'MOVE_IN', rentalType: null, funding: null, moveIn: null, nextContact: null,
    specialReasons: reasons, specialPriority: reasons.length ? 4 : null, dealTypes: [], payment: null, balance: null, views: [],
  });
  const rows = [row('1', 'A', ['MANUAL', 'VISIT_REQUIRED']), row('2', 'C', ['MANUAL']), row('3', 'D', ['GRADE_D', 'VISIT_REQUIRED']), row('4', 'B', ['ASEL'])];
  const ids = (q: string) => applyLedgerQuery(rows, parseLedgerQuery(new URLSearchParams(q)), now).filteredSorted.map(r => r.unitId);
  test('방문 필요 선택 → 지정 세대만(모든 등급)', () => expect(ids('specialReason=VISIT_REQUIRED')).toEqual(['1', '3']));
  test('기존 필터와 AND', () => expect(ids('specialReason=VISIT_REQUIRED&grade=D')).toEqual(['3']));
  test('수동 지정·D등급·아셀 기존 항목 유지', () => {
    expect(ids('specialReason=MANUAL')).toEqual(['1', '2']);
    expect(ids('specialReason=GRADE_D')).toEqual(['3']);
    expect(ids('specialReason=ASEL')).toEqual(['4']);
  });
  test('선택지에 방문 필요 고정 표시', () => {
    expect(ledgerOptions([] as LedgerClientRow[], 'specialReason', {}).map(o => o.label)).toContain('방문 필요');
  });
});
