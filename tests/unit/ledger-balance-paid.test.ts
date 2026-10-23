import { expect, test } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { balancePaidRemainder, isBalancePaid } from '@/lib/move-in/ledger-presentation';
import { LedgerCardList } from '@/components/move-in/ledger-card-list';
import { LedgerTable } from '@/components/move-in/ledger-table';

const base = { unitId:'u1', buildingNo:'101', unitNo:'2401', currentGrade:'B', phone:'010-0000-0000', customerName:'테스트', effectiveIntent:'MOVE_IN', rentalType:null,
  funding:'NORMAL', moveIn:'PLANNED', balancePaidAt:null, dealTypes:[], contactStatus:'CONTACTED', lastAttempt:null, lastContact:null, assigneeId:null, specialReasons:[], dGradeReasons:[] };
const finance = (totalUnpaid: number | null) => ({ status:'PAID', salePrice:1, salePaid:1, saleBalance:0, balcony:null, option:null, totalUnpaid, partial:false, account:null, accountRestricted:true });

test('잔금완납 기준: 입주진행 잔금완납 또는 완납일 있음(평면도 태그와 같음)', () => {
  expect(isBalancePaid({ moveIn:'BALANCE_PAID', balancePaidAt:null })).toBe(true);
  expect(isBalancePaid({ moveIn:'MOVED_IN', balancePaidAt:'2026-10-20T15:00:00Z' })).toBe(true);
  expect(isBalancePaid({ moveIn:'PLANNED', balancePaidAt:null })).toBe(false);
});
test('잔여금액: 미납이 남았을 때만 표기', () => {
  expect(balancePaidRemainder({ finance: finance(22365000) } as never)).toBe('잔여 22,365,000원');
  expect(balancePaidRemainder({ finance: finance(0) } as never)).toBeNull();
  expect(balancePaidRemainder({ finance: finance(null) } as never)).toBeNull();
  expect(balancePaidRemainder({} as never)).toBeNull();
});
test('카드·표: 완납 세대만 연두색 강조와 배지', () => {
  const paid = { ...base, unitId:'p1', moveIn:'BALANCE_PAID', finance: finance(0) } as never;
  const open = { ...base, unitId:'o1' } as never;
  for (const markup of [renderToStaticMarkup(createElement(LedgerCardList, { rows:[paid, open], assignees:{} })), renderToStaticMarkup(createElement(LedgerTable, { rows:[paid, open], assignees:{} }))]) {
    expect(markup.match(/data-balance-paid="true"/g)?.length).toBe(1);
    expect(markup.match(/잔금완납<\/span>/g)?.length).toBe(1);
    expect(markup).toContain('border-l-green-500');
  }
});
test('이사예약: 예약완료 세대만 파란 배지와 예약일, 잔금완납과 함께 표시 가능', () => {
  const booked = { ...base, unitId:'b1', moveIn:'BALANCE_PAID', management:{ loanAgreement:'UNKNOWN', moveReservation:'BOOKED', movingDate:'2026-12-04', problemHousehold:'UNKNOWN', managementReasons:[] } } as never;
  const cancelled = { ...base, unitId:'c1', management:{ loanAgreement:'UNKNOWN', moveReservation:'CANCELLED', movingDate:null, problemHousehold:'UNKNOWN', managementReasons:[] } } as never;
  for (const markup of [renderToStaticMarkup(createElement(LedgerCardList, { rows:[booked, cancelled], assignees:{} })), renderToStaticMarkup(createElement(LedgerTable, { rows:[booked, cancelled], assignees:{} }))]) {
    expect(markup.match(/data-move-reserved="true"/g)?.length).toBe(1);
    expect(markup).toContain('이사예약 12.04');
    expect(markup).toContain('잔금완납');
  }
});
test('금액 자료상 완납도 잔금완납 강조, 배지는 동/호수 앞', () => {
  expect(isBalancePaid({ moveIn:'PLANNED', balancePaidAt:null, finance: finance(0) } as never)).toBe(true);
  expect(isBalancePaid({ moveIn:'PLANNED', balancePaidAt:null, finance: { ...finance(100), status:'PARTIAL' } } as never)).toBe(false);
  const row = { ...base, unitId:'f1', finance: finance(0) } as never;
  for (const markup of [renderToStaticMarkup(createElement(LedgerCardList, { rows:[row], assignees:{} })), renderToStaticMarkup(createElement(LedgerTable, { rows:[row], assignees:{} }))]) {
    expect(markup).toContain('data-balance-paid="true"');
    expect(markup.indexOf('잔금완납</span>')).toBeLessThan(markup.indexOf('>101동 2401호<'));
  }
});
