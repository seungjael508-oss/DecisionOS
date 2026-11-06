import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/server', () => ({ createServerClient: vi.fn() }));
import { aggregatePaymentRows, paymentInstallmentStatus, paymentForCurrentContract, type PaymentSourceRow } from '@/lib/move-in/payment-projection.server';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PaymentSummaryCard } from '@/components/move-in/payment-summary-card';
import { PAYMENT_SOURCE_PROJECTIONS } from '../fixtures/payment-source-empty';
import { PAYMENT_PROJECTION_IDENTITIES } from '@/lib/move-in/payment-projection-identity.server';

const row = (overrides: Partial<PaymentSourceRow> = {}): PaymentSourceRow => ({ installmentType: '잔금', dueDate: '2026-11-05', scheduledAmount: 100, principalPaid: 0, paymentDate: null, actualCashReceived: 0, lateFee: 0, discountAmount: 0, additionalScheduled: 0, additionalPaid: 0, additionalPrincipal: 0, additionalLateFee: 0, excessAmount: 0, refundAmount: 0, unrefundedAmount: 0, ...overrides });
afterEach(() => { for (const key of Object.keys(PAYMENT_SOURCE_PROJECTIONS)) delete PAYMENT_SOURCE_PROJECTIONS[key]; });
describe('금액 계산 정상·경계·오류 (합성 자료)', () => {
  it('회귀: 직원 확정과 회계상 65%를 분리하고 미수금을 보존', () => {
    const aggregate = aggregatePaymentRows({ salePrice: 475900000, rows: [row({ scheduledAmount: 475900000, principalPaid: 309335000 })] });
    const projection = { ...aggregate, projectId: 'test', unitId: 'test', contractId: 'test', sourceSha256: 'test', asOfDate: '2026-11-05', totalLateFee: 0, installments: aggregate.installments.map(r => ({ ...r, status: 'PARTIAL' as const })) };
    const markup = renderToStaticMarkup(createElement(PaymentSummaryCard, { occupancy: { move_in_status: 'BALANCE_PAID', balance_paid_at: '2026-11-05T00:00:00Z' } as never, projection }));
    expect(markup).toContain('65.0%'); expect(markup).toContain('166,565,000원');
    expect(markup).toContain('직원 확정 완납'); expect(markup).toContain('회계상 납부율');
    expect(markup).toContain('자료상 미수금 확인 필요'); expect(markup).toContain('실제 수납액');
  });
  it('65% 부분 납부 예제의 원금·미납·잔금 계산', () => {
    expect(aggregatePaymentRows({ salePrice: 475900000, rows: [row({ scheduledAmount: 475900000, principalPaid: 309335000 })] })).toMatchObject({ totalPrincipalPaid: 309335000, balanceScheduled: 166565000, finalBalanceScheduled: 166565000, paymentRate: 65 });
  });
  it('실제 원금 전액이면 100%, 미납 0', () => {
    expect(aggregatePaymentRows({ salePrice: 100, rows: [row({ principalPaid: 100 })] })).toMatchObject({ paymentRate: 100, balanceScheduled: 0, finalBalanceScheduled: 0 });
  });
  it('분양금액 0과 빈 내역에서 NaN/Infinity를 만들지 않음', () => {
    expect(aggregatePaymentRows({ salePrice: 0, rows: [] })).toMatchObject({ paymentRate: 0, balanceScheduled: 0, finalBalanceScheduled: null });
  });
  it.each([-1, NaN, Infinity])('잘못된 숫자 %s는 기존 집계에서 0으로 정규화', value => {
    const result = aggregatePaymentRows({ salePrice: 100, rows: [row({ principalPaid: value })] });
    expect(result.totalPrincipalPaid).toBe(0); expect(result.balanceScheduled).toBe(100); expect(result.paymentRate).toBe(0);
  });
  it('초과 납부는 미납 음수가 되지 않지만 현 계산은 100%를 초과할 수 있음', () => {
    expect(aggregatePaymentRows({ salePrice: 100, rows: [row({ principalPaid: 101 })] })).toMatchObject({ balanceScheduled: 0, finalBalanceScheduled: 0, paymentRate: 101 });
  });
  it('잔금 행이 없으면 잔금 예정액은 미확인', () => {
    expect(aggregatePaymentRows({ salePrice: 100, rows: [row({ installmentType: '계약1' })] }).finalBalanceScheduled).toBeNull();
  });
  it('분할 입금 합산과 연체료·실입금의 원금 분리', () => {
    const result = aggregatePaymentRows({ salePrice: 100, rows: [row({ principalPaid: 40, actualCashReceived: 80, lateFee: 40 }), row({ scheduledAmount: 0, principalPaid: 60 })] });
    expect(result).toMatchObject({ totalPrincipalPaid: 100, paymentRate: 100, balanceScheduled: 0 });
    expect(result.finalBalanceScheduled).toBe(0);
  });
  it.each([[40,60], [100,0], [120,0]])('같은 차수·약정일 분할 입금 %s → 잔액 %s', (paid, expected) => {
    expect(aggregatePaymentRows({ salePrice: 100, rows: [row({ principalPaid: 10 }), row({ scheduledAmount: 0, principalPaid: paid - 10 })] }).finalBalanceScheduled).toBe(expected);
  });
  it('다른 약정일의 초과 입금으로 미납 약정을 상계하지 않음', () => {
    expect(aggregatePaymentRows({ salePrice: 200, rows: [row({ principalPaid: 150 }), row({ dueDate: '2026-12-05', principalPaid: 0 })] }).finalBalanceScheduled).toBe(100);
  });
  it('정확히 중복된 행은 조용히 이중 집계하지 않고 검토 대상으로 거절', () => {
    const receipt = row({ paymentDate: '2026-11-05', principalPaid: 50 });
    expect(() => aggregatePaymentRows({ salePrice: 100, rows: [receipt, { ...receipt }] })).toThrow('duplicate payment row');
  });
  it('같은 약정이 입금 행마다 반복 기재되면 약정금액을 이중 집계하지 않음', () => {
    expect(() => aggregatePaymentRows({ salePrice: 100, rows: [row({ principalPaid: 40 }), row({ paymentDate: '2026-11-05', principalPaid: 60 })] })).toThrow('duplicate payment obligation');
  });
  it('같은 약정일이라도 다른 차수 입금은 잔금에서 차감하지 않음', () => {
    expect(aggregatePaymentRows({ salePrice: 200, rows: [row({ installmentType: '계약1', principalPaid: 150 }), row()] }).finalBalanceScheduled).toBe(100);
  });
  it('납기 당일 미납은 UPCOMING, 다음 날 OVERDUE, 전액이면 PAID', () => {
    expect(paymentInstallmentStatus({ ...row(), now: '2026-11-05' })).toBe('UPCOMING');
    expect(paymentInstallmentStatus({ ...row(), now: '2026-11-06' })).toBe('OVERDUE');
    expect(paymentInstallmentStatus({ ...row({ principalPaid: 100 }), now: '2026-11-06' })).toBe('PAID');
  });
  it('원본 없는 세대는 0원으로 간주하지 않고 null', () => {
    expect(paymentForCurrentContract({ projectId: '1283e198-5043-4027-96d6-edcc7a6686c6', unitId: 'missing', contractId: 'missing', buildingNo: '104', unitNo: '2303' })).toBeNull();
  });
  it('원본과 영수증을 바꾸지 않으며 실제 수납액을 원금과 구분', () => {
    const receipt = row({ principalPaid: 70, actualCashReceived: 80, lateFee: 10 });
    const before = structuredClone(receipt);
    const result = aggregatePaymentRows({ salePrice: 100, rows: [receipt] });
    expect(receipt).toEqual(before); expect(result.installments).toEqual([before]);
    expect(result.totalPrincipalPaid).toBe(70); expect(result.balanceScheduled).toBe(30);
  });
  it('현재 계약 결속 불일치 시 이전 계약 수납자료를 반환하지 않음', () => {
    const binding = PAYMENT_PROJECTION_IDENTITIES['101-1001'];
    PAYMENT_SOURCE_PROJECTIONS['101-1001'] = { buildingNo: '101', unitNo: '1001', salePrice: 100, sourceSha256: 'synthetic-test-only', rows: [row({ principalPaid: 100 })] };
    expect(paymentForCurrentContract({ ...binding, buildingNo: '101', unitNo: '1001' })?.totalPrincipalPaid).toBe(100);
    expect(paymentForCurrentContract({ ...binding, contractId: 'other-contract', buildingNo: '101', unitNo: '1001' })).toBeNull();
    expect(paymentForCurrentContract({ ...binding, unitId: 'other-unit', buildingNo: '101', unitNo: '1001' })).toBeNull();
  });
  it('중복 의심 자료는 화면에 확정 금액 대신 미확인으로 반환', () => {
    const binding = PAYMENT_PROJECTION_IDENTITIES['101-1001'], receipt = row({ paymentDate: '2026-11-05', principalPaid: 50 });
    PAYMENT_SOURCE_PROJECTIONS['101-1001'] = { buildingNo: '101', unitNo: '1001', salePrice: 100, sourceSha256: 'synthetic-test-only', rows: [receipt, { ...receipt }] };
    expect(paymentForCurrentContract({ ...binding, buildingNo: '101', unitNo: '1001' })).toBeNull();
  });
  it('입주완료도 확정일이 있으면 직원 확정 상태 표시, 금액 자료 없으면 0원 아님', () => {
    const markup = renderToStaticMarkup(createElement(PaymentSummaryCard, { occupancy: { move_in_status: 'MOVED_IN', balance_paid_at: '2026-11-05T00:00:00Z' } }));
    expect(markup).toContain('직원 확정 완납: 확정'); expect(markup).toContain('회계상 납부율·미수금을 확인할 수 없습니다');
    expect(markup).not.toContain('100%');
  });
});
