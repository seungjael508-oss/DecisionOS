import { describe, expect, test, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { resolveContactState, toLedgerSummaryRow } from '@/lib/move-in/current-unit-snapshot';
import { LEDGER_COLUMNS, ledgerCells, ledgerOptions } from '@/lib/move-in/ledger-presentation';
import { applyLedgerQuery, parseLedgerQuery } from '@/lib/move-in/ledger-filters';
import { formatDateTime } from '@/lib/move-in/labels';
import type { ContactRecord } from '@/lib/move-in/ledger-types';

const P = '00000000-0000-4000-8000-000000000001', U = '00000000-0000-4000-8000-000000000002';
const CUR = '10000000-0000-4000-8000-000000000001', PREV = '10000000-0000-4000-8000-000000000009';
const snapshot = { projectId: P, unitId: U, currentContractId: 'c', currentCustomerId: CUR, currentGrade: 'C', specialReasons: [], effectiveIntent: 'UNDECIDED', rentalType: null } as never;
let seq = 0;
const rec = (at: string, grade?: string, customer = CUR): ContactRecord =>
  ({ project_id: P, unit_id: U, customer_id: customer, id: `id-${String(++seq).padStart(4, '0')}`, consulted_at: at, next_action_at: null, structured_tags: grade ? { legacy_grade: grade } : {} });
const unit = (grade: string | null, last: string | null) => ({ project_id: P, unit_id: U, building_no: '101', unit_no: '1001', unit_type: null,
  contracts: [{ project_id: P, unit_id: U, contract_id: 'c', customer_id: CUR, contract_status: 'ACTIVE', updated_at: '2026-10-01T00:00:00Z',
    holder: { id: CUR, project_id: P, name: null, phone: null, phone_quality: null, assigned_counselor_id: null } }],
  occupancy: { project_id: P, unit_id: U, contract_id: 'c', legacy_grade: grade, last_contact_at: last, next_contact_at: null } }) as never;
const cell = (cells: string[], name: string) => cells[LEDGER_COLUMNS.indexOf(name as never)];

describe('접촉상태·최종접촉·최근시도', () => {
  // 운영 최신 부재 17세대의 두 유형을 합성 데이터로 재현(실데이터는 저장소에 넣지 않음)
  test.each(Array.from({ length: 8 }, (_, i) => i))('이전 실제 접촉 있음 유형 #%i: 최신이 부재면 상태=부재, 최종접촉=부재 시도일', i => {
    const real = `2026-09-0${i + 1}T01:00:00.000Z`, absent = `2026-09-2${i}T02:00:00.000Z`;
    // 구 RPC가 last_contact_at을 부재 시각으로 덮어쓴 상태도 함께 재현
    const contacts = [rec(real, 'C'), rec(absent, '부재')];
    const state = resolveContactState(snapshot, contacts, absent, 'C');
    expect(state).toMatchObject({ contactStatus: 'ABSENT', lastContact: absent, lastAttempt: absent });
  });
  test.each(Array.from({ length: 9 }, (_, i) => i))('부재만 있음 유형 #%i: 최종접촉=마지막 부재 시도일, 상태=부재', i => {
    const a1 = `2026-08-1${i}T01:00:00.000Z`, a2 = `2026-09-0${i + 1}T01:00:00.000Z`;
    const state = resolveContactState(snapshot, [rec(a1, '부재'), rec(a2, '부재')], a2, '부재');
    expect(state).toMatchObject({ contactStatus: 'ABSENT', lastContact: a2, lastAttempt: a2 });
  });
  test('상담거절은 접촉상태를 따로 두고, 최종접촉일은 그 상담 시각', () => {
    expect(resolveContactState(snapshot, [rec('2026-09-01T00:00:00Z', '상담거절')], null, '상담거절'))
      .toMatchObject({ contactStatus: 'REFUSED', lastContact: '2026-09-01T00:00:00Z' });
  });
  test('이력 없음: 미접촉, 기존 부재 등급만 있으면 부재', () => {
    expect(resolveContactState(snapshot, [], null, 'A')).toMatchObject({ contactStatus: 'NONE', lastContact: null, lastAttempt: null });
    expect(resolveContactState(snapshot, [], null, '부재').contactStatus).toBe('ABSENT');
    expect(resolveContactState(snapshot, [], null, '상담거절').contactStatus).toBe('REFUSED');
  });
  test('이전 부재 → 최신 정상 통화면 접촉완료', () => {
    const state = resolveContactState(snapshot, [rec('2026-09-01T00:00:00Z', '부재'), { ...rec('2026-09-10T00:00:00Z', 'C'), content: '잔금 상담함' }], null, 'C');
    expect(state).toMatchObject({ contactStatus: 'CONTACTED', lastContact: '2026-09-10T00:00:00Z' });
  });
  test('C 태그여도 최신 상담내용이 부재성이면 부재, 실제 통화 완료면 접촉완료', () => {
    const withContent = (content: string) => ({ ...rec('2026-09-10T00:00:00Z', 'C'), content });
    expect(resolveContactState(snapshot, [withContent('결번, 번호 확인 필요')], null, 'C').contactStatus).toBe('ABSENT');
    expect(resolveContactState(snapshot, [withContent('통화 완료 후 잔금상담, 추후 문자발송')], null, 'C').contactStatus).toBe('CONTACTED');
  });
  test('수기 입력된 실제 접촉일(부재 시각과 다름)은 유지', () => {
    expect(resolveContactState(snapshot, [], '2026-09-05T00:00:00Z', 'B')).toMatchObject({ contactStatus: 'CONTACTED', lastContact: '2026-09-05T00:00:00Z' });
  });
  test('이전 계약자 상담은 접촉상태·날짜에 섞이지 않음', () => {
    const state = resolveContactState(snapshot, [rec('2026-10-05T00:00:00Z', 'A', PREV), rec('2026-09-01T00:00:00Z', '부재')], null, null);
    expect(state).toMatchObject({ contactStatus: 'ABSENT', lastContact: '2026-09-01T00:00:00Z', lastAttempt: '2026-09-01T00:00:00Z' });
  });
});

describe('원장 화면·필터·출력 동일 기준', () => {
  const absentRow = toLedgerSummaryRow(unit('C', '2026-09-20T02:00:00.000Z'), snapshot, null,
    [rec('2026-09-01T01:00:00.000Z', 'C'), rec('2026-09-20T02:00:00.000Z', '부재')]);
  const legacyAbsentRow = toLedgerSummaryRow(unit('부재', null), { ...(snapshot as object), currentGrade: '부재' } as never, null, []);
  test('셀: 등급은 C 유지, 접촉상태 부재, 최종접촉=최신 부재 시도일', () => {
    const cells = ledgerCells(absentRow, {});
    expect(cell(cells, '현재등급')).toBe('C');
    expect(cell(cells, '접촉상태')).toBe('부재');
    expect(cell(cells, '최종접촉')).toBe(formatDateTime('2026-09-20T02:00:00.000Z'));
    expect(cell(cells, '최근시도')).toBe(formatDateTime('2026-09-20T02:00:00.000Z'));
  });
  test('기존 부재 등급값은 A~D로 바꾸지 않고 확인필요로 표시', () => {
    expect(legacyAbsentRow.currentGrade).toBe('부재');
    expect(cell(ledgerCells(legacyAbsentRow, {}), '현재등급')).toBe('확인필요 (기존 부재)');
  });
  test('접촉상태 필터: 접촉완료/부재/상담거절/미접촉', () => {
    const rows = [absentRow, legacyAbsentRow];
    expect(ledgerOptions(rows, 'contactStatus', {}).map(o => o.label)).toEqual(['접촉완료', '부재', '상담거절', '미접촉']);
    const r = applyLedgerQuery(rows, parseLedgerQuery(new URLSearchParams('contactStatus=ABSENT')), new Date('2026-10-09T00:00:00Z'));
    expect(r.total).toBe(2);
    expect(applyLedgerQuery(rows, parseLedgerQuery(new URLSearchParams('contactStatus=NONE')), new Date('2026-10-09T00:00:00Z')).total).toBe(0);
  });
});
