import { describe, expect, test, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { classifyContactOutcome } from '@/lib/move-in/contact-outcome';
import { toLedgerSummaryRow } from '@/lib/move-in/current-unit-snapshot';
import { QUICK_LEDGER_FILTER_ROWS } from '@/lib/move-in/ledger-presentation';
import { applyLedgerQuery, parseLedgerQuery, patchLedgerQuery } from '@/lib/move-in/ledger-filters';
import type { ContactRecord } from '@/lib/move-in/ledger-types';

describe('접촉상태 판정: 최신 상담 1건의 최종 결과', () => {
  // 작업지시서 예시 + 부재로 묶어야 하는 표현(합성 문구, 실데이터 아님)
  test.each([
    ['통화 완료 후 잔금상담, 추후 문자발송', 'CONTACTED'],
    ['잔금대출 후 결정', 'CONTACTED'],
    ['문자발송', 'CONTACTED'],
    ['입주 설명 중 상담 거절', 'REFUSED'],
    ['통화 중 상담 거절', 'REFUSED'],
    ['부재중 문자발송', 'ABSENT'],
    ['결번, 번호 확인 필요', 'ABSENT'],
    ['여러 차례 전화했으나 미수신', 'ABSENT'],
    ['지속적 미수신', 'ABSENT'],
    ['반복 부재', 'ABSENT'],
    ['통화 안 됨', 'ABSENT'],
    ['연락불능', 'ABSENT'],
    ['번호 오류', 'ABSENT'],
    ['연락처 확인 필요', 'ABSENT'],
    ['부재 후 문자발송', 'ABSENT'],
    ['재통화 필요', 'ABSENT'],
    ['장기 미접촉', 'ABSENT'],
    ['전화 안 받음', 'ABSENT'],
    ['통화 완료, 잔금 상담함', 'CONTACTED'],
    ['통화했으나 상담 거절', 'REFUSED'],
    ['상담 중 더 이상 연락하지 말라고 함', 'REFUSED'],
    ['이전에는 통화했지만 오늘 부재', 'ABSENT'],
    ['이전에는 부재였지만 오늘 정상 통화', 'CONTACTED'],
    ['미수신 후 문자', 'ABSENT'],
  ] as const)('%s → %s', (content, expected) => {
    expect(classifyContactOutcome('C', content)).toBe(expected);
  });
  test('대출 관련 "거절"·"안 받음"은 상담거절/부재로 오판하지 않음', () => {
    expect(classifyContactOutcome('C', '잔금대출 거절되어 재신청 예정')).toBe('CONTACTED');
    expect(classifyContactOutcome('C', '대출 안 받고 자납 예정')).toBe('CONTACTED');
  });
  test('저장 시 고른 결과 태그(부재·상담거절)는 그 상담의 최종 결과로 본다', () => {
    expect(classifyContactOutcome('부재', '')).toBe('ABSENT');
    expect(classifyContactOutcome('상담거절', null)).toBe('REFUSED');
    expect(classifyContactOutcome('부재', '통화 완료 고객이었으나 오늘은 연결 안 됨')).toBe('ABSENT');
  });
});

describe('빠른필터 부재: 등급과 독립된 접촉상태 축, 다른 빠른필터와 AND', () => {
  const P = '00000000-0000-4000-8000-000000000001', CUR = '10000000-0000-4000-8000-000000000001';
  let seq = 0;
  type Consult = { at: string; tag?: string; content?: string };
  const row = (grade: string, consults: Consult[], opts: { funding?: string; intent?: string } = {}) => {
    const unitId = `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;
    const snapshot = { projectId: P, unitId, currentContractId: 'c', currentCustomerId: CUR, currentGrade: grade, funding: opts.funding ?? 'NORMAL',
      specialReasons: [], effectiveIntent: opts.intent ?? 'UNDECIDED', rentalType: null } as never;
    const unit = { project_id: P, unit_id: unitId, building_no: '101', unit_no: String(1000 + seq), unit_type: null,
      contracts: [{ project_id: P, unit_id: unitId, contract_id: 'c', customer_id: CUR, contract_status: 'ACTIVE', updated_at: '2026-10-01T00:00:00Z',
        holder: { id: CUR, project_id: P, name: null, phone: null, phone_quality: null, assigned_counselor_id: null } }],
      occupancy: { project_id: P, unit_id: unitId, contract_id: 'c', legacy_grade: grade, last_contact_at: null, next_contact_at: null } } as never;
    const contacts: ContactRecord[] = consults.map((c, i) => ({ project_id: P, unit_id: unitId, customer_id: CUR, id: `k-${seq}-${i}`,
      consulted_at: c.at, next_action_at: null, structured_tags: c.tag ? { legacy_grade: c.tag } : {}, content: c.content ?? '' }));
    return toLedgerSummaryRow(unit, snapshot, null, contacts);
  };
  const D1 = '2026-09-01T01:00:00Z', D2 = '2026-10-01T01:00:00Z';
  const rows = [
    row('C', [{ at: D1, tag: 'C', content: '통화 완료' }, { at: D2, tag: '부재' }]),          // 과거 통화, 최신 부재 → 부재
    row('C', [{ at: D2, tag: 'C', content: '결번, 번호 확인 필요' }], { funding: 'LOAN_NEEDED' }),
    row('C', [{ at: D2, content: '지속적 미수신' }], { intent: 'SALE_TRANSFER' }),
    row('C', [{ at: D1, tag: '부재' }, { at: D2, tag: 'C', content: '오늘 정상 통화, 잔금 상담함' }]), // 과거 부재, 최신 정상 → 제외
    row('C', [{ at: D2, tag: '상담거절', content: '통화했음' }]),                              // 상담거절 → 제외
    row('C', [{ at: D2, tag: 'C', content: '잔금대출 후 결정' }], { funding: 'LOAN_NEEDED' }),
    row('D', [{ at: D2, content: '부재중 문자발송' }]),
    row('D', [{ at: D2, tag: 'D', content: '통화 완료 후 문자발송' }]),
    row('B', [{ at: D2, content: '연락불능' }], { intent: 'SALE_TRANSFER' }),
  ];
  const now = new Date('2026-10-12T00:00:00Z');
  const quick = (label: string) => QUICK_LEDGER_FILTER_ROWS.flat().find(p => p.label === label)!.patch;
  const press = (...labels: string[]) => {
    const params = labels.reduce((acc, label) => patchLedgerQuery(acc, quick(label)), new URLSearchParams());
    return applyLedgerQuery(rows, parseLedgerQuery(params), now).filteredSorted.map(r => r.unitNo);
  };
  const units = (...idx: number[]) => idx.map(i => rows[i].unitNo);

  test('배치: 1줄 C·D·부재…, 2줄 특별관리·오늘재콜·미확정', () => {
    expect(QUICK_LEDGER_FILTER_ROWS.map(r => r.map(p => p.label))).toEqual([
      ['C', 'D', '부재', '대출필요', '대출한도부족', '매매', '전세/월세'], ['특별관리', '오늘재콜', '미확정']]);
  });
  test('C만 / D만 / 부재만', () => {
    expect(press('C')).toEqual(units(0, 1, 2, 3, 4, 5));
    expect(press('D')).toEqual(units(6, 7));
    expect(press('부재')).toEqual(units(0, 1, 2, 6, 8));
  });
  test('C + 부재, D + 부재 (누르는 순서 무관)', () => {
    expect(press('C', '부재')).toEqual(units(0, 1, 2));
    expect(press('부재', 'C')).toEqual(units(0, 1, 2));
    expect(press('D', '부재')).toEqual(units(6));
  });
  test('부재 + 대출필요 / 매매 / 미확정', () => {
    expect(press('부재', '대출필요')).toEqual(units(1));
    expect(press('부재', '매매')).toEqual(units(2, 8));
    expect(press('부재', '미확정')).toEqual(units(0, 1, 6));
    expect(press('C', '부재', '매매')).toEqual(units(2));
  });
  test('최신 부재 포함, 과거 부재·최신 정상통화 제외, 상담거절 제외', () => {
    const absent = press('부재');
    expect(absent).toContain(rows[0].unitNo);
    expect(absent).not.toContain(rows[3].unitNo);
    expect(absent).not.toContain(rows[4].unitNo);
    expect(rows[4].contactStatus).toBe('REFUSED');
  });
  test('등급값 변경 없음, 필터 없으면 전체 행 그대로', () => {
    expect(rows.map(r => r.currentGrade)).toEqual(['C', 'C', 'C', 'C', 'C', 'C', 'D', 'D', 'B']);
    expect(press()).toHaveLength(rows.length);
  });
});
