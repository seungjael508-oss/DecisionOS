import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { OccupancyStatusCards } from '@/components/move-in/occupancy-status-cards';
import { LedgerCardList } from '@/components/move-in/ledger-card-list';
import { LedgerTable } from '@/components/move-in/ledger-table';
import { isBalancePaid } from '@/lib/move-in/ledger-presentation';
import { computeMoveInKpis } from '@/lib/move-in/kpis';
import type { OccupancyRecord } from '@/lib/move-in/queries';
import type { LedgerClientRow } from '@/lib/move-in/ledger-types';

describe('완납과 실제 입주 날짜의 독립성', () => {
  it.each([[false,false],[true,false],[false,true],[true,true]])('완납 %s / 실제 입주 %s를 원장과 상세에 별도로 표시', (paid, moved) => {
    const date = '2026-11-05T00:00:00Z';
    const occupancy = { occupancy_intent:'UNDECIDED',funding_status:'NORMAL',move_in_status:moved?'MOVED_IN':paid?'BALANCE_PAID':'CONTACTED',balance_paid_at:paid?date:null,actual_move_in_date:moved?date:null } as OccupancyRecord;
    const row = { unitId:'test',buildingNo:'101',unitNo:'101',currentGrade:null,customerName:'테스트',phone:null,effectiveIntent:'UNDECIDED',rentalType:null,funding:'NORMAL',moveIn:occupancy.move_in_status,balancePaidAt:occupancy.balance_paid_at,actualMoveInDate:occupancy.actual_move_in_date,dealTypes:[],contactStatus:'NONE',lastAttempt:null,lastContact:null,assigneeId:null,specialReasons:[],dGradeReasons:[] } as unknown as LedgerClientRow;
    const outputs = [renderToStaticMarkup(createElement(OccupancyStatusCards,{occupancy})),renderToStaticMarkup(createElement(LedgerTable,{rows:[row],assignees:{}})),renderToStaticMarkup(createElement(LedgerCardList,{rows:[row],assignees:{}}))];
    for (const html of outputs) {
      expect(html).toContain(paid?'잔금완납: 완납':'잔금완납: 미완납');
      expect(html).toContain(moved?'실제 입주: 입주완료':'실제 입주: 미입주');
    }
    const kpis=computeMoveInKpis(1,[{occupancyIntent:'UNDECIDED',fundingStatus:'NORMAL',moveInStatus:occupancy.move_in_status,balancePaidAt:occupancy.balance_paid_at,actualMoveInDate:occupancy.actual_move_in_date}]);
    expect(kpis.balancePaid).toBe(Number(paid)); expect(kpis.movedIn).toBe(Number(moved));
  });
  it('상태 코드나 회계상 PAID만으로 직원 확정 완납으로 처리하지 않는다', () => {
    expect(isBalancePaid({moveIn:'BALANCE_PAID',balancePaidAt:null})).toBe(false);
    expect(isBalancePaid({moveIn:'MOVED_IN',balancePaidAt:null,finance:{status:'PAID'}} as never)).toBe(false);
  });
});
