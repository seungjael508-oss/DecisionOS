import {expect,test} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {buildMoveInWorklogSnapshot,worklogGeneratedData} from '@/lib/worklog/snapshot';
import {worklogDayRange} from '@/lib/worklog/day-range';
import {WorklogSnapshotView} from '@/components/move-in/worklog-snapshot-view';
test('section 2 and saved output use the same current paid-by-type counts',()=>{
 const s=buildMoveInWorklogSnapshot([{unitId:'1',buildingNo:'101',unitType:'84A'}],[{unitId:'1',occupancyIntent:'UNDECIDED',fundingStatus:'NORMAL',moveInStatus:'CONTACTED',balancePaidAt:'2026-11-06T00:00:00Z',actualMoveInDate:null,plannedMoveInDate:null,nextContactAt:null}],[],worklogDayRange('2026-11-06','Asia/Seoul'));
 const html=renderToStaticMarkup(createElement(WorklogSnapshotView,{snapshot:s}));
 expect(html).toContain('2. 타입별 잔금납부 현황');
 expect(html).toContain('100.00%');
 expect(worklogGeneratedData(s).balanceByType?.total.balancePaid).toBe(1);
});
