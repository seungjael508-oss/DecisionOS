import { expect, test, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
vi.mock('server-only', () => ({}));
import { approvedUnitSourceTags } from '@/lib/move-in/ledger-source-tags.server';
import { loadHwayangSpecialTagSourceIndex } from '@/lib/move-in/special-tag-source';
import { INVESTOR_UNIT_KEY_SET } from '@/lib/move-in/investment-source';
import { resolveCurrentUnitSnapshot, toLedgerSummaryRow } from '@/lib/move-in/current-unit-snapshot';
import { toFloorplanUnit, floorplanSelection } from '@/lib/move-in/floorplan-current';
import { FloorplanBoard } from '@/components/move-in/floorplan-board';
import { LedgerTable } from '@/components/move-in/ledger-table';
import { LedgerCardList } from '@/components/move-in/ledger-card-list';
import { applyLedgerQuery, parseLedgerQuery } from '@/lib/move-in/ledger-filters';
import type { CurrentUnitRecord } from '@/lib/move-in/ledger-types';

const projectId = '1283e198-5043-4027-96d6-edcc7a6686c6';
function projection(buildingNo: string, unitNo: string, grade = 'D', paid = false) {
  const unitId = `unit-${buildingNo}-${unitNo}`;
  const unit: CurrentUnitRecord = {
    project_id:projectId, unit_id:unitId, building_no:buildingNo, unit_no:unitNo, unit_type:'84',
    contracts:[{project_id:projectId, unit_id:unitId, contract_id:'contract', customer_id:'customer', contract_status:'ACTIVE', updated_at:'2026-11-07', holder:{project_id:projectId,id:'customer',name:'테스트',phone:null,phone_quality:null,assigned_counselor_id:null}}],
    occupancy:{project_id:projectId,unit_id:unitId,contract_id:'contract',legacy_grade:grade,occupancy_intent:'UNDECIDED',operational_intent:'UNDECIDED',funding_status:'NORMAL',move_in_status:'CONTACTED',last_contact_at:null,next_contact_at:null,balance_paid_at:paid?'2026-11-07T00:00:00Z':null,planned_move_in_date:null,actual_move_in_date:null,updated_at:'2026-11-07',problem_flags:['D_GRADE']},
  };
  const before = JSON.stringify(unit);
  const result = resolveCurrentUnitSnapshot({unit,access:{ok:true,projectId,projectName:'test',userId:'user',role:'PROJECT_ADMIN',memberId:'admin'},special:null,sourceTags:approvedUnitSourceTags(projectId,buildingNo,unitNo),now:new Date('2026-11-07')});
  expect(JSON.stringify(unit)).toBe(before);
  if(result.kind !== 'ok') throw new Error(result.reason);
  const row = toLedgerSummaryRow(unit,result.snapshot,null,[]);
  const tile = toFloorplanUnit(result.snapshot,{projectId,unitId,buildingNo,unitNo,floor:null})!;
  return {row,tile};
}
const render = (component: typeof LedgerTable | typeof LedgerCardList, row: ReturnType<typeof projection>['row']) => renderToStaticMarkup(createElement(component,{rows:[row],assignees:{}}));

test('104-202: source Asel badge and D grade remain independent of problem flags and payment', () => {
  for(const grade of ['D','A']) for(const paid of [false,true]) {
    const {row,tile} = projection('104','202',grade,paid);
    for(const component of [LedgerTable,LedgerCardList]) expect(render(component,row)).toContain('data-source-tag="ASEL"');
    const html = renderToStaticMarkup(createElement(FloorplanBoard,{projectId,units:[tile]}));
    expect(html).toContain('data-source-tag="ASEL"');
    expect(html.includes('data-grade="D"')).toBe(grade==='D');
    expect(html.includes('data-balance-paid="true"')).toBe(paid);
    expect(html).not.toContain('data-source-tag="DELINQUENT"');
    expect(floorplanSelection(projectId,tile)?.detailHref).toBe(`/projects/${projectId}/move-in/units/${tile.unitId}`);
    expect(row.problemFlags).toEqual(['D_GRADE']);
    expect(row.currentGrade).toBe(grade);
    expect(row.currentContractId).toBe('contract');
    expect(row.currentCustomerId).toBe('customer');
  }
});

test('36 approved Asel units render, non-Asel units do not, and source filter is retained', () => {
  const source = loadHwayangSpecialTagSourceIndex(projectId);
  const expected = [...source].filter(([,value])=>value.asel).map(([key])=>key).sort();
  expect(expected).toHaveLength(36);
  expect(expected).toEqual([...INVESTOR_UNIT_KEY_SET].sort());
  const rows = [];
  let asel = 0, falsePositive = 0;
  for(let building=101;building<=108;building++) for(let floor=1;floor<=29;floor++) for(let line=1;line<=4;line++) {
    const key = `${building}-${floor*100+line}`;
    const {row,tile} = projection(String(building),String(floor*100+line));
    rows.push(row);
    const isAsel = expected.includes(key);
    for(const html of [render(LedgerTable,row),render(LedgerCardList,row),renderToStaticMarkup(createElement(FloorplanBoard,{projectId,units:[tile]}))]) {
      const marked = html.includes('data-source-tag="ASEL"');
      expect(marked, key).toBe(isAsel);
      if(!isAsel && marked) falsePositive++;
    }
    if(isAsel) asel++;
  }
  expect(asel).toBe(36);
  expect(falsePositive).toBe(0);
  expect(applyLedgerQuery(rows,parseLedgerQuery(new URLSearchParams('specialReason=ASEL')),new Date('2026-11-07')).total).toBe(36);
  expect(approvedUnitSourceTags('other','104','202')).toEqual([]);
  expect(approvedUnitSourceTags(projectId,'104','0202')).toContain('ASEL');
});

test('only confirmed overdue source category is delinquent; source evidence stays intact', () => {
  const source = loadHwayangSpecialTagSourceIndex(projectId);
  expect(source.get('104-202')?.overdueCategory).toBe('중도금 미발생');
  expect(source.get('104-202')?.delinquent).toBe(true);
  expect(approvedUnitSourceTags(projectId,'104','202')).not.toContain('DELINQUENT');
  expect(approvedUnitSourceTags(projectId,'105','202')).not.toContain('DELINQUENT');
  expect(approvedUnitSourceTags(projectId,'104','2804')).not.toContain('DELINQUENT');
  expect(approvedUnitSourceTags(projectId,'101','701')).toContain('DELINQUENT');
});
