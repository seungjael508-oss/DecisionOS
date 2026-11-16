import { expect, test, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
vi.mock('server-only', () => ({}));
import { resolveCurrentUnitSnapshot } from '@/lib/move-in/current-unit-snapshot';
import { toFloorplanUnit } from '@/lib/move-in/floorplan-current';
import { FloorplanBoard } from '@/components/move-in/floorplan-board';
import { countLedgerChapters } from '@/lib/move-in/ledger-chapters';
import { isBalancePaid } from '@/lib/move-in/ledger-presentation';
import { balanceByType } from '@/lib/worklog/balance-by-type';
import { approvedUnitSourceTags } from '@/lib/move-in/ledger-source-tags.server';
import { fieldConfirmedBalancePaid } from '@/lib/move-in/balance-confirmations';
import { buildMoveInWorklogSnapshot, worklogGeneratedData } from '@/lib/worklog/snapshot';
import { worklogDayRange } from '@/lib/worklog/day-range';
import { WorklogSnapshotView } from '@/components/move-in/worklog-snapshot-view';
import { computeMoveInKpis } from '@/lib/move-in/kpis';
import type { AuthorizedAccess, CurrentUnitRecord } from '@/lib/move-in/ledger-types';

const projectId = '1283e198-5043-4027-96d6-edcc7a6686c6';
type Row = {unit_id:string;building_no:string;unit_no:string;unit_type:string|null;balance_paid_at:string|null};
const db: Row[] = JSON.parse(readFileSync('tests/fixtures/balance-20261108.json', 'utf8'));
const access = {ok:true,projectId,role:'PROJECT_ADMIN',memberId:'reviewer'} as AuthorizedAccess;
function project(row: Row, pid = projectId, now = new Date('2026-11-06T00:00:00Z')) {
  const unit = {project_id:pid,unit_id:row.unit_id,building_no:row.building_no,unit_no:row.unit_no,unit_type:row.unit_type,
    contracts:[{project_id:pid,unit_id:row.unit_id,contract_id:'ct',customer_id:'holder',contract_status:'ACTIVE',updated_at:'2026-11-01T00:00:00Z',holder:{id:'holder',project_id:pid,assigned_counselor_id:null}}],
    occupancy:{project_id:pid,unit_id:row.unit_id,contract_id:'ct',legacy_grade:null,funding_status:'NORMAL',move_in_status:'CONTACTED',operational_intent:'UNDECIDED',occupancy_intent:'UNDECIDED',balance_paid_at:row.balance_paid_at,planned_move_in_date:null,actual_move_in_date:null,updated_at:'2026-11-01T00:00:00Z'}} as CurrentUnitRecord;
  const result=resolveCurrentUnitSnapshot({unit,access:{...access,projectId:pid},now,special:null,sourceTags:approvedUnitSourceTags(pid,row.building_no,row.unit_no)});
  if(result.kind!=='ok')throw Error(result.reason);
  return result.snapshot;
}

test('851 authorized units: ledger, green tiles and type totals include 158 without inventing dates', () => {
  const before=JSON.stringify(db);
  const snapshots=db.map(r=>project(r));
  const tiles=db.map((r,i)=>toFloorplanUnit(snapshots[i],{projectId,unitId:r.unit_id,buildingNo:r.building_no,unitNo:r.unit_no,floor:null})!);
  expect(snapshots.filter(isBalancePaid)).toHaveLength(158);
  expect(countLedgerChapters(tiles).balance_paid).toBe(158);
  expect(snapshots.filter(r=>r.balancePaidAt)).toHaveLength(150);
  expect(snapshots.filter(r=>isBalancePaid(r)&&!r.balancePaidAt)).toHaveLength(8);
  const exceptional=db.findIndex(r=>r.building_no==='102'&&Number(r.unit_no)===203);
  expect(isBalancePaid(snapshots[exceptional])).toBe(true);
  const types=balanceByType(db.map(r=>({unitId:r.unit_id,unitType:r.unit_type})),snapshots);
  expect(types.total).toMatchObject({totalUnits:851,balancePaid:158,unpaid:693});
  expect(types.total.paidPercent.toFixed(2)).toBe('18.57');
  expect(types.rows.reduce((n,r)=>n+r.balancePaid,0)).toBe(158);
  const html=renderToStaticMarkup(createElement(FloorplanBoard,{projectId,units:tiles}));
  expect((html.match(/data-balance-paid="true"/g)??[])).toHaveLength(158);
  expect((html.match(/href="\/projects\/[^/]+\/move-in\/units\//g)??[])).toHaveLength(851);
  expect((html.match(/data-source-tag="ASEL"/g)??[])).toHaveLength(36);
  expect(new Set(tiles.map(r=>r.unitId)).size).toBe(851);
  expect(JSON.stringify(db)).toBe(before);
  console.log(JSON.stringify({types,dated:150,confirmedUndated:8,ledger:158,greenTiles:158,detailLinks:851}));
});

test('undated confirmation is scoped to project, known unit identity and effective date',()=>{
  const row=db.find(r=>r.building_no==='101'&&Number(r.unit_no)===1202)!;
  expect(isBalancePaid(project(row))).toBe(true);
  expect(project(row).balancePaidAt).toBeNull();
  expect(isBalancePaid(project(row,'different-project'))).toBe(false);
  expect(isBalancePaid(project({...row,unit_id:'unconfirmed-unit'}))).toBe(false);
  expect(isBalancePaid(project(row,projectId,new Date('2026-11-05T14:59:59Z')))).toBe(false);
});

test('worklog section 2 renders the approved union at 18.57% without creating daily payment events',()=>{
  const units=db.map(r=>({unitId:r.unit_id,buildingNo:r.building_no,unitNo:r.unit_no,unitType:r.unit_type}));
  function occupancy(day:string) {
    const range=worklogDayRange(day,'Asia/Seoul');
    return db.map(r=>({unitId:r.unit_id,occupancyIntent:'UNDECIDED' as const,fundingStatus:'NORMAL' as const,moveInStatus:'CONTACTED' as const,balancePaidAt:r.balance_paid_at,fieldConfirmedBalancePaid:fieldConfirmedBalancePaid(projectId,r.unit_id,new Date(range.end.getTime()-1)),actualMoveInDate:null,plannedMoveInDate:null,nextContactAt:null}));
  }
  const current=occupancy('2026-11-06');
  const range=worklogDayRange('2026-11-06','Asia/Seoul');
  const snapshot=buildMoveInWorklogSnapshot(units,current,[],range);
  const original=buildMoveInWorklogSnapshot(units,current.map(r=>({...r,fieldConfirmedBalancePaid:false})),[],range);
  expect(computeMoveInKpis(851,current).balancePaid).toBe(158);
  expect(snapshot.balanceByType?.total).toMatchObject({totalUnits:851,balancePaid:158,unpaid:693});
  expect(worklogGeneratedData(snapshot).balanceByType?.total.balancePaid).toBe(158);
  expect(snapshot.summary.balancePaidToday).toBe(original.summary.balancePaidToday);
  const html=renderToStaticMarkup(createElement(WorklogSnapshotView,{snapshot}));
  const section=html.split('aria-label="2. 타입별 잔금납부 현황"')[1].split('</section>')[0];
  expect(section).toContain('18.57%');
  expect(section).toContain('>158<');
  expect(section).toContain('>693<');
  expect(current.filter(r=>r.fieldConfirmedBalancePaid&&r.balancePaidAt===null)).toHaveLength(8);
  expect(occupancy('2026-11-05').filter(r=>r.fieldConfirmedBalancePaid)).toHaveLength(0);
  expect(balanceByType([...units,units[0]], [...current,current[0]]).total.balancePaid).toBe(158);
});
