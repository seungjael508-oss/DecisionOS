import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PaymentSummaryCard } from '@/components/move-in/payment-summary-card';
import type { RegisteredPaymentProjection } from '@/lib/move-in/payment-projection.server';

const projection = Object.freeze({ salePrice: 1000, totalPrincipalPaid: 650, paymentRate: 65,
  balanceScheduled: 350, finalBalanceScheduled: 200, totalLateFee: 10,
  installments: [{ installmentType: '잔금', scheduledAmount: 200, principalPaid: 0,
    actualCashReceived: 640, lateFee: 10, discountAmount: 0, status: 'PARTIAL' }],
  asOfDate: '2026-11-06',
}) as unknown as RegisteredPaymentProjection;
function render(status: 'BALANCE_PAID' | 'PLANNED' | 'MOVED_IN', data: RegisteredPaymentProjection | null = projection, paidAt: string | null = '2026-11-05T00:00:00Z') {
  return renderToStaticMarkup(createElement(PaymentSummaryCard, {
    occupancy: { move_in_status: status, balance_paid_at: paidAt }, projection: data,
  }));
}
function metric(markup: string, label: string) {
  return markup.match(new RegExp(`<dt[^>]*>${label}</dt><dd[^>]*>([^<]*)</dd>`))?.[1];
}
describe('완납 세대 화면 금액', () => {
  it('운영 금액만 0으로 표시하고 회계 원본과 불일치 안내를 유지한다', () => {
    const before = JSON.stringify(projection);
    const markup = render('BALANCE_PAID');
    expect(metric(markup, '운영상 미납금')).toBe('0원');
    expect(metric(markup, '잔금 예정액')).toBe('0원');
    expect(metric(markup, '자료상 미수금')).toBe('350원');
    expect(metric(markup, '회계상 납부원금')).toBe('650원');
    expect(metric(markup, '회계상 납부율')).toBe('65.0%');
    expect(metric(markup, '실제 수납액 \\(납부자료 기준\\)')).toBe('640원');
    expect(markup).toContain('회계자료 대조 필요');
    expect(JSON.stringify(projection)).toBe(before);
  });
  it('완납 해제로 완납일이 지워지면 기존 회계 계산값으로 돌아간다', () => {
    render('BALANCE_PAID');
    const markup = render('PLANNED', projection, null);
    expect(metric(markup, '운영상 미납금')).toBe('350원');
    expect(metric(markup, '잔금 예정액')).toBe('200원');
    expect(markup).not.toContain('회계자료 대조 필요');
  });
  it('회계상으로도 완납이면 불일치 안내가 없다', () => {
    const markup = render('BALANCE_PAID', { ...projection, balanceScheduled: 0, finalBalanceScheduled: 0 });
    expect(metric(markup, '운영상 미납금')).toBe('0원');
    expect(markup).not.toContain('회계자료 대조 필요');
  });
  it('회계자료가 없어도 운영상 완납 금액은 0이고 원본은 미확인이다', () => {
    const markup = render('BALANCE_PAID', null);
    expect(metric(markup, '운영상 미납금')).toBe('0원');
    expect(metric(markup, '잔금 예정액')).toBe('0원');
    expect(markup).toContain('납부자료 미확인');
    expect(metric(render('PLANNED', null, null), '잔금 예정액')).toBe('납부정보 미등록');
  });
  it('입주완료 후에도 완납일이 있으면 운영 금액 0과 회계상 미수금을 각각 유지한다', () => {
    const markup=render('MOVED_IN');
    expect(metric(markup,'운영상 미납금')).toBe('0원');
    expect(metric(markup,'잔금 예정액')).toBe('0원');
    expect(metric(markup,'자료상 미수금')).toBe('350원');
    expect(metric(markup,'회계상 납부원금')).toBe('650원');
    expect(markup).toContain('회계자료 대조 필요');
  });
  it('입주완료만으로 완납 처리하거나 운영상 미납금을 0으로 만들지 않는다', () => {
    const markup=render('MOVED_IN',projection,null);
    expect(markup).toContain('직원 확정 완납: 미확정');
    expect(metric(markup,'운영상 미납금')).toBe('350원');
    expect(metric(markup,'잔금 예정액')).toBe('200원');
  });
});
