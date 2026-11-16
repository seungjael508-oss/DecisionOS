import { expect, test, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
vi.mock('server-only',()=>({}));
import { fieldConfirmedBalancePaid } from '@/lib/move-in/balance-confirmations';
import { countLedgerChapters } from '@/lib/move-in/ledger-chapters';
import { balanceByType } from '@/lib/worklog/balance-by-type';
import { computeMoveInKpis } from '@/lib/move-in/kpis';
import { FloorplanBoard } from '@/components/move-in/floorplan-board';
import { buildMoveInWorklogSnapshot } from '@/lib/worklog/snapshot';
import { worklogDayRange } from '@/lib/worklog/day-range';
import type { FloorplanUnit } from '@/lib/move-in/floorplan';
import { WorklogSnapshotView } from '@/components/move-in/worklog-snapshot-view';

const pid='1283e198-5043-4027-96d6-edcc7a6686c6';
type Row={unit_id:string;building_no:string;unit_no:string;unit_type:string;balance_paid_at:string|null};
const before:Row[]=JSON.parse(readFileSync(process.env.PAID169_LIVE_FILE ?? 'tests/fixtures/balance-20261108.json','utf8'));
const additional=['102-1803','104-2701','105-1104','105-1503','106-2702','107-303','107-2504','108-501','108-504','108-604','108-1201','108-2504'];

test('after authenticated cancellation: 149 dated plus 20 undated = 169 across ledger, floorplan and worklog; 102-203 is not green',()=>{
  const unchanged=JSON.stringify(before);
  // Live verification uses untouched SELECT results; default regression models post-RPC state.
  const corrected=process.env.PAID169_LIVE_FILE ? before : before.map(r=>({...r,balance_paid_at:r.building_no==='102'&&Number(r.unit_no)===203?null:r.balance_paid_at}));
  expect(corrected).toHaveLength(851);
  expect(new Set(corrected.map(r=>r.unit_id)).size).toBe(851);
  expect(corrected.find(r=>r.building_no==='102'&&Number(r.unit_no)===203)?.balance_paid_at).toBeNull();
  const range=worklogDayRange('2026-11-07','Asia/Seoul');
  const occupancy=corrected.map(r=>({unitId:r.unit_id,balancePaidAt:r.balance_paid_at,fieldConfirmedBalancePaid:fieldConfirmedBalancePaid(pid,r.unit_id,new Date(range.end.getTime()-1)),occupancyIntent:'UNDECIDED' as const,fundingStatus:'NORMAL' as const,moveInStatus:'NOT_CONTACTED' as const,actualMoveInDate:null,plannedMoveInDate:null,nextContactAt:null}));
  const units=corrected.map(r=>({unitId:r.unit_id,buildingNo:r.building_no,unitNo:r.unit_no,unitType:r.unit_type}));
  const tiles:FloorplanUnit[]=units.map((u,i)=>({...u,projectId:pid,floor:null,currentGrade:null,funding:'NORMAL',moveIn:'NOT_CONTACTED',effectiveIntent:'UNDECIDED',rentalType:null,specialReasons:[],balancePaidAt:occupancy[i].balancePaidAt,fieldConfirmedBalancePaid:occupancy[i].fieldConfirmedBalancePaid,actualMoveInDate:null,revision:'qa',fetchedAt:'2026-11-09'}));
  expect(occupancy.filter(r=>r.balancePaidAt)).toHaveLength(149);
  expect(occupancy.filter(r=>r.fieldConfirmedBalancePaid&&!r.balancePaidAt)).toHaveLength(20);
  const official:string[]=JSON.parse(readFileSync('tests/fixtures/balance-official-169.json','utf8'));
  const displayed=corrected.filter((r,i)=>occupancy[i].balancePaidAt||occupancy[i].fieldConfirmedBalancePaid).map(r=>`${r.building_no}-${Number(r.unit_no)}`);
  expect(displayed.sort()).toEqual(official.sort());
  expect(countLedgerChapters(tiles).balance_paid).toBe(169);
  expect(computeMoveInKpis(851,occupancy).balancePaid).toBe(169);
  expect(balanceByType(units,occupancy).total).toMatchObject({balancePaid:169,unpaid:682,totalUnits:851});
  expect(buildMoveInWorklogSnapshot(units,occupancy,[],range).balanceByType?.total).toMatchObject({balancePaid:169,unpaid:682});
  const worklogHtml=renderToStaticMarkup(createElement(WorklogSnapshotView,{snapshot:buildMoveInWorklogSnapshot(units,occupancy,[],range)}));
  const section=worklogHtml.split('aria-label="2. 타입별 잔금납부 현황"')[1].split('</section>')[0];
  expect(section).toContain('>169<');
  expect(section).toContain('>682<');
  const html=renderToStaticMarkup(createElement(FloorplanBoard,{projectId:pid,units:tiles}));
  expect((html.match(/data-balance-paid="true"/g)??[])).toHaveLength(169);
  const exception=tiles.find(r=>r.buildingNo==='102'&&Number(r.unitNo)===203)!;
  const exceptionHtml=renderToStaticMarkup(createElement(FloorplanBoard,{projectId:pid,units:[exception]}));
  expect(exceptionHtml).not.toContain('data-balance-paid="true"');
  expect(exceptionHtml.match(/<a\b[^>]*>/)?.[0]).not.toContain('bg-green-100');
  expect(JSON.stringify(before)).toBe(unchanged);
  console.log(JSON.stringify({input:process.env.PAID169_LIVE_FILE?'PRODUCTION_SELECT':'SIMULATION',dated:149,undated:20,ledger:169,floorplan:169,worklogSection2:169,unpaid:682,unit102203Green:false}));
});

test('twelve November 7 confirmations preserve earlier history and never supply payment dates',()=>{
  for(const key of additional){
    const row=before.find(r=>`${r.building_no}-${Number(r.unit_no)}`===key)!;
    expect(row.balance_paid_at).toBeNull();
    expect(fieldConfirmedBalancePaid(pid,row.unit_id,new Date('2026-11-06T14:59:59Z'))).toBe(false);
    expect(fieldConfirmedBalancePaid(pid,row.unit_id,new Date('2026-11-06T15:00:00Z'))).toBe(true);
    expect(fieldConfirmedBalancePaid('other-project',row.unit_id)).toBe(false);
  }
  const excluded=before.find(r=>r.building_no==='102'&&Number(r.unit_no)===203)!;
  expect(fieldConfirmedBalancePaid(pid,excluded.unit_id)).toBe(false);
});
