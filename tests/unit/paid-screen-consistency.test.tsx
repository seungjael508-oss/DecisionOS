import { expect, test } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { countLedgerChapters } from '@/lib/move-in/ledger-chapters';
import { computeMoveInKpis } from '@/lib/move-in/kpis';
import { balanceByType } from '@/lib/worklog/balance-by-type';
import { FloorplanBoard } from '@/components/move-in/floorplan-board';
import type { FloorplanUnit } from '@/lib/move-in/floorplan';

test.each([150,159])('851 units use the same DB paid dates for KPI, green tiles and type totals (%s paid)',paidCount=>{
  const units=Array.from({length:851},(_,i)=>({unitId:`u${i}`,buildingNo:String(101+Math.floor(i/116)),unitNo:String((Math.floor(i%116/4)+1)*100+(i%4)+1),unitType:i%2?'84A':'74B'}));
  const occupancy=units.map((u,i)=>({unitId:u.unitId,balancePaidAt:i<paidCount?'2026-11-06T00:00:00Z':null,moveInStatus:'MOVED_IN' as const,actualMoveInDate:null,occupancyIntent:'UNDECIDED' as const,fundingStatus:'NORMAL' as const}));
  const tiles:FloorplanUnit[]=units.map((u,i)=>({...u,projectId:'p',floor:null,currentGrade:'D',funding:'NORMAL',moveIn:'MOVED_IN',effectiveIntent:'UNDECIDED',rentalType:null,specialReasons:[],balancePaidAt:occupancy[i].balancePaidAt,actualMoveInDate:null,revision:'r',fetchedAt:'2026-11-07'}));
  const chapters=countLedgerChapters(tiles);
  const kpis=computeMoveInKpis(units.length,occupancy);
  const types=balanceByType(units,occupancy);
  const html=renderToStaticMarkup(createElement(FloorplanBoard,{projectId:'p',units:tiles}));
  expect(chapters.balance_paid).toBe(paidCount);
  expect(kpis.balancePaid).toBe(paidCount);
  expect(types.total.totalUnits).toBe(851);
  expect(types.total.balancePaid).toBe(paidCount);
  expect(types.rows.reduce((sum,row)=>sum+row.balancePaid,0)).toBe(paidCount);
  expect((html.match(/data-balance-paid="true"/g)??[]).length).toBe(paidCount);
  expect((html.match(/href="\/projects\/p\/move-in\/units\//g)??[]).length).toBe(851);
});
